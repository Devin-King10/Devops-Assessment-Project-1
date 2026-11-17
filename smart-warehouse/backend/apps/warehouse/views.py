from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WarehouseZone, Aisle, Rack, Bin
from .serializers import WarehouseZoneSerializer, AisleSerializer, RackSerializer, BinSerializer


class WarehouseZoneViewSet(viewsets.ModelViewSet):
    queryset = WarehouseZone.objects.prefetch_related('aisles__racks__bins').all()
    serializer_class = WarehouseZoneSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['zone_code', 'name', 'status']


class AisleViewSet(viewsets.ModelViewSet):
    queryset = Aisle.objects.select_related('zone').prefetch_related('racks__bins').all()
    serializer_class = AisleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['aisle_code', 'aisle_name', 'status', 'zone__zone_code']

    def get_queryset(self):
        qs = super().get_queryset()
        zone_id = self.request.query_params.get('zone_id')
        if zone_id:
            qs = qs.filter(zone_id=zone_id)
        return qs


class RackViewSet(viewsets.ModelViewSet):
    queryset = Rack.objects.select_related('aisle__zone').prefetch_related('bins').all()
    serializer_class = RackSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['rack_code', 'rack_type', 'status', 'aisle__aisle_code']

    def get_queryset(self):
        qs = super().get_queryset()
        aisle_id = self.request.query_params.get('aisle_id')
        if aisle_id:
            qs = qs.filter(aisle_id=aisle_id)
        return qs


class BinViewSet(viewsets.ModelViewSet):
    queryset = Bin.objects.select_related('rack__aisle__zone').all()
    serializer_class = BinSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['bin_code', 'barcode', 'status', 'rack__rack_code', 'rack__aisle__aisle_code', 'rack__aisle__zone__zone_code']

    def get_queryset(self):
        qs = super().get_queryset()
        rack_id = self.request.query_params.get('rack_id')
        status_filter = self.request.query_params.get('status')
        zone_code = self.request.query_params.get('zone_code')

        if rack_id:
            qs = qs.filter(rack_id=rack_id)
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        if zone_code:
            qs = qs.filter(rack__aisle__zone__zone_code=zone_code)
        return qs

    @action(detail=False, methods=['get'], url_path='by-barcode/(?P<barcode>[^/.]+)')
    def by_barcode(self, request, barcode=None):
        try:
            bin_obj = Bin.objects.select_related('rack__aisle__zone').get(barcode=barcode)
            return Response(BinSerializer(bin_obj).data)
        except Bin.DoesNotExist:
            return Response({'error': f"Bin with barcode '{barcode}' not found."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='tree')
    def warehouse_tree(self, request):
        """Returns full warehouse hierarchy in nested tree format for 3D visualization and navigation."""
        zones = WarehouseZone.objects.prefetch_related('aisles__racks__bins').all()
        serializer = WarehouseZoneSerializer(zones, many=True)
        return Response(serializer.data)
