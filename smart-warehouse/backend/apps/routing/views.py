import math
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import WarehouseNode, WarehouseEdge
from .serializers import WarehouseNodeSerializer, WarehouseEdgeSerializer
from .algorithms import Graph
from apps.warehouse.models import Bin, Rack, Aisle, WarehouseZone


def build_live_graph() -> Graph:
    """
    Constructs an in-memory Graph instance populated from database WarehouseNode & WarehouseEdge records.
    If database records are empty, automatically derives graph topology from existing Zones, Aisles, and Racks.
    """
    g = Graph()
    nodes = list(WarehouseNode.objects.select_related('bin').all())
    edges = list(WarehouseEdge.objects.select_related('from_node', 'to_node').all())

    if nodes and edges:
        for n in nodes:
            g.add_node(
                node_id=str(n.id),
                x=float(n.x),
                y=float(n.y),
                z=float(n.z),
                code=n.node_code,
                node_type=n.node_type,
                description=n.description
            )
        for e in edges:
            g.add_edge(
                from_id=str(e.from_node_id),
                to_id=str(e.to_node_id),
                distance=float(e.distance),
                is_bidirectional=e.is_bidirectional,
                is_blocked=e.is_blocked,
                weight_modifier=float(e.weight_modifier)
            )
        return g

    # Fallback auto-builder: Derive navigable grid from aisles and racks
    # Dispatch & Receiving Hubs
    g.add_node('HUB-DISPATCH', x=0.0, y=0.0, z=0.0, code='HUB-DISPATCH', node_type='DISPATCH', description='Main Packing & Dispatch Hub')
    g.add_node('HUB-RECEIVING', x=0.0, y=50.0, z=0.0, code='HUB-RECEIVING', node_type='RECEIVING', description='Inbound Receiving Dock')

    # Main corridor along X=0
    for y_pos in range(0, 80, 10):
        c_id = f"CORRIDOR-Y{y_pos}"
        g.add_node(c_id, x=0.0, y=float(y_pos), z=0.0, code=c_id, node_type='INTERSECTION', description=f'Main Corridor ({y_pos}m)')
        if y_pos > 0:
            prev_c = f"CORRIDOR-Y{y_pos - 10}"
            g.add_edge(prev_c, c_id, distance=10.0)

    g.add_edge('HUB-DISPATCH', 'CORRIDOR-Y0', distance=0.1)
    g.add_edge('HUB-RECEIVING', 'CORRIDOR-Y50', distance=0.1)

    # Aisles and Racks
    aisles = Aisle.objects.select_related('zone').prefetch_related('racks__bins').all()
    for a in aisles:
        ax = float(a.position_x)
        ay = float(a.position_y)
        entry_id = f"ENTRY-{a.aisle_code}"
        exit_id = f"EXIT-{a.aisle_code}"

        g.add_node(entry_id, x=ax, y=ay, z=0.0, code=entry_id, node_type='AISLE_ENTRY', description=f'Entry to Aisle {a.aisle_code}')
        g.add_node(exit_id, x=ax, y=ay + float(a.length), z=0.0, code=exit_id, node_type='AISLE_EXIT', description=f'Exit from Aisle {a.aisle_code}')

        # Connect aisle to closest corridor point
        closest_y = round(ay / 10.0) * 10
        corr_id = f"CORRIDOR-Y{closest_y}"
        if corr_id in g.nodes:
            g.add_edge(corr_id, entry_id, distance=math.sqrt(ax**2 + (ay - closest_y)**2))

        # Aisle internal spine
        g.add_edge(entry_id, exit_id, distance=float(a.length))

        # Add rack access points along the aisle
        for r in a.racks.all():
            rx = float(r.position_x) if float(r.position_x) != 0 else ax
            ry = float(r.position_y) if float(r.position_y) != 0 else (ay + 4.0)
            rack_node_id = f"RACK-{r.rack_code}"
            g.add_node(rack_node_id, x=rx, y=ry, z=0.0, code=rack_node_id, node_type='BIN_ACCESS', description=f'Rack {r.rack_code}')
            g.add_edge(entry_id, rack_node_id, distance=abs(ry - ay) + abs(rx - ax))
            g.add_edge(rack_node_id, exit_id, distance=abs((ay + float(a.length)) - ry) + abs(rx - ax))

            for b in r.bins.all():
                bin_node_id = f"BIN-{b.bin_code}"
                g.add_node(bin_node_id, x=rx, y=ry, z=float(b.level * 1.0), code=b.bin_code, node_type='BIN_ACCESS', description=f'Bin {b.bin_code} (L{b.level})')
                g.add_edge(rack_node_id, bin_node_id, distance=float(b.level * 0.5))

    return g


class DijkstraRouteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        start_id = request.data.get('start_node_id') or 'HUB-DISPATCH'
        goal_id = request.data.get('goal_node_id')

        if not goal_id:
            return Response({'error': 'goal_node_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        g = build_live_graph()
        # Resolve bin code to node if needed
        if f"BIN-{goal_id}" in g.nodes:
            goal_id = f"BIN-{goal_id}"
        if f"BIN-{start_id}" in g.nodes:
            start_id = f"BIN-{start_id}"

        res = g.dijkstra(start_id, goal_id)
        return Response(res)


class AStarRouteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        start_id = request.data.get('start_node_id') or 'HUB-DISPATCH'
        goal_id = request.data.get('goal_node_id')
        heuristic = request.data.get('heuristic', 'euclidean')

        if not goal_id:
            return Response({'error': 'goal_node_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        g = build_live_graph()
        if f"BIN-{goal_id}" in g.nodes:
            goal_id = f"BIN-{goal_id}"
        if f"BIN-{start_id}" in g.nodes:
            start_id = f"BIN-{start_id}"

        res = g.astar(start_id, goal_id, heuristic_type=heuristic)
        return Response(res)


class OptimizeRouteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Calculates optimal multi-stop picking tour using Nearest-Neighbor + 2-Opt local search improvement.
        """
        start_node_id = request.data.get('start_node_id') or 'HUB-DISPATCH'
        end_node_id = request.data.get('end_node_id') or 'HUB-DISPATCH'
        pick_locations = request.data.get('pick_locations', [])  # list of node_ids or bin_codes
        algorithm_choice = request.data.get('algorithm', 'astar')

        if not pick_locations:
            return Response({'error': 'At least one pick_location is required.'}, status=status.HTTP_400_BAD_REQUEST)

        g = build_live_graph()

        # Map bin codes to graph nodes
        resolved_picks = []
        for loc in pick_locations:
            if loc in g.nodes:
                resolved_picks.append(loc)
            elif f"BIN-{loc}" in g.nodes:
                resolved_picks.append(f"BIN-{loc}")
            else:
                # search by bin_code
                b_node = next((nid for nid, d in g.nodes.items() if d['code'] == loc), None)
                if b_node:
                    resolved_picks.append(b_node)

        if not resolved_picks:
            # Fallback: Pick any first available nodes from graph
            resolved_picks = [nid for nid in g.nodes.keys() if nid.startswith('BIN-')][:len(pick_locations)]

        res = g.optimize_picking_route(
            start_node_id=start_node_id,
            pick_node_ids=resolved_picks,
            end_node_id=end_node_id,
            algorithm_choice=algorithm_choice
        )
        return Response(res)


class CompareAlgorithmsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        start_id = request.data.get('start_node_id') or 'HUB-DISPATCH'
        goal_id = request.data.get('goal_node_id')

        if not goal_id:
            return Response({'error': 'goal_node_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        g = build_live_graph()
        if f"BIN-{goal_id}" in g.nodes:
            goal_id = f"BIN-{goal_id}"
        if f"BIN-{start_id}" in g.nodes:
            start_id = f"BIN-{start_id}"

        res = g.compare_algorithms(start_id, goal_id)
        return Response(res)


class GraphDataView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        g = build_live_graph()
        nodes_list = [d for d in g.nodes.values()]
        edges_list = []
        seen_edges = set()

        for u, neighbors in g.adj.items():
            for v, dist, blocked, mod in neighbors:
                edge_key = tuple(sorted([u, v]))
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    edges_list.append({
                        'from_node': u,
                        'to_node': v,
                        'distance': round(dist, 2),
                        'is_blocked': blocked,
                        'modifier': mod
                    })

        return Response({
            'nodes_count': len(nodes_list),
            'edges_count': len(edges_list),
            'nodes': nodes_list,
            'edges': edges_list
        })
