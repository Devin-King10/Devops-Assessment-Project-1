"""
Unit tests for Dijkstra, A*, and Multi-Stop 2-Opt Route Optimization.
Can run standalone with Python standard library unittest.
"""

import unittest
from algorithms import Graph


class TestWarehouseAlgorithms(unittest.TestCase):

    def setUp(self):
        self.g = Graph()
        # Create a mini warehouse grid:
        #
        # (N0: Entry) --- 5m --- (N1: Intersection A) --- 10m --- (N2: Aisle 1 Entry)
        #                           |                               |
        #                          6m                              6m
        #                           |                               |
        # (N5: Dispatch) - 5m -- (N4: Intersection B) --- 10m --- (N3: Bin B101)
        #
        self.g.add_node("N0", 0, 0, 0, code="ENTRY", node_type="RECEIVING")
        self.g.add_node("N1", 5, 0, 0, code="INT_A", node_type="INTERSECTION")
        self.g.add_node("N2", 15, 0, 0, code="A1_IN", node_type="AISLE_ENTRY")
        self.g.add_node("N3", 15, 6, 0, code="BIN_101", node_type="BIN_ACCESS")
        self.g.add_node("N4", 5, 6, 0, code="INT_B", node_type="INTERSECTION")
        self.g.add_node("N5", 0, 6, 0, code="DISPATCH", node_type="DISPATCH")

        self.g.add_edge("N0", "N1", distance=5.0)
        self.g.add_edge("N1", "N2", distance=10.0)
        self.g.add_edge("N2", "N3", distance=6.0)
        self.g.add_edge("N3", "N4", distance=10.0)
        self.g.add_edge("N4", "N5", distance=5.0)
        self.g.add_edge("N1", "N4", distance=6.0)

    def test_dijkstra_direct_path(self):
        res = self.g.dijkstra("N0", "N5")
        self.assertTrue(res["success"])
        # Expected path: N0 -> N1 -> N4 -> N5 with distance = 5 + 6 + 5 = 16.0
        self.assertEqual(res["path"], ["N0", "N1", "N4", "N5"])
        self.assertAlmostEqual(res["distance"], 16.0, places=1)

    def test_astar_direct_path(self):
        res = self.g.astar("N0", "N5")
        self.assertTrue(res["success"])
        self.assertEqual(res["path"], ["N0", "N1", "N4", "N5"])
        self.assertAlmostEqual(res["distance"], 16.0, places=1)

    def test_blocked_aisle_rerouting(self):
        # Block the shortcut between N1 and N4
        self.g.adj["N1"] = [
            (to_id, dist, True if to_id == "N4" else blocked, mod)
            for to_id, dist, blocked, mod in self.g.adj["N1"]
        ]
        self.g.adj["N4"] = [
            (to_id, dist, True if to_id == "N1" else blocked, mod)
            for to_id, dist, blocked, mod in self.g.adj["N4"]
        ]

        # Dijkstra must reroute around via N2 and N3
        res = self.g.dijkstra("N0", "N5")
        self.assertTrue(res["success"])
        self.assertEqual(res["path"], ["N0", "N1", "N2", "N3", "N4", "N5"])
        # Distance = 5 + 10 + 6 + 10 + 5 = 36.0
        self.assertAlmostEqual(res["distance"], 36.0, places=1)

    def test_multi_stop_optimization(self):
        # Pick from N3 and N2 starting at N0 and ending at N5
        res = self.g.optimize_picking_route("N0", ["N3", "N2"], end_node_id="N5")
        self.assertTrue(res["success"])
        self.assertEqual(res["number_of_stops"], 2)
        # Starts at N0 and ends at N5
        self.assertEqual(res["ordered_stops"][0], "N0")
        self.assertEqual(res["ordered_stops"][-1], "N5")
        # Visiting N2 then N3 is direct: N0 -> N1 -> N2 -> N3 -> N4 -> N5
        self.assertIn("N2", res["ordered_stops"])
        self.assertIn("N3", res["ordered_stops"])
        self.assertTrue(res["total_distance"] > 0)
        self.assertTrue(len(res["full_path"]) >= 5)

    def test_algorithm_benchmark_comparison(self):
        cmp = self.g.compare_algorithms("N0", "N3")
        self.assertTrue(cmp["comparison"]["distance_equal"])
        self.assertEqual(cmp["dijkstra"]["path"], cmp["astar"]["path"])


if __name__ == "__main__":
    unittest.main()
