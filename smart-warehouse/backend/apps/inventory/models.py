import uuid
from django.db import models
from django.conf import settings
from apps.warehouse.models import Bin


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=100, default='General')
    barcode = models.CharField(max_length=100, unique=True)
    unit = models.CharField(max_length=50, default='pcs')
    weight = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reorder_level = models.PositiveIntegerField(default=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['name']

    def __str__(self):
        return f"{self.sku} - {self.name}"


class SKUInventory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name='inventory_locations')
    bin = models.ForeignKey(Bin, on_delete=models.RESTRICT, related_name='sku_records')
    quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    batch_number = models.CharField(max_length=100, blank=True, default='')
    expiry_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sku_inventory'
        unique_together = ('product', 'bin')
        ordering = ['-quantity']

    def __str__(self):
        return f"{self.product.sku} @ {self.bin.bin_code} (Qty: {self.quantity})"

    @property
    def available_quantity(self):
        return max(0, self.quantity - self.reserved_quantity)


class InventoryMovement(models.Model):
    class MovementType(models.TextChoices):
        STOCK_IN = 'STOCK_IN', 'Stock In / Restock'
        PICK = 'PICK', 'Pick / Order Fulfillment'
        ADJUSTMENT = 'ADJUSTMENT', 'Inventory Adjustment'
        TRANSFER = 'TRANSFER', 'Bin Transfer'
        RETURN = 'RETURN', 'Customer / Cycle Return'

    class ReferenceType(models.TextChoices):
        PICK_LIST = 'PICK_LIST', 'Pick List'
        MANUAL = 'MANUAL', 'Manual Adjustment'
        RESTOCK = 'RESTOCK', 'Supplier Restock'
        CYCLE_COUNT = 'CYCLE_COUNT', 'Cycle Count'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name='movements')
    source_bin = models.ForeignKey(Bin, on_delete=models.SET_NULL, null=True, blank=True, related_name='outgoing_movements')
    destination_bin = models.ForeignKey(Bin, on_delete=models.SET_NULL, null=True, blank=True, related_name='incoming_movements')
    movement_type = models.CharField(max_length=50, choices=MovementType.choices)
    quantity = models.PositiveIntegerField()
    reference_type = models.CharField(max_length=50, choices=ReferenceType.choices, default=ReferenceType.MANUAL)
    reference_id = models.CharField(max_length=100, blank=True, default='')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'inventory_movements'
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.movement_type}: {self.quantity} of {self.product.sku} ({self.timestamp:%Y-%m-%d %H:%M})"
