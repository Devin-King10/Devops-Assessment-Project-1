-- =============================================================================
-- SMART WAREHOUSE BIN & BARCODE LOCATOR - SUPABASE POSTGRESQL SCHEMA
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. USERS & ROLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(150) DEFAULT '',
    last_name VARCHAR(150) DEFAULT '',
    role VARCHAR(50) NOT NULL DEFAULT 'PICKER' CHECK (role IN ('ADMIN', 'MANAGER', 'PICKER')),
    employee_id VARCHAR(50) UNIQUE,
    phone_number VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    is_staff BOOLEAN DEFAULT FALSE,
    is_superuser BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- -----------------------------------------------------------------------------
-- 2. WAREHOUSE ZONES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouse_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    dimensions JSONB DEFAULT '{"length": 50, "width": 30, "height": 10}'::jsonb,
    color_hex VARCHAR(20) DEFAULT '#2563EB',
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zones_code ON warehouse_zones(zone_code);

-- -----------------------------------------------------------------------------
-- 3. AISLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aisles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES warehouse_zones(id) ON DELETE CASCADE,
    aisle_code VARCHAR(50) NOT NULL,
    aisle_name VARCHAR(150) NOT NULL,
    position_x NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    position_y NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    width NUMERIC(10, 2) NOT NULL DEFAULT 3.00,
    length NUMERIC(10, 2) NOT NULL DEFAULT 20.00,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'MAINTENANCE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_zone_aisle_code UNIQUE (zone_id, aisle_code)
);

CREATE INDEX IF NOT EXISTS idx_aisles_zone ON aisles(zone_id);
CREATE INDEX IF NOT EXISTS idx_aisles_code ON aisles(aisle_code);

-- -----------------------------------------------------------------------------
-- 4. RACKS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aisle_id UUID NOT NULL REFERENCES aisles(id) ON DELETE CASCADE,
    rack_code VARCHAR(50) NOT NULL,
    rack_type VARCHAR(50) DEFAULT 'STANDARD' CHECK (rack_type IN ('STANDARD', 'HEAVY_DUTY', 'CANTILEVER', 'FLOW')),
    number_of_levels INT NOT NULL DEFAULT 5 CHECK (number_of_levels > 0),
    bins_per_level INT NOT NULL DEFAULT 4 CHECK (bins_per_level > 0),
    position_x NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    position_y NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    height NUMERIC(10, 2) NOT NULL DEFAULT 6.00,
    width NUMERIC(10, 2) NOT NULL DEFAULT 2.40,
    depth NUMERIC(10, 2) NOT NULL DEFAULT 1.20,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'DAMAGED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_aisle_rack_code UNIQUE (aisle_id, rack_code)
);

CREATE INDEX IF NOT EXISTS idx_racks_aisle ON racks(aisle_id);
CREATE INDEX IF NOT EXISTS idx_racks_code ON racks(rack_code);

-- -----------------------------------------------------------------------------
-- 5. BINS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_id UUID NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
    bin_code VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    level INT NOT NULL CHECK (level > 0),
    position INT NOT NULL CHECK (position > 0),
    capacity INT NOT NULL DEFAULT 100 CHECK (capacity >= 0),
    current_quantity INT NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'LOW_STOCK', 'FULL', 'BLOCKED', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rack_level_position UNIQUE (rack_id, level, position)
);

CREATE INDEX IF NOT EXISTS idx_bins_rack ON bins(rack_id);
CREATE INDEX IF NOT EXISTS idx_bins_code ON bins(bin_code);
CREATE INDEX IF NOT EXISTS idx_bins_barcode ON bins(barcode);
CREATE INDEX IF NOT EXISTS idx_bins_status ON bins(status);

