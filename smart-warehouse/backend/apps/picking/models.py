import uuid
from django.db import models
from django.conf import settings
from apps.warehouse.models import Bin
from apps.inventory.models import Product


class PickList(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pick_list_number = models.CharField(max_length=100, unique=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_pick_lists')
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.PENDING)
    priority = models.CharField(max_length=50, choices=Priority.choices, default=Priority.MEDIUM)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_pick_lists')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pick_lists'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.pick_list_number} ({self.status})"

    @property
    def total_items_count(self):
        return self.items.count()

    @property
    def picked_items_count(self):
        return self.items.filter(status=PickListItem.Status.PICKED).count()


class PickListItem(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PICKED = 'PICKED', 'Picked'
        SHORTAGE = 'SHORTAGE', 'Stock Shortage'
        SKIPPED = 'SKIPPED', 'Skipped / Damaged'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pick_list = models.ForeignKey(PickList, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name='pick_items')
    bin = models.ForeignKey(Bin, on_delete=models.RESTRICT, related_name='pick_items')
    quantity_requested = models.PositiveIntegerField()
    quantity_picked = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.PENDING)
    sequence_number = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pick_list_items'
        ordering = ['sequence_number']

    def __str__(self):
        return f"Item {self.sequence_number}: {self.product.sku} ({self.quantity_picked}/{self.quantity_requested})"


class PickSession(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        PAUSED = 'PAUSED', 'Paused'
        COMPLETED = 'COMPLETED', 'Completed'
        ABORTED = 'ABORTED', 'Aborted'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pick_list = models.ForeignKey(PickList, on_delete=models.CASCADE, related_name='sessions')
    picker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='picking_sessions')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.ACTIVE)
    total_items = models.PositiveIntegerField(default=0)
    picked_items = models.PositiveIntegerField(default=0)
    total_distance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    route_data = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pick_sessions'
        ordering = ['-start_time']

    def __str__(self):
        return f"Session {self.id} - List {self.pick_list.pick_list_number}"


class PickEvent(models.Model):
    class EventType(models.TextChoices):
        SESSION_START = 'SESSION_START', 'Session Started'
        LOCATION_SCANNED = 'LOCATION_SCANNED', 'Location Scanned'
        ITEM_PICKED = 'ITEM_PICKED', 'Item Picked'
        ISSUE_REPORTED = 'ISSUE_REPORTED', 'Issue Reported'
        SESSION_PAUSE = 'SESSION_PAUSE', 'Session Paused'
        SESSION_RESUME = 'SESSION_RESUME', 'Session Resumed'
        SESSION_COMPLETE = 'SESSION_COMPLETE', 'Session Completed'
        SESSION_ABORT = 'SESSION_ABORT', 'Session Aborted'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(PickSession, on_delete=models.CASCADE, related_name='events')
    pick_list_item = models.ForeignKey(PickListItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='events')
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pick_events'
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.event_type} at {self.timestamp:%H:%M:%S}"
