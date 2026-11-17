# 🏭 Smart Warehouse Bin & Barcode Locator

A production-style full-stack warehouse management system with 3D visualization, barcode scanning, intelligent pick-route optimization, and concurrent inventory control.

---

## 📐 Architecture Overview

```
smart-warehouse/
├── backend/          # Django REST Framework API (Python 3.14)
├── frontend/         # React + Vite + Three.js SPA
├── database/         # PostgreSQL schema & seed SQL files
├── docs/             # API documentation
├── start_backend.bat # One-click backend launcher
└── start_frontend.bat# One-click frontend launcher
```

```
┌──────────────────────────────────────────────────────────┐
│                     React Frontend                        │
│  Three.js 3D │ Recharts │ Tailwind CSS │ React Router    │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTP / REST (Axios + JWT)
┌───────────────────────▼──────────────────────────────────┐
│               Django REST Framework API                   │
│  accounts │ warehouse │ inventory │ picking │ routing      │
│  analytics │ JWT Auth │ CORS │ select_for_update()        │
└───────────────────────┬──────────────────────────────────┘
                        │ Django ORM
┌───────────────────────▼──────────────────────────────────┐
│          SQLite (dev) / Supabase PostgreSQL (prod)        │
│  Users │ Zones │ Aisles │ Racks │ Bins │ SKUInventory     │
│  PickLists │ PickSessions │ InventoryMovements │ Routes   │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.14+ | `py --version` |
| Node.js | 26+ | Located at `C:\Program Files\nodejs\New Folder\` |
| npm | 11+ | Bundled with Node |

---

### 1. Backend Setup

```powershell
cd "d:\Devops Assessment project 1\smart-warehouse\backend"

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Apply migrations (already done — skip if db.sqlite3 exists)
python manage.py migrate

# Seed the database (50 products, 1200 bins, 3 zones, 15 aisles, 60 racks)
python manage.py seed_warehouse

# Start the server
python manage.py runserver 127.0.0.1:8000
```

Or simply double-click **`start_backend.bat`**.

### 2. Frontend Setup

```powershell
$env:PATH = "C:\Program Files\nodejs\New Folder;$env:PATH"
cd "d:\Devops Assessment project 1\smart-warehouse\frontend"

# Install dependencies (already done)
npm install

# Start dev server
npm run dev
# → http://localhost:3000
```

Or simply double-click **`start_frontend.bat`**.

---

## 🔐 Demo Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| **Administrator** | `admin` | `Password123!` | Full system access |
| **Warehouse Manager** | `manager` | `Password123!` | Inventory, pick lists, reports |
| **Picker 1** | `picker1` | `Password123!` | Assigned pick lists, scanning |
| **Picker 2** | `picker2` | `Password123!` | Assigned pick lists, scanning |

> The Login page includes one-click **Demo Login** buttons for each role.

---

## 📦 Application Modules

### Module 1 — Dashboard
- KPI cards: zones, aisles, racks, bins, SKUs, pending/active pick lists
- Inventory bar charts and zone pie charts (Recharts)
- Low-stock alerts and recent activity feed

### Module 2 — Warehouse Layout Management
- Full CRUD for Zones → Aisles → Racks → Bins
- Tabbed interface with search and filters

### Module 3 — 3D Warehouse Visualization
- Interactive Three.js scene (React Three Fiber + Drei)
- Color-coded bins: 🟢 Available · 🔵 Occupied · 🟡 Low Stock · 🔴 Full · ⚫ Inactive
- Orbit / zoom / pan controls
- Click any bin to view SKU details and location breadcrumb
- Highlighted route path overlay for pick routes

### Module 4 — SKU Inventory Management
- Full product lifecycle CRUD
- Search by SKU, name, or barcode
- Filter by category and zone
- Inventory adjustment with audit trail
- Low-stock threshold warnings

### Module 5 — Barcode Locator & Scanner
- Camera-based QR/barcode scanning (html5-qrcode)
- USB keyboard-wedge scanner support
- Scan → instantly locate bin → highlight in 3D view
- Printable barcode label generation
- Full location breadcrumb: `Zone A → Aisle A01 → Rack R03 → Level 2 → Bin B205`

### Module 6 — Pick List Management
- Create pick lists with multiple SKUs and quantities
- Assign pickers and set priority (Critical / High / Normal / Low)
- Status tracking: Pending → Assigned → In Progress → Completed
- Progress indicator: `5 of 12 items picked`

### Module 7 — Intelligent Route Optimizer
- **Dijkstra's algorithm** — guaranteed shortest path
- **A\* algorithm** — heuristic-guided, faster on large graphs
- **Nearest-Neighbor + 2-Opt TSP** — multi-stop route optimization
- Side-by-side algorithm comparison (nodes visited, path cost, time)
- Route rendered on warehouse map with ordered stop sequence
- Estimates total walking distance and completion time

### Module 8 — Picking Sessions
- Guided step-by-step picking workflow
- Bin barcode scan validation at each stop
- Quantity confirmation with partial pick support
- Issue reporting: empty bin, damaged stock, blocked location
- Real-time session progress tracking

### Module 9 — Concurrent Pick Validation
- Django `select_for_update()` row-level locking
- Atomic transactions prevent double-picks
- Reserved vs. available quantity validation
- Full inventory movement audit log

### Module 10 — Analytics & Reports
- Zone occupancy and inventory distribution charts
- Picker productivity and efficiency stats
- Frequently picked products
- Date-range filtering
- CSV and JSON export

---

## 🧪 Running Tests

```powershell
cd "d:\Devops Assessment project 1\smart-warehouse\backend"
.\venv\Scripts\Activate.ps1