-- -----------------------------------------------------------------------------
-- 6. PRODUCTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    barcode VARCHAR(100) UNIQUE NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    weight NUMERIC(10, 2) DEFAULT 0.00,
    reorder_level INT NOT NULL DEFAULT 20 CHECK (reorder_level >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- -----------------------------------------------------------------------------
-- 7. SKU INVENTORY (Product in Bin)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sku_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INT GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    batch_number VARCHAR(100),
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_reserved_le_quantity CHECK (reserved_quantity <= quantity),
    CONSTRAINT uq_product_bin UNIQUE (product_id, bin_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON sku_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_bin ON sku_inventory(bin_id);

-- -----------------------------------------------------------------------------
-- 8. INVENTORY MOVEMENTS (Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    source_bin_id UUID REFERENCES bins(id) ON DELETE SET NULL,
    destination_bin_id UUID REFERENCES bins(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('STOCK_IN', 'PICK', 'ADJUSTMENT', 'TRANSFER', 'RETURN')),
    quantity INT NOT NULL CHECK (quantity > 0),
    reference_type VARCHAR(50) DEFAULT 'MANUAL' CHECK (reference_type IN ('PICK_LIST', 'MANUAL', 'RESTOCK', 'CYCLE_COUNT')),
    reference_id VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON inventory_movements(timestamp);

-- -----------------------------------------------------------------------------
-- 9. PICK LISTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pick_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_number VARCHAR(100) UNIQUE NOT NULL,
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_picklists_status ON pick_lists(status);
CREATE INDEX IF NOT EXISTS idx_picklists_assigned ON pick_lists(assigned_to_id);

-- -----------------------------------------------------------------------------
-- 10. PICK LIST ITEMS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pick_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_id UUID NOT NULL REFERENCES pick_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    bin_id UUID NOT NULL REFERENCES bins(id) ON DELETE RESTRICT,
    quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
    quantity_picked INT NOT NULL DEFAULT 0 CHECK (quantity_picked >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PICKED', 'SHORTAGE', 'SKIPPED')),
    sequence_number INT NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_picked_le_requested CHECK (quantity_picked <= quantity_requested)
);

CREATE INDEX IF NOT EXISTS idx_picklistitems_list ON pick_list_items(pick_list_id);
CREATE INDEX IF NOT EXISTS idx_picklistitems_bin ON pick_list_items(bin_id);

-- -----------------------------------------------------------------------------
-- 11. PICK SESSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pick_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_list_id UUID NOT NULL REFERENCES pick_lists(id) ON DELETE CASCADE,
    picker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABORTED')),
    total_items INT NOT NULL DEFAULT 0,
    picked_items INT NOT NULL DEFAULT 0,
    total_distance NUMERIC(10, 2) DEFAULT 0.00,
    route_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_picklist ON pick_sessions(pick_list_id);
CREATE INDEX IF NOT EXISTS idx_sessions_picker ON pick_sessions(picker_id);

-- -----------------------------------------------------------------------------
-- 12. PICK EVENTS (Session Activity & Issues Log)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pick_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES pick_sessions(id) ON DELETE CASCADE,
    pick_list_item_id UUID REFERENCES pick_list_items(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('SESSION_START', 'LOCATION_SCANNED', 'ITEM_PICKED', 'ISSUE_REPORTED', 'SESSION_PAUSE', 'SESSION_RESUME', 'SESSION_COMPLETE', 'SESSION_ABORT')),
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_session ON pick_events(session_id);

-- -----------------------------------------------------------------------------
-- 13. WAREHOUSE NODES (Navigation Graph)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouse_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_code VARCHAR(100) UNIQUE NOT NULL,
    node_type VARCHAR(50) NOT NULL DEFAULT 'INTERSECTION' CHECK (node_type IN ('INTERSECTION', 'AISLE_ENTRY', 'AISLE_EXIT', 'BIN_ACCESS', 'DISPATCH', 'RECEIVING')),
    x NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    y NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    z NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    zone_id UUID REFERENCES warehouse_zones(id) ON DELETE CASCADE,
    aisle_id UUID REFERENCES aisles(id) ON DELETE SET NULL,
    rack_id UUID REFERENCES racks(id) ON DELETE SET NULL,
    bin_id UUID REFERENCES bins(id) ON DELETE SET NULL,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nodes_code ON warehouse_nodes(node_code);
CREATE INDEX IF NOT EXISTS idx_nodes_bin ON warehouse_nodes(bin_id);

-- -----------------------------------------------------------------------------
-- 14. WAREHOUSE EDGES (Walkable Paths & Travel Weights)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouse_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_node_id UUID NOT NULL REFERENCES warehouse_nodes(id) ON DELETE CASCADE,
    to_node_id UUID NOT NULL REFERENCES warehouse_nodes(id) ON DELETE CASCADE,
    distance NUMERIC(10, 2) NOT NULL CHECK (distance >= 0),
    is_bidirectional BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    weight_modifier NUMERIC(5, 2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_edge_nodes UNIQUE (from_node_id, to_node_id)
);

CREATE INDEX IF NOT EXISTS idx_edges_from ON warehouse_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_to ON warehouse_edges(to_node_id);
