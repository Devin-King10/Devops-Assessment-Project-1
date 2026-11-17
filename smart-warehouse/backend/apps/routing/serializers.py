from rest_framework import serializers
from .models import WarehouseNode, WarehouseEdge


class WarehouseNodeSerializer(serializers.ModelSerializer):
    zone_code = serializers.CharField(source='zone.zone_code', read_only=True)
    aisle_code = serializers.CharField(source='aisle.aisle_code', read_only=True)
    bin_code = serializers.CharField(source='bin.bin_code', read_only=True)

    class Meta:
        model = WarehouseNode
        fields = [
            'id', 'node_code', 'node_type', 'x', 'y', 'z',
            'zone', 'zone_code', 'aisle', 'aisle_code',
            'rack', 'bin', 'bin_code', 'description'
        ]


class WarehouseEdgeSerializer(serializers.ModelSerializer):
    from_node_code = serializers.CharField(source='from_node.node_code', read_only=True)
    to_node_code = serializers.CharField(source='to_node.node_code', read_only=True)

    class Meta:
        model = WarehouseEdge
        fields = [
            'id', 'from_node', 'from_node_code', 'to_node', 'to_node_code',
            'distance', 'is_bidirectional', 'is_blocked', 'weight_modifier'
        ]
