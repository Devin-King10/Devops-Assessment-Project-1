from rest_framework import serializers
from django.db.models import Sum
from .models import Product, SKUInventory, InventoryMovement
from apps.warehouse.serializers import BinSerializer


class SKUInventorySerializer(serializers.ModelSerializer):
    bin_details = BinSerializer(source='bin', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    product_category = serializers.CharField(source='product.category', read_only=True)
    available_quantity = serializers.IntegerField(read_only=True)

    class Meta:
        model = SKUInventory
        fields = [
            'id', 'product', 'product_sku', 'product_name', 'product_barcode',
            'product_category', 'bin', 'bin_details', 'quantity',
            'reserved_quantity', 'available_quantity', 'batch_number',
            'expiry_date', 'created_at', 'updated_at'
        ]


class ProductSerializer(serializers.ModelSerializer):
    total_quantity = serializers.SerializerMethodField()
    total_reserved = serializers.SerializerMethodField()
    total_available = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()
    inventory_locations = SKUInventorySerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'description', 'category', 'barcode',
            'unit', 'weight', 'reorder_level', 'is_active', 'total_quantity',
            'total_reserved', 'total_available', 'is_low_stock',
            'inventory_locations', 'created_at', 'updated_at'
        ]

    def get_total_quantity(self, obj):
        res = obj.inventory_locations.aggregate(total=Sum('quantity'))['total']
        return res or 0

    def get_total_reserved(self, obj):
        res = obj.inventory_locations.aggregate(total=Sum('reserved_quantity'))['total']
        return res or 0

    def get_total_available(self, obj):
        tot_q = self.get_total_quantity(obj)
        tot_r = self.get_total_reserved(obj)
        return max(0, tot_q - tot_r)

    def get_is_low_stock(self, obj):
        return self.get_total_available(obj) <= obj.reorder_level


class InventoryMovementSerializer(serializers.ModelSerializer):
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    source_bin_code = serializers.CharField(source='source_bin.bin_code', read_only=True)
    dest_bin_code = serializers.CharField(source='destination_bin.bin_code', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = InventoryMovement
        fields = [
            'id', 'product', 'product_sku', 'product_name', 'source_bin',
            'source_bin_code', 'destination_bin', 'dest_bin_code',
            'movement_type', 'quantity', 'reference_type', 'reference_id',
            'user', 'user_name', 'timestamp', 'notes'
        ]
