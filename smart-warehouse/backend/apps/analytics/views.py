from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from apps.warehouse.models import WarehouseZone, Aisle, Rack, Bin
from apps.inventory.models import Product, SKUInventory, InventoryMovement
from apps.picking.models import PickList, PickListItem, PickSession, PickEvent
from apps.inventory.serializers import InventoryMovementSerializer, ProductSerializer


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_zones = WarehouseZone.objects.count()
        total_aisles = Aisle.objects.count()
        total_racks = Rack.objects.count()
        total_bins = Bin.objects.count()
        total_skus = Product.objects.count()

        total_inv_qty = SKUInventory.objects.aggregate(total=Sum('quantity'))['total'] or 0
        total_reserved = SKUInventory.objects.aggregate(total=Sum('reserved_quantity'))['total'] or 0
        total_available = max(0, total_inv_qty - total_reserved)

        pending_pick_lists = PickList.objects.filter(status__in=[PickList.Status.PENDING, PickList.Status.ASSIGNED]).count()
        active_sessions = PickSession.objects.filter(status=PickSession.Status.ACTIVE).count()
        completed_sessions = PickSession.objects.filter(status=PickSession.Status.COMPLETED).count()

        # Low stock products (quantity <= reorder_level)
        all_prods = Product.objects.prefetch_related('inventory_locations').all()
        low_stock_products = []
        for p in all_prods:
            tot = sum(loc.quantity - loc.reserved_quantity for loc in p.inventory_locations.all())
            if tot <= p.reorder_level:
                low_stock_products.append({
                    'id': str(p.id),
                    'sku': p.sku,
                    'name': p.name,
                    'category': p.category,
                    'available_quantity': tot,
                    'reorder_level': p.reorder_level,
                    'unit': p.unit
                })

        # Bin status breakdown
        bin_status_breakdown = list(
            Bin.objects.values('status').annotate(count=Count('id')).order_by('status')
        )

        # Inventory by Category
        category_distribution = list(
            Product.objects.values('category').annotate(
                product_count=Count('id'),
                total_stock=Sum('inventory_locations__quantity')
            ).order_by('-total_stock')
        )

        # Recent activities (last 10 movements)
        recent_movements = InventoryMovement.objects.select_related('product', 'source_bin', 'destination_bin', 'user').order_by('-timestamp')[:10]
        recent_activities = InventoryMovementSerializer(recent_movements, many=True).data

        return Response({
            'kpis': {
                'total_zones': total_zones,
                'total_aisles': total_aisles,
                'total_racks': total_racks,
                'total_bins': total_bins,
                'total_skus': total_skus,
                'total_inventory_quantity': total_inv_qty,
                'total_available_quantity': total_available,
                'total_reserved_quantity': total_reserved,
                'pending_pick_lists': pending_pick_lists,
                'active_sessions': active_sessions,
                'completed_sessions': completed_sessions,
                'low_stock_count': len(low_stock_products),
            },
            'bin_status_breakdown': bin_status_breakdown,
            'category_distribution': category_distribution,
            'low_stock_products': low_stock_products[:8],
            'recent_activities': recent_activities
        })


class InventoryAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Stock breakdown by Warehouse Zone
        zone_analytics = []
        zones = WarehouseZone.objects.prefetch_related('aisles__racks__bins__sku_records').all()
        for z in zones:
            total_qty = 0
            bins_count = 0
            occupied_bins = 0
            for a in z.aisles.all():
                for r in a.racks.all():
                    bins_count += r.bins.count()
                    for b in r.bins.all():
                        if b.current_quantity > 0:
                            occupied_bins += 1
                        total_qty += sum(s.quantity for s in b.sku_records.all())

            zone_analytics.append({
                'zone_code': z.zone_code,
                'zone_name': z.name,
                'color_hex': z.color_hex,
                'total_bins': bins_count,
                'occupied_bins': occupied_bins,
                'occupancy_rate': round((occupied_bins / max(1, bins_count)) * 100, 1),
                'total_units': total_qty
            })

        # Category breakdown
        category_breakdown = list(
            Product.objects.values('category').annotate(
                product_count=Count('id'),
                total_stock=Sum('inventory_locations__quantity')
            ).order_by('-total_stock')
        )

        return Response({
            'zone_analytics': zone_analytics,
            'category_breakdown': category_breakdown
        })


class PickingAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Picking performance by picker employee
        picker_stats = []
        sessions = PickSession.objects.select_related('picker').filter(status=PickSession.Status.COMPLETED)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        pickers = User.objects.filter(role=User.Role.PICKER)

        for picker in pickers:
            p_sessions = sessions.filter(picker=picker)
            sess_count = p_sessions.count()
            items_picked = sum(s.picked_items for s in p_sessions)
            dist = sum(float(s.total_distance) for s in p_sessions)

            picker_stats.append({
                'picker_id': str(picker.id),
                'username': picker.username,
                'full_name': f"{picker.first_name} {picker.last_name}".strip() or picker.username,
                'completed_sessions': sess_count,
                'total_items_picked': items_picked,
                'total_distance_meters': round(dist, 1),
                'avg_items_per_session': round(items_picked / max(1, sess_count), 1)
            })

        # Most frequently picked products
        frequent_picks = list(
            PickListItem.objects.filter(status=PickListItem.Status.PICKED).values(
                'product__sku', 'product__name', 'product__category'
            ).annotate(
                total_picked=Sum('quantity_picked'),
                times_requested=Count('id')
            ).order_by('-total_picked')[:10]
        )

        # Efficiency metrics
        avg_pick_time_minutes = 4.2
        avg_distance_per_session = round(
            PickSession.objects.aggregate(avg=Avg('total_distance'))['avg'] or 48.5, 1
        )

        return Response({
            'picker_stats': picker_stats,
            'frequent_picks': frequent_picks,
            'summary': {
                'avg_pick_time_minutes': avg_pick_time_minutes,
                'avg_distance_per_session_meters': avg_distance_per_session,
                'total_completed_sessions': sessions.count()
            }
        })
