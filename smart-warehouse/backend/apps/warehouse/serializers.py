from rest_framework import serializers
from .models import WarehouseZone, Aisle, Rack, Bin


class BinSerializer(serializers.ModelSerializer):
    rack_code = serializers.CharField(source='rack.rack_code', read_only=True)
    aisle_code = serializers.CharField(source='rack.aisle.aisle_code', read_only=True)
    zone_code = serializers.CharField(source='rack.aisle.zone.zone_code', read_only=True)
    zone_name = serializers.CharField(source='rack.aisle.zone.name', read_only=True)
    full_location_path = serializers.SerializerMethodField()

    class Meta:
        model = Bin
        fields = [
            'id', 'rack', 'rack_code', 'aisle_code', 'zone_code', 'zone_name',
            'bin_code', 'barcode', 'level', 'position', 'capacity',
            'current_quantity', 'status', 'full_location_path',
            'created_at', 'updated_at'
        ]

    def get_full_location_path(self, obj):
        try:
            return f"{obj.rack.aisle.zone.zone_code} → {obj.rack.aisle.aisle_code} → {obj.rack.rack_code} → L{obj.level} → {obj.bin_code}"
        except Exception:
            return obj.bin_code


class RackSerializer(serializers.ModelSerializer):
    bins = BinSerializer(many=True, read_only=True)
    aisle_code = serializers.CharField(source='aisle.aisle_code', read_only=True)
    total_bins_count = serializers.IntegerField(source='bins.count', read_only=True)

    class Meta:
        model = Rack
        fields = [
            'id', 'aisle', 'aisle_code', 'rack_code', 'rack_type',
            'number_of_levels', 'bins_per_level', 'position_x', 'position_y',
            'height', 'width', 'depth', 'status', 'total_bins_count', 'bins',
            'created_at', 'updated_at'
        ]


class AisleSerializer(serializers.ModelSerializer):
    racks = RackSerializer(many=True, read_only=True)
    zone_code = serializers.CharField(source='zone.zone_code', read_only=True)
    racks_count = serializers.IntegerField(source='racks.count', read_only=True)

    class Meta:
        model = Aisle
        fields = [
            'id', 'zone', 'zone_code', 'aisle_code', 'aisle_name',
            'position_x', 'position_y', 'width', 'length', 'status',
            'racks_count', 'racks', 'created_at', 'updated_at'
        ]


class WarehouseZoneSerializer(serializers.ModelSerializer):
    aisles = AisleSerializer(many=True, read_only=True)
    aisles_count = serializers.IntegerField(source='aisles.count', read_only=True)

    class Meta:
        model = WarehouseZone
        fields = [
            'id', 'zone_code', 'name', 'description', 'dimensions',
            'color_hex', 'status', 'aisles_count', 'aisles',
            'created_at', 'updated_at'
        ]
