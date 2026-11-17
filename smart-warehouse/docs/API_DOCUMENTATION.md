# Smart Warehouse Bin & Barcode Locator — API Documentation

This document details all REST endpoints provided by the Django REST Framework backend.

Base URL: `http://127.0.0.1:8000/api`

---

## 1. Authentication Endpoints

### `POST /api/auth/login/`
Authenticates a user and returns JWT access and refresh tokens.
- **Request Body:**
  ```json
  {
    "username": "admin",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access": "<JWT_ACCESS_TOKEN>",
    "refresh": "<JWT_REFRESH_TOKEN>",
    "user": {
      "id": "11111111-1111-1111-1111-111111111111",
      "username": "admin",
      "email": "admin@warehouse.io",
      "role": "ADMIN",
      "employee_id": "EMP-001"
    }
  }
  ```

### `POST /api/auth/refresh/`
Refreshes an expired access token using a valid refresh token.

### `GET /api/auth/profile/`
Returns current user's profile and assigned role.

---

## 2. Warehouse Hierarchy Endpoints

### `GET /api/zones/`
Lists all warehouse zones. Supports search and pagination.

### `GET /api/aisles/`
Lists aisles. Query parameters: `?zone_id=<uuid>`

### `GET /api/racks/`
Lists racks with shelf levels and coordinate data. Query parameters: `?aisle_id=<uuid>`

### `GET /api/bins/`
Lists individual storage bins with status. Query parameters: `?status=AVAILABLE|OCCUPIED|LOW_STOCK|FULL|BLOCKED`

### `GET /api/bins/tree/`
Returns the complete nested hierarchy (`Zones → Aisles → Racks → Bins`) optimized for the Three.js 3D warehouse digital twin.

---

## 3. SKU Inventory Endpoints

### `GET /api/products/`
Lists all catalog products with calculated total stock and multi-bin allocations.
- Query parameters: `?search=<term>&category=<category>&low_stock=true`

### `GET /api/inventory/`
Lists SKU-to-bin inventory records.

### `POST /api/inventory/adjust-stock/`
Performs an inventory quantity update with an atomic database transaction and audit log entry.
- **Request Body:**
  ```json
  {
    "inventory_id": "<uuid>",
    "new_quantity": 45,
    "notes": "Physical count adjustment"
  }
  ```

### `GET /api/movements/`
Lists all historical inventory movements and audit records.

---

## 4. Barcode Locator Endpoint

### `GET /api/barcodes/{barcode}/`
Unified locator supporting Bin Barcodes, Bin Codes, Product Barcodes, and SKU identifiers.
- **Sample Bin Response (200 OK):**
  ```json
  {
    "type": "BIN",
    "bin_code": "A-A01-R01-L1P1",
    "barcode": "BIN-A1111",
    "level": 1,
    "position": 1,
    "capacity": 100,
    "current_quantity": 40,
    "status": "OCCUPIED",
    "hierarchy": {
      "zone_code": "ZONE-A",
      "aisle_code": "A01",
      "rack_code": "R01",
      "level": 1,
      "bin_code": "A-A01-R01-L1P1",
      "breadcrumb": "ZONE-A → A01 → R01 → Level 1 → A-A01-R01-L1P1"
    },
    "coordinates": { "x": 2.8, "y": 7.0, "z": 1.0 },
    "contained_skus": [...]
  }
  ```

---

## 5. Pathfinding & Route Optimization Endpoints

### `POST /api/routes/dijkstra/`
Computes the single-source shortest path using Dijkstra's algorithm.
- **Request Body:**
  ```json
  {
    "start_node_id": "HUB-DISPATCH",
    "goal_node_id": "A-A01-R01-L1P1"
  }
  ```

### `POST /api/routes/astar/`
Computes shortest path using A* pathfinding guided by 3D Euclidean or Manhattan heuristics.

### `POST /api/routes/optimize/`
Solves the Multi-Stop Order Picking TSP using Nearest-Neighbor initial tour construction followed by iterative 2-Opt local search improvement.
- **Request Body:**
  ```json
  {
    "start_node_id": "HUB-DISPATCH",
    "end_node_id": "HUB-DISPATCH",
    "pick_locations": ["A-A01-R01-L1P1", "A-A02-R02-L2P2", "B-B01-R01-L1P3"],
    "algorithm": "astar"
  }
  ```

### `POST /api/routes/compare/`
Benchmarks Dijkstra vs A* on distance, nodes evaluated, and execution time.

---

## 6. Pick List & Concurrent Pick Validation Endpoints

### `GET /api/pick-lists/`
Lists pick lists with progress tracking.

### `POST /api/pick-lists/`
Creates a pick list and reserves inventory rows atomically.

### `POST /api/pick-sessions/start/`
Starts an interactive picking session.

### `POST /api/pick-sessions/{id}/scan/`
Validates that the scanned barcode matches the target bin or product.

### `POST /api/pick-sessions/{id}/confirm-pick/`
Confirms picked quantity using PostgreSQL `select_for_update()` row-level locking.
- Verifies physical available stock
- Prevents double picking
- Decrements inventory and releases reservation
- Records inventory movement audit trail
- Returns remaining stock and session progress

### `POST /api/pick-sessions/{id}/report-issue/`
Allows pickers to report empty bins, shortages, damaged items, or blocked aisles.

---

## 7. Analytics Endpoints

### `GET /api/analytics/dashboard/`
Returns all operational KPIs, bin breakdown, and recent movement audit feed.

### `GET /api/analytics/inventory/`
Returns storage zone occupancy rates and category distribution.

### `GET /api/analytics/picking/`
Returns employee picker productivity metrics and high-velocity SKUs.
