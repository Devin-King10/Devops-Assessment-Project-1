"""
Intelligent Pathfinding and Route Optimization for Smart Warehouse.

Includes:
1. Dijkstra's Algorithm (Single Source Shortest Path)
2. A* Pathfinding Algorithm with Euclidean/Manhattan 2D/3D Heuristic
3. Multi-Stop Picking Route Optimization:
   - All-Pairs Shortest Path Distance Matrix computation
   - Nearest-Neighbor Initial Tour Construction
   - 2-Opt Heuristic Local Search Improvement
4. Navigation Performance Benchmarking (Dijkstra vs A*)
"""

import math
import heapq
import time
from typing import Dict, List, Tuple, Optional, Any


class Graph:
    """Represents a warehouse walkable graph with nodes, coordinates, and weighted edges."""

    def __init__(self):
        # node_id -> dict with 'x', 'y', 'z', 'code', 'type', 'name'
        self.nodes: Dict[str, Dict[str, Any]] = {}
        # node_id -> list of (neighbor_node_id, distance, is_blocked, weight_modifier)
        self.adj: Dict[str, List[Tuple[str, float, bool, float]]] = {}

    def add_node(self, node_id: str, x: float, y: float, z: float = 0.0,
                 code: str = "", node_type: str = "INTERSECTION", description: str = ""):
        self.nodes[node_id] = {
            "id": node_id,
            "x": float(x),
            "y": float(y),
            "z": float(z),
            "code": code or node_id,
            "type": node_type,
            "description": description
        }
        if node_id not in self.adj:
            self.adj[node_id] = []

    def add_edge(self, from_id: str, to_id: str, distance: Optional[float] = None,
                 is_bidirectional: bool = True, is_blocked: bool = False, weight_modifier: float = 1.0):
        if from_id not in self.nodes or to_id not in self.nodes:
            return

        if distance is None:
            # calculate euclidean distance between coordinates
            n1 = self.nodes[from_id]
            n2 = self.nodes[to_id]
            distance = math.sqrt(
                (n1["x"] - n2["x"]) ** 2 +
                (n1["y"] - n2["y"]) ** 2 +
                (n1["z"] - n2["z"]) ** 2
            )

        self.adj[from_id].append((to_id, distance, is_blocked, weight_modifier))
        if is_bidirectional:
            self.adj[to_id].append((from_id, distance, is_blocked, weight_modifier))

    def euclidean_heuristic(self, node_a: str, node_b: str) -> float:
        """Euclidean 2D/3D distance heuristic for A*."""
        na = self.nodes[node_a]
        nb = self.nodes[node_b]
        return math.sqrt(
            (na["x"] - nb["x"]) ** 2 +
            (na["y"] - nb["y"]) ** 2 +
            (na["z"] - nb["z"]) ** 2
        )

    def manhattan_heuristic(self, node_a: str, node_b: str) -> float:
        """Manhattan distance heuristic suitable for grid-like warehouse aisles."""
        na = self.nodes[node_a]
        nb = self.nodes[node_b]
        return (
            abs(na["x"] - nb["x"]) +
            abs(na["y"] - nb["y"]) +
            abs(na["z"] - nb["z"])
        )

    # -------------------------------------------------------------------------
    # DIJKSTRA ALGORITHM
    # -------------------------------------------------------------------------
    def dijkstra(self, start_id: str, goal_id: str) -> Dict[str, Any]:
        """
        Calculates shortest path from start_id to goal_id using Dijkstra's algorithm.
        Returns path nodes, total distance, visited nodes count, and runtime ms.
        """
        start_time = time.perf_counter()

        if start_id not in self.nodes or goal_id not in self.nodes:
            return {
                "success": False,
                "error": f"Invalid start ({start_id}) or goal ({goal_id}) node.",
                "path": [],
                "distance": 0.0,
                "algorithm": "Dijkstra"
            }

        distances: Dict[str, float] = {node: float("inf") for node in self.nodes}
        previous: Dict[str, Optional[str]] = {node: None for node in self.nodes}
        visited_nodes: List[str] = []

        distances[start_id] = 0.0
        # Priority queue stores tuples: (distance, node_id)
        pq: List[Tuple[float, str]] = [(0.0, start_id)]

        while pq:
            current_dist, current_node = heapq.heappop(pq)

            if current_dist > distances[current_node]:
                continue

            visited_nodes.append(current_node)

            if current_node == goal_id:
                break

            for neighbor, weight, is_blocked, modifier in self.adj.get(current_node, []):
                if is_blocked:
                    continue  # skip blocked aisles

                cost = weight * max(0.1, modifier)
                new_dist = current_dist + cost

                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (new_dist, neighbor))

        # Reconstruct path
        path = []
        curr: Optional[str] = goal_id
        if distances[goal_id] != float("inf"):
            while curr is not None:
                path.append(curr)
                curr = previous[curr]
            path.reverse()

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        return {
            "success": len(path) > 0 and path[0] == start_id,
            "path": path,
            "path_coords": [
                {
                    "id": nid,
                    "x": self.nodes[nid]["x"],
                    "y": self.nodes[nid]["y"],
                    "z": self.nodes[nid]["z"],
                    "code": self.nodes[nid]["code"],
                    "type": self.nodes[nid]["type"],
                }
                for nid in path
            ],
            "distance": round(distances[goal_id], 2) if distances[goal_id] != float("inf") else 0.0,
            "visited_count": len(visited_nodes),
            "execution_time_ms": round(elapsed_ms, 3),
            "algorithm": "Dijkstra"
        }

    # -------------------------------------------------------------------------
    # A* (A-STAR) ALGORITHM
    # -------------------------------------------------------------------------
    def astar(self, start_id: str, goal_id: str, heuristic_type: str = "euclidean") -> Dict[str, Any]:
        """
        Calculates shortest path using A* pathfinding with directed heuristic guidance.
        """
        start_time = time.perf_counter()

        if start_id not in self.nodes or goal_id not in self.nodes:
            return {
                "success": False,
                "error": f"Invalid start ({start_id}) or goal ({goal_id}) node.",
                "path": [],
                "distance": 0.0,
                "algorithm": "A*"
            }

        heuristic_fn = self.manhattan_heuristic if heuristic_type == "manhattan" else self.euclidean_heuristic

        g_score: Dict[str, float] = {node: float("inf") for node in self.nodes}
        f_score: Dict[str, float] = {node: float("inf") for node in self.nodes}
        previous: Dict[str, Optional[str]] = {node: None for node in self.nodes}
        visited_nodes: List[str] = []

        g_score[start_id] = 0.0
        f_score[start_id] = heuristic_fn(start_id, goal_id)

        # Priority queue stores tuples: (f_score, g_score, node_id)
        open_set: List[Tuple[float, float, str]] = [(f_score[start_id], 0.0, start_id)]
        in_open_set = {start_id}

        while open_set:
            current_f, current_g, current_node = heapq.heappop(open_set)
            in_open_set.discard(current_node)
            visited_nodes.append(current_node)

            if current_node == goal_id:
                break

            for neighbor, weight, is_blocked, modifier in self.adj.get(current_node, []):
                if is_blocked:
                    continue

                cost = weight * max(0.1, modifier)
                tentative_g = current_g + cost

                if tentative_g < g_score[neighbor]:
                    previous[neighbor] = current_node
                    g_score[neighbor] = tentative_g
                    h = heuristic_fn(neighbor, goal_id)
                    f = tentative_g + h
                    f_score[neighbor] = f

                    if neighbor not in in_open_set:
                        heapq.heappush(open_set, (f, tentative_g, neighbor))
                        in_open_set.add(neighbor)

        # Reconstruct path
        path = []
        curr: Optional[str] = goal_id
        if g_score[goal_id] != float("inf"):
            while curr is not None:
                path.append(curr)
                curr = previous[curr]
            path.reverse()

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        return {
            "success": len(path) > 0 and path[0] == start_id,
            "path": path,
            "path_coords": [
                {
                    "id": nid,
                    "x": self.nodes[nid]["x"],
                    "y": self.nodes[nid]["y"],
                    "z": self.nodes[nid]["z"],
                    "code": self.nodes[nid]["code"],
                    "type": self.nodes[nid]["type"],
                }
                for nid in path
            ],
            "distance": round(g_score[goal_id], 2) if g_score[goal_id] != float("inf") else 0.0,
            "visited_count": len(visited_nodes),
            "execution_time_ms": round(elapsed_ms, 3),
            "algorithm": "A*"
        }

    # -------------------------------------------------------------------------
    # MULTI-STOP ROUTE OPTIMIZATION (TSP with Nearest Neighbor + 2-Opt)
    # -------------------------------------------------------------------------
    def optimize_picking_route(
        self,
        start_node_id: str,
        pick_node_ids: List[str],
        end_node_id: Optional[str] = None,
        algorithm_choice: str = "astar"
    ) -> Dict[str, Any]:
        """
        Solves Traveling Salesperson Problem (TSP) for order picking:
        1. Deduplicates pick node locations.
        2. Computes all-pairs shortest paths between start, all pick locations, and end.
        3. Constructs initial route via Nearest Neighbor heuristic.
        4. Applies 2-Opt local search improvement iteratively until convergence.
        5. Splices the underlying path segments together into one continuous navigable path.
        """
        start_time = time.perf_counter()

        # Deduplicate pick locations and remove start/end if present in list
        unique_picks = []
        seen = {start_node_id}
        if end_node_id:
            seen.add(end_node_id)
        for nid in pick_node_ids:
            if nid in self.nodes and nid not in seen:
                seen.add(nid)
                unique_picks.append(nid)

        if not unique_picks:
            # Single stop or empty
            nav = self.astar(start_node_id, end_node_id or start_node_id) if algorithm_choice == "astar" else self.dijkstra(start_node_id, end_node_id or start_node_id)
            return {
                "success": nav["success"],
                "ordered_stops": [start_node_id] + ([end_node_id] if end_node_id and end_node_id != start_node_id else []),
                "stops_detail": [],
                "full_path": nav["path"],
                "full_path_coords": nav.get("path_coords", []),
                "total_distance": nav["distance"],
                "algorithm_used": nav["algorithm"],
                "number_of_stops": 0,
                "estimated_time_minutes": round(nav["distance"] / 75.0, 1), # avg warehouse walk 75m/min (1.25m/s)
                "execution_time_ms": nav.get("execution_time_ms", 0)
            }

        all_stops = [start_node_id] + unique_picks
        has_distinct_end = end_node_id is not None and end_node_id != start_node_id
        if has_distinct_end:
            all_stops.append(end_node_id)
        else:
            end_node_id = start_node_id

        # Compute point-to-point shortest distances and paths
        pairwise_dist: Dict[Tuple[str, str], float] = {}
        pairwise_path: Dict[Tuple[str, str], List[str]] = {}

        path_fn = self.astar if algorithm_choice == "astar" else self.dijkstra

        for i, u in enumerate(all_stops):
            for j, v in enumerate(all_stops):
                if u == v:
                    pairwise_dist[(u, v)] = 0.0
                    pairwise_path[(u, v)] = [u]
                elif (u, v) not in pairwise_dist:
                    res = path_fn(u, v)
                    dist = res["distance"] if res["success"] else float("inf")
                    pairwise_dist[(u, v)] = dist
                    pairwise_path[(u, v)] = res["path"] if res["success"] else []
                    # Symmetrical if undirected
                    if (v, u) not in pairwise_dist:
                        pairwise_dist[(v, u)] = dist
                        pairwise_path[(v, u)] = list(reversed(res["path"])) if res["success"] else []

        # 1. NEAREST NEIGHBOR TOUR HEURISTIC
        current = start_node_id
        unvisited = set(unique_picks)
        tour = [start_node_id]

        while unvisited:
            next_node = min(unvisited, key=lambda node: pairwise_dist.get((current, node), float("inf")))
            tour.append(next_node)
            unvisited.remove(next_node)
            current = next_node

        tour.append(end_node_id)

        # 2. 2-OPT LOCAL SEARCH IMPROVEMENT
        # Only mutate the intermediate pick stops (index 1 to len(tour)-2)
        def tour_distance(t: List[str]) -> float:
            d = 0.0
            for k in range(len(t) - 1):
                d += pairwise_dist.get((t[k], t[k + 1]), float("inf"))
            return d

        improved = True
        iterations = 0
        max_iterations = 100

        while improved and iterations < max_iterations:
            improved = False
            iterations += 1
            best_dist = tour_distance(tour)

            for i in range(1, len(tour) - 2):
                for j in range(i + 1, len(tour) - 1):
                    # 2-opt swap: reverse the slice from i to j
                    new_tour = tour[:i] + tour[i:j + 1][::-1] + tour[j + 1:]
                    new_dist = tour_distance(new_tour)
                    if new_dist < best_dist - 1e-4:
                        tour = new_tour
                        best_dist = new_dist
                        improved = True
                        break
                if improved:
                    break

        # 3. SPLICE FULL NAVIGABLE PATH
        full_path: List[str] = []
        for k in range(len(tour) - 1):
            segment = pairwise_path.get((tour[k], tour[k + 1]), [])
            if not segment:
                segment = [tour[k], tour[k + 1]]
            if not full_path:
                full_path.extend(segment)
            else:
                full_path.extend(segment[1:])  # avoid duplicate joint node

        total_distance = round(tour_distance(tour), 2)
        total_time_ms = (time.perf_counter() - start_time) * 1000

        # Build stops detail
        stops_detail = []
        accumulated_dist = 0.0
        for idx, stop_id in enumerate(tour):
            n_info = self.nodes.get(stop_id, {})
            if idx > 0:
                leg_dist = pairwise_dist.get((tour[idx - 1], stop_id), 0.0)
                accumulated_dist += leg_dist
            stops_detail.append({
                "sequence": idx + 1,
                "node_id": stop_id,
                "code": n_info.get("code", stop_id),
                "type": n_info.get("type", "LOCATION"),
                "description": n_info.get("description", ""),
                "x": n_info.get("x", 0.0),
                "y": n_info.get("y", 0.0),
                "z": n_info.get("z", 0.0),
                "cumulative_distance": round(accumulated_dist, 2),
                "is_start": idx == 0,
                "is_end": idx == len(tour) - 1,
            })

        full_path_coords = [
            {
                "id": nid,
                "x": self.nodes[nid]["x"],
                "y": self.nodes[nid]["y"],
                "z": self.nodes[nid]["z"],
                "code": self.nodes[nid]["code"],
                "type": self.nodes[nid]["type"],
            }
            for nid in full_path if nid in self.nodes
        ]

        # Estimated picker walking speed = 1.25 m/s (~75 meters/min)
        # Average pick handling time per stop = 0.75 min (45s per pick)
        est_walk_min = total_distance / 75.0
        est_pick_min = len(unique_picks) * 0.75
        est_total_min = round(est_walk_min + est_pick_min, 1)

        return {
            "success": True,
            "algorithm_used": f"{algorithm_choice.upper()} + 2-Opt TSP",
            "number_of_stops": len(unique_picks),
            "ordered_stops": tour,
            "stops_detail": stops_detail,
            "full_path": full_path,
            "full_path_coords": full_path_coords,
            "total_distance": total_distance,
            "estimated_time_minutes": est_total_min,
            "walking_time_minutes": round(est_walk_min, 1),
            "picking_time_minutes": round(est_pick_min, 1),
            "iterations_2opt": iterations,
            "execution_time_ms": round(total_time_ms, 2)
        }

    # -------------------------------------------------------------------------
    # BENCHMARK COMPARISON
    # -------------------------------------------------------------------------
    def compare_algorithms(self, start_id: str, goal_id: str) -> Dict[str, Any]:
        """Runs both Dijkstra and A* and compares distance, nodes evaluated, and execution time."""
        res_dijkstra = self.dijkstra(start_id, goal_id)
        res_astar = self.astar(start_id, goal_id)

        return {
            "dijkstra": res_dijkstra,
            "astar": res_astar,
            "comparison": {
                "distance_equal": abs(res_dijkstra["distance"] - res_astar["distance"]) < 0.01,
                "visited_reduction_percent": round(
                    ((res_dijkstra["visited_count"] - res_astar["visited_count"]) / max(1, res_dijkstra["visited_count"])) * 100, 1
                ),
                "faster_algorithm": "A*" if res_astar["execution_time_ms"] < res_dijkstra["execution_time_ms"] else "Dijkstra"
            }
        }
