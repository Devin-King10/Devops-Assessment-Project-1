from rest_framework import serializers
from .models import PickList, PickListItem, PickSession, PickEvent
from apps.warehouse.serializers import BinSerializer
from apps.inventory.serializers import ProductSerializer


class PickListItemSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    bin_code = serializers.CharField(source='bin.bin_code', read_only=True)
    bin_barcode = serializers.CharField(source='bin.barcode', read_only=True)
    location_breadcrumb = serializers.SerializerMethodField()
    bin_coordinates = serializers.SerializerMethodField()

    class Meta:
        model = PickListItem
        fields = [
            'id', 'pick_list', 'product', 'product_sku', 'product_name',
            'product_barcode', 'product_category', 'product_unit',
            'bin', 'bin_code', 'bin_barcode', 'quantity_requested',
            'quantity_picked', 'status', 'sequence_number',
            'location_breadcrumb', 'bin_coordinates', 'notes',
            'created_at', 'updated_at'
        ]

    def get_location_breadcrumb(self, obj):
        try:
            b = obj.bin
            r = b.rack
            a = r.aisle
            z = a.zone
            return f"{z.zone_code} → {a.aisle_code} → {r.rack_code} → L{b.level} → {b.bin_code}"
        except Exception:
            return obj.bin.bin_code

    def get_bin_coordinates(self, obj):
        try:
            r = obj.bin.rack
            return {
                'x': float(r.position_x),
                'y': float(r.position_y),
                'z': float(obj.bin.level * 1.0)
            }
        except Exception:
            return {'x': 0.0, 'y': 0.0, 'z': 0.0}


class PickListSerializer(serializers.ModelSerializer):
    items = PickListItemSerializer(many=True, read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    total_items = serializers.IntegerField(source='total_items_count', read_only=True)
    picked_items = serializers.IntegerField(source='picked_items_count', read_only=True)
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = PickList
        fields = [
            'id', 'pick_list_number', 'assigned_to', 'assigned_to_name',
            'status', 'priority', 'created_by', 'created_by_name',
            'started_at', 'completed_at', 'notes', 'total_items',
            'picked_items', 'progress_percentage', 'items',
            'created_at', 'updated_at'
        ]

    def get_progress_percentage(self, obj):
        tot = obj.items.count()
        if tot == 0:
            return 0
        p = obj.items.filter(status=PickListItem.Status.PICKED).count()
        return round((p / tot) * 100, 1)


class PickEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = PickEvent
        fields = ['id', 'session', 'pick_list_item', 'event_type', 'details', 'timestamp']


class PickSessionSerializer(serializers.ModelSerializer):
    events = PickEventSerializer(many=True, read_only=True)
    picker_name = serializers.CharField(source='picker.username', read_only=True)
    pick_list_number = serializers.CharField(source='pick_list.pick_list_number', read_only=True)
    pick_list_details = PickListSerializer(source='pick_list', read_only=True)

    class Meta:
        model = PickSession
        fields = [
            'id', 'pick_list', 'pick_list_number', 'picker', 'picker_name',
            'start_time', 'end_time', 'status', 'total_items', 'picked_items',
            'total_distance', 'route_data', 'events', 'pick_list_details',
            'created_at', 'updated_at'
        ]