# Unit tests (algorithms + API integration) — 8 tests
python manage.py test apps.picking.test_picking apps.warehouse.test_warehouse

# Algorithm unit tests only — 5 tests
python -m pytest apps/routing/test_algorithms.py -v

# Full E2E integration test — 8 scenarios
python test_e2e_integration.py
```

**All test results (verified):**

| Suite | Tests | Result |
|-------|-------|--------|
| Algorithm unit tests | 5 | ✅ PASSED |
| Django API tests | 8 | ✅ PASSED |
| E2E integration tests | 8 | ✅ PASSED |
| Vite production build | — | ✅ 2698 modules |

---

## 🗄️ Database

### Default (Development)
SQLite3 — file at `backend/db.sqlite3` — no setup needed.

### Production (Supabase PostgreSQL)
Edit `backend/.env`:
```env
SUPABASE_DB_HOST=your-project.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-password
```

Then run:
```powershell
python manage.py migrate
python manage.py seed_warehouse
```

The raw PostgreSQL schema is also available at `database/schema.sql`.

---

## 📡 API Overview

Base URL: `http://127.0.0.1:8000/api/`

| Group | Endpoint Prefix | Description |
|-------|----------------|-------------|
| Auth | `/api/auth/` | Login, register, token refresh |
| Users | `/api/users/` | User management (admin only) |
| Warehouse | `/api/warehouse/` | Zones, aisles, racks, bins |
| Inventory | `/api/inventory/` | Products, SKUs, movements |
| Picking | `/api/picking/` | Pick lists, sessions, events |
| Routing | `/api/routing/` | Dijkstra, A*, optimize, compare |
| Analytics | `/api/analytics/` | Dashboard, reports |

> Full API documentation: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

Authentication: JWT Bearer token — include `Authorization: Bearer <token>` in all requests.

---

## 🏗️ Technology Stack

### Frontend
- React 18, Vite, React Router 7
- Three.js + React Three Fiber + Drei (3D visualization)
- Recharts (charts and analytics)
- Tailwind CSS (styling)
- Axios (HTTP client with JWT interceptor)
- html5-qrcode (barcode scanning)
- Lucide React (icons)

### Backend
- Python 3.14, Django 6.1, Django REST Framework 3.18
- SimpleJWT 5.5 (JWT authentication)
- django-cors-headers 4.9
- qrcode 8.2 (barcode generation)
- python-dotenv 1.2

### Database
- SQLite3 (development)
- Supabase PostgreSQL (production)

### Algorithms
- Dijkstra's shortest path
- A* pathfinding (Euclidean heuristic)
- Nearest-Neighbor TSP + 2-Opt improvement

---

## 📊 Seeded Data

| Entity | Count |
|--------|-------|
| Users | 4 (admin, manager, picker1, picker2) |
| Warehouse Zones | 3 |
| Aisles | 15 |
| Racks | 60 |
| Bins | 1,200 |
| Products / SKUs | 50 |
| Pick Lists | 3 (pending/assigned) |

---

## 📁 Project Structure

```
smart-warehouse/
├── backend/
│   ├── apps/
│   │   ├── accounts/      # User model, JWT auth, role-based access
│   │   ├── warehouse/     # Zone, Aisle, Rack, Bin models + API
│   │   ├── inventory/     # Product, SKUInventory, InventoryMovement
│   │   ├── picking/       # PickList, PickSession, concurrent validation
│   │   ├── routing/       # Graph nodes/edges, Dijkstra, A*, TSP
│   │   └── analytics/     # Dashboard KPIs and reports
│   ├── config/            # Django settings, URLs, WSGI
│   ├── venv/              # Python virtual environment
│   ├── manage.py
│   ├── test_e2e_integration.py
│   └── db.sqlite3
├── frontend/
│   ├── src/
│   │   ├── context/       # AuthContext, ToastContext
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   ├── warehouse/ # Warehouse3D (Three.js), WarehouseLayout
│   │   │   ├── barcode/   # BarcodeLocator
│   │   │   ├── routing/   # RouteOptimizer
│   │   │   ├── picking/   # PickLists, PickingSessionView
│   │   │   ├── inventory/ # InventoryManagement
│   │   │   ├── analytics/ # AnalyticsReports
│   │   │   ├── users/     # UserManagement
│   │   │   └── settings/  # SettingsPage
│   │   ├── layouts/       # Sidebar, Header, MainLayout
│   │   ├── services/      # api.js (Axios + JWT interceptor)
│   │   └── App.jsx        # Routes + protected route guards
│   └── dist/              # Production build output
├── database/
│   ├── schema.sql         # Full PostgreSQL schema (14 tables)
│   └── seed.sql           # 50 products seed SQL
├── docs/
│   └── API_DOCUMENTATION.md
├── start_backend.bat
├── start_frontend.bat
└── .gitignore
```

---

## 🔒 Security Notes

- All inventory mutations use server-side validation — never frontend-only
- JWT tokens expire in 60 minutes; refresh tokens valid for 7 days
- Role-based endpoint guards (`IsAdminUser`, `IsManagerOrAdmin`, `IsAuthenticated`)
- Concurrent pick operations protected by `select_for_update()` row-level locking
- Atomic transactions wrap all inventory deductions

---

*Built as DevOps Assessment Project 1 — Smart Warehouse Bin & Barcode Locator*
