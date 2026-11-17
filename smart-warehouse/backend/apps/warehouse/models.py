import uuid
from django.db import models


class WarehouseZone(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        INACTIVE = 'INACTIVE', 'Inactive'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zone_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    dimensions = models.JSONField(default=dict, blank=True)  # {"length": 40, "width": 30, "height": 10}
    color_hex = models.CharField(max_length=20, default='#2563EB')
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'warehouse_zones'
        ordering = ['zone_code']

    def __str__(self):
        return f"{self.zone_code} - {self.name}"


class Aisle(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        BLOCKED = 'BLOCKED', 'Blocked'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zone = models.ForeignKey(WarehouseZone, on_delete=models.CASCADE, related_name='aisles')
    aisle_code = models.CharField(max_length=50)
    aisle_name = models.CharField(max_length=150)
    position_x = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    position_y = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    width = models.DecimalField(max_digits=10, decimal_places=2, default=3.00)
    length = models.DecimalField(max_digits=10, decimal_places=2, default=20.00)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'aisles'
        unique_together = ('zone', 'aisle_code')
        ordering = ['aisle_code']

    def __str__(self):
        return f"{self.zone.zone_code} / {self.aisle_code} ({self.aisle_name})"


class Rack(models.Model):
    class RackType(models.TextChoices):
        STANDARD = 'STANDARD', 'Standard Pallet Rack'
        HEAVY_DUTY = 'HEAVY_DUTY', 'Heavy Duty Rack'
        CANTILEVER = 'CANTILEVER', 'Cantilever Rack'
        FLOW = 'FLOW', 'Carton Flow Rack'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'
        DAMAGED = 'DAMAGED', 'Damaged'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    aisle = models.ForeignKey(Aisle, on_delete=models.CASCADE, related_name='racks')
    rack_code = models.CharField(max_length=50)
    rack_type = models.CharField(max_length=50, choices=RackType.choices, default=RackType.STANDARD)
    number_of_levels = models.PositiveIntegerField(default=5)
    bins_per_level = models.PositiveIntegerField(default=4)
    position_x = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    position_y = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    height = models.DecimalField(max_digits=10, decimal_places=2, default=6.00)
    width = models.DecimalField(max_digits=10, decimal_places=2, default=2.40)
    depth = models.DecimalField(max_digits=10, decimal_places=2, default=1.20)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'racks'
        unique_together = ('aisle', 'rack_code')
        ordering = ['rack_code']

    def __str__(self):
        return f"{self.aisle.aisle_code}-{self.rack_code}"


class Bin(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        OCCUPIED = 'OCCUPIED', 'Occupied'
        LOW_STOCK = 'LOW_STOCK', 'Low Stock'
        FULL = 'FULL', 'Full / Blocked'
        BLOCKED = 'BLOCKED', 'Blocked'
        INACTIVE = 'INACTIVE', 'Inactive'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rack = models.ForeignKey(Rack, on_delete=models.CASCADE, related_name='bins')
    bin_code = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=100, unique=True)
    level = models.PositiveIntegerField()
    position = models.PositiveIntegerField()
    capacity = models.PositiveIntegerField(default=100)
    current_quantity = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.AVAILABLE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bins'
        unique_together = ('rack', 'level', 'position')
        ordering = ['bin_code']

    def __str__(self):
        return self.bin_code

    def refresh_status(self):
        """Updates status dynamically based on current quantity vs capacity."""
        if self.status in [self.Status.BLOCKED, self.Status.INACTIVE]:
            return
        if self.current_quantity == 0:
            self.status = self.Status.AVAILABLE
        elif self.current_quantity >= self.capacity:
            self.status = self.Status.FULL
        elif self.current_quantity <= (self.capacity * 0.2):
            self.status = self.Status.LOW_STOCK
        else:
            self.status = self.Status.OCCUPIED
        self.save(update_fields=['status'])
