from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import Product, SKUInventory, InventoryMovement
from .serializers import ProductSerializer, SKUInventorySerializer, InventoryMovementSerializer
from apps.warehouse.models import Bin


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.prefetch_related('inventory_locations__bin__rack__aisle__zone').all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['sku', 'name', 'barcode', 'category']

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        zone_code = self.request.query_params.get('zone_code')
        low_stock_only = self.request.query_params.get('low_stock')

        if category:
            qs = qs.filter(category__iexact=category)
        if zone_code:
            qs = qs.filter(inventory_locations__bin__rack__aisle__zone__zone_code=zone_code).distinct()
        return qs

    @action(detail=False, methods=['get'], url_path='categories')
    def categories(self, request):
        cats = Product.objects.values_list('category', flat=True).distinct()
        return Response(sorted(list(cats)))


class SKUInventoryViewSet(viewsets.ModelViewSet):
    queryset = SKUInventory.objects.select_related('product', 'bin__rack__aisle__zone').all()
    serializer_class = SKUInventorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['product__sku', 'product__name', 'product__barcode', 'bin__bin_code', 'bin__barcode']

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product_id')
        bin_id = self.request.query_params.get('bin_id')
        zone_code = self.request.query_params.get('zone_code')

        if product_id:
            qs = qs.filter(product_id=product_id)
        if bin_id:
            qs = qs.filter(bin_id=bin_id)
        if zone_code:
            qs = qs.filter(bin__rack__aisle__zone__zone_code=zone_code)
        return qs

    @action(detail=False, methods=['post'], url_path='adjust-stock')
    def adjust_stock(self, request):
        """
        Adjust stock quantity in a specific bin with transactional safety and audit logging.
        """
        sku_inv_id = request.data.get('inventory_id')
        product_id = request.data.get('product_id')
        bin_id = request.data.get('bin_id')
        new_quantity = request.data.get('new_quantity')
        notes = request.data.get('notes', 'Manual Stock Adjustment')

        if new_quantity is None or int(new_quantity) < 0:
            return Response({'error': 'A valid non-negative new_quantity is required.'}, status=status.HTTP_400_BAD_REQUEST)

        new_quantity = int(new_quantity)

        with transaction.atomic():
            if sku_inv_id:
                inv = SKUInventory.objects.select_for_update().get(id=sku_inv_id)
            else:
                inv, _ = SKUInventory.objects.select_for_update().get_or_create(
                    product_id=product_id,
                    bin_id=bin_id,
                    defaults={'quantity': 0, 'reserved_quantity': 0}
                )

            diff = new_quantity - inv.quantity
            if diff == 0:
                return Response(SKUInventorySerializer(inv).data)

            m_type = InventoryMovement.MovementType.STOCK_IN if diff > 0 else InventoryMovement.MovementType.ADJUSTMENT
            inv.quantity = new_quantity
            inv.save()

            # Refresh bin current quantity
            bin_obj = inv.bin
            total_bin_qty = bin_obj.sku_records.aggregate(total=models.Sum('quantity'))['total'] or 0
            bin_obj.current_quantity = total_bin_qty
            bin_obj.refresh_status()

            # Create audit record
            InventoryMovement.objects.create(
                product=inv.product,
                source_bin=inv.bin if diff < 0 else None,
                destination_bin=inv.bin if diff > 0 else None,
                movement_type=m_type,
                quantity=abs(diff),
                reference_type=InventoryMovement.ReferenceType.MANUAL,
                user=request.user,
                notes=notes
            )

            return Response(SKUInventorySerializer(inv).data)


class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryMovement.objects.select_related('product', 'source_bin', 'destination_bin', 'user').all()
    serializer_class = InventoryMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['product__sku', 'product__name', 'reference_id', 'movement_type']


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def barcode_lookup_view(request, barcode):
    """
    Unified Barcode Locator:
    Accepts either a Product Barcode, SKU code, or Bin Barcode / Bin Code.
    Returns the complete hierarchy breadcrumbs, product details, stock, and 3D position coordinates.
    """
    # 1. Check if barcode is for a Bin
    bin_obj = Bin.objects.select_related('rack__aisle__zone').filter(
        Q(barcode=barcode) | Q(bin_code__iexact=barcode)
    ).first()

    if bin_obj:
        skus = SKUInventory.objects.select_related('product').filter(bin=bin_obj)
        rack = bin_obj.rack
        aisle = rack.aisle
        zone = aisle.zone

        breadcrumb = f"{zone.zone_code} → {aisle.aisle_code} → {rack.rack_code} → Level {bin_obj.level} → {bin_obj.bin_code}"

        return Response({
            'type': 'BIN',
            'bin_id': str(bin_obj.id),
            'bin_code': bin_obj.bin_code,
            'barcode': bin_obj.barcode,
            'level': bin_obj.level,
            'position': bin_obj.position,
            'capacity': bin_obj.capacity,
            'current_quantity': bin_obj.current_quantity,
            'status': bin_obj.status,
            'hierarchy': {
                'zone_code': zone.zone_code,
                'zone_name': zone.name,
                'aisle_code': aisle.aisle_code,
                'aisle_name': aisle.aisle_name,
                'rack_code': rack.rack_code,
                'level': bin_obj.level,
                'bin_code': bin_obj.bin_code,
                'breadcrumb': breadcrumb,
            },
            'coordinates': {
                'x': float(rack.position_x),
                'y': float(rack.position_y),
                'z': float(bin_obj.level * 1.0)
            },
            'contained_skus': [
                {
                    'product_id': str(s.product.id),
                    'sku': s.product.sku,
                    'name': s.product.name,
                    'category': s.product.category,
                    'barcode': s.product.barcode,
                    'quantity': s.quantity,
                    'available_quantity': s.available_quantity,
                    'reserved_quantity': s.reserved_quantity,
                }
                for s in skus
            ]
        })

    # 2. Check if barcode is for a Product
    prod = Product.objects.prefetch_related('inventory_locations__bin__rack__aisle__zone').filter(
        Q(barcode=barcode) | Q(sku__iexact=barcode)
    ).first()

    if prod:
        locations = []
        for inv in prod.inventory_locations.all():
            b = inv.bin
            r = b.rack
            a = r.aisle
            z = a.zone
            bc = f"{z.zone_code} → {a.aisle_code} → {r.rack_code} → Level {b.level} → {b.bin_code}"
            locations.append({
                'bin_id': str(b.id),
                'bin_code': b.bin_code,
                'bin_barcode': b.barcode,
                'quantity': inv.quantity,
                'available_quantity': inv.available_quantity,
                'reserved_quantity': inv.reserved_quantity,
                'breadcrumb': bc,
                'coordinates': {
                    'x': float(r.position_x),
                    'y': float(r.position_y),
                    'z': float(b.level * 1.0)
                },
                'status': b.status
            })

        return Response({
            'type': 'PRODUCT',
            'product_id': str(prod.id),
            'sku': prod.sku,
            'name': prod.name,
            'barcode': prod.barcode,
            'category': prod.category,
            'unit': prod.unit,
            'total_quantity': sum(loc['quantity'] for loc in locations),
            'total_available': sum(loc['available_quantity'] for loc in locations),
            'storage_locations': locations,
            'primary_location': locations[0] if locations else None
        })

    return Response({
        'error': f"No bin or product found matching barcode/identifier '{barcode}'."
    }, status=status.HTTP_404_NOT_FOUND)
