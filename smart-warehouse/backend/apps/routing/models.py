import uuid
from django.db import models
from apps.warehouse.models import WarehouseZone, Aisle, Rack, Bin


class WarehouseNode(models.Model):
    class NodeType(models.TextChoices):
        INTERSECTION = 'INTERSECTION', 'Intersection'
        AISLE_ENTRY = 'AISLE_ENTRY', 'Aisle Entry'
        AISLE_EXIT = 'AISLE_EXIT', 'Aisle Exit'
        BIN_ACCESS = 'BIN_ACCESS', 'Bin Access Point'
        DISPATCH = 'DISPATCH', 'Dispatch Station'
        RECEIVING = 'RECEIVING', 'Receiving Dock'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    node_code = models.CharField(max_length=100, unique=True)
    node_type = models.CharField(max_length=50, choices=NodeType.choices, default=NodeType.INTERSECTION)
    x = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    y = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    z = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    zone = models.ForeignKey(WarehouseZone, on_delete=models.CASCADE, null=True, blank=True)
    aisle = models.ForeignKey(Aisle, on_delete=models.SET_NULL, null=True, blank=True)
    rack = models.ForeignKey(Rack, on_delete=models.SET_NULL, null=True, blank=True)
    bin = models.ForeignKey(Bin, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'warehouse_nodes'
        ordering = ['node_code']

    def __str__(self):
        return f"{self.node_code} ({self.node_type}) @ ({self.x}, {self.y})"


class WarehouseEdge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_node = models.ForeignKey(WarehouseNode, on_delete=models.CASCADE, related_name='outgoing_edges')
    to_node = models.ForeignKey(WarehouseNode, on_delete=models.CASCADE, related_name='incoming_edges')
    distance = models.DecimalField(max_digits=10, decimal_places=2)
    is_bidirectional = models.BooleanField(default=True)
    is_blocked = models.BooleanField(default=False)
    weight_modifier = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'warehouse_edges'
        unique_together = ('from_node', 'to_node')

    def __str__(self):
        direction = '<->' if self.is_bidirectional else '->'
        return f"{self.from_node.node_code} {direction} {self.to_node.node_code} ({self.distance}m)"
