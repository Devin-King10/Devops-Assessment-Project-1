import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.warehouse.models import WarehouseZone, Aisle, Rack, Bin
from apps.inventory.models import Product, SKUInventory, InventoryMovement
from apps.picking.models import PickList, PickListItem
from apps.routing.models import WarehouseNode, WarehouseEdge

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds complete demonstration data for Smart Warehouse Bin & Barcode Locator'

    def handle(self, *args, **options):
        self.stdout.write("--- Starting Smart Warehouse Seeding ---")

        # 1. Users
        users_data = [
            {'username': 'admin', 'email': 'admin@warehouse.io', 'role': User.Role.ADMIN, 'first_name': 'Alex', 'last_name': 'Vance', 'employee_id': 'EMP-001'},
            {'username': 'manager', 'email': 'manager@warehouse.io', 'role': User.Role.MANAGER, 'first_name': 'Marcus', 'last_name': 'Reed', 'employee_id': 'EMP-002'},
            {'username': 'picker1', 'email': 'picker1@warehouse.io', 'role': User.Role.PICKER, 'first_name': 'Elena', 'last_name': 'Rostova', 'employee_id': 'EMP-003'},
            {'username': 'picker2', 'email': 'picker2@warehouse.io', 'role': User.Role.PICKER, 'first_name': 'David', 'last_name': 'Kim', 'employee_id': 'EMP-004'},
        ]
        created_users = {}
        for u in users_data:
            user, created = User.objects.get_or_create(
                username=u['username'],
                defaults={
                    'email': u['email'],
                    'role': u['role'],
                    'first_name': u['first_name'],
                    'last_name': u['last_name'],
                    'employee_id': u['employee_id'],
                    'is_staff': u['role'] in [User.Role.ADMIN, User.Role.MANAGER],
                    'is_superuser': u['role'] == User.Role.ADMIN,
                }
            )
            if created:
                user.set_password('Password123!')
                user.save()
            created_users[u['username']] = user
        self.stdout.write(self.style.SUCCESS(f"✓ Users verified: {len(created_users)}"))

        # 2. Zones
        zones_config = [
            ('ZONE-A', 'Zone A - High Velocity Fast-Moving', 'Electronics, Mobile, High Frequency', '#2563EB', 0.0),
            ('ZONE-B', 'Zone B - Standard Industrial & Tools', 'Hardware, Tools, Medium Turnover', '#10B981', 30.0),
            ('ZONE-C', 'Zone C - Bulk & Heavy Goods', 'Bulk Packaged Goods, Pallet Supplies', '#F59E0B', 60.0),
        ]
        created_zones = {}
        for code, name, desc, color, y_offset in zones_config:
            zone, _ = WarehouseZone.objects.get_or_create(
                zone_code=code,
                defaults={
                    'name': name,
                    'description': desc,
                    'dimensions': {'length': 40, 'width': 30, 'height': 10},
                    'color_hex': color,
                    'status': WarehouseZone.Status.ACTIVE
                }
            )
            created_zones[code] = (zone, y_offset)

        # 3. Aisles, Racks, Bins
        all_bins = []
        for zone_code, (zone, y_base) in created_zones.items():
            for a_idx in range(1, 6):
                aisle_code = f"{zone_code[-1]}{a_idx:02d}"
                aisle_x = 4.0 + (a_idx - 1) * 6.5
                aisle_y = y_base + 4.0

                aisle, _ = Aisle.objects.get_or_create(
                    zone=zone,
                    aisle_code=aisle_code,
                    defaults={
                        'aisle_name': f"Aisle {aisle_code}",
                        'position_x': aisle_x,
                        'position_y': aisle_y,
                        'width': 3.0,
                        'length': 20.0,
                        'status': Aisle.Status.ACTIVE
                    }
                )

                # 4 Racks per Aisle
                for r_idx in range(1, 5):
                    rack_code = f"R{r_idx:02d}"
                    rack_x = aisle_x - 1.2 if r_idx % 2 == 1 else aisle_x + 1.2
                    rack_y = aisle_y + ((r_idx - 1) // 2) * 8.0 + 3.0

                    rack, _ = Rack.objects.get_or_create(
                        aisle=aisle,
                        rack_code=rack_code,
                        defaults={
                            'rack_type': Rack.RackType.STANDARD,
                            'number_of_levels': 5,
                            'bins_per_level': 4,
                            'position_x': rack_x,
                            'position_y': rack_y,
                            'height': 6.0,
                            'width': 2.4,
                            'depth': 1.2,
                            'status': Rack.Status.ACTIVE
                        }
                    )

                    # Bins for each level
                    for lvl in range(1, 6):
                        for pos in range(1, 5):
                            bin_code = f"{zone_code[-1]}-{aisle_code}-{rack_code}-L{lvl}P{pos}"
                            barcode = f"BIN-{zone_code[-1]}{a_idx}{r_idx}{lvl}{pos}"

                            bin_obj, created_bin = Bin.objects.get_or_create(
                                rack=rack,
                                level=lvl,
                                position=pos,
                                defaults={
                                    'bin_code': bin_code,
                                    'barcode': barcode,
                                    'capacity': 100,
                                    'current_quantity': 0,
                                    'status': Bin.Status.AVAILABLE
                                }
                            )
                            all_bins.append(bin_obj)

        self.stdout.write(self.style.SUCCESS(f"✓ Total Bins seeded: {len(all_bins)} across 15 aisles and 60 racks."))

        # 4. 50 Products
        products_spec = [
            ("SKU-ELEC-001", "ProBook Laptop 15-inch", "Electronics", "890123400001", "pcs", 10),
            ("SKU-ELEC-002", "Wireless Ergonomic Mouse", "Electronics", "890123400002", "pcs", 25),
            ("SKU-ELEC-003", "Mechanical Keyboard RGB", "Electronics", "890123400003", "pcs", 15),
            ("SKU-ELEC-004", "USB-C Fast Charger 65W", "Electronics", "890123400004", "pcs", 30),
            ("SKU-ELEC-005", "Braided USB-C Cable 2m", "Electronics", "890123400005", "pcs", 50),
            ("SKU-ELEC-006", "HDMI 2.1 Ultra Cable 3m", "Electronics", "890123400006", "pcs", 35),
            ("SKU-ELEC-007", "Noise-Cancelling Headphones", "Electronics", "890123400007", "pcs", 12),
            ("SKU-ELEC-008", "True Wireless Earbuds ANC", "Electronics", "890123400008", "pcs", 20),
            ("SKU-ELEC-009", "Portable SSD 1TB NVMe", "Electronics", "890123400009", "pcs", 15),
            ("SKU-ELEC-010", "MicroSD Card 256GB U3", "Electronics", "890123400010", "pcs", 40),
            ("SKU-ELEC-011", "Full HD Webcam 1080p", "Electronics", "890123400011", "pcs", 20),
            ("SKU-ELEC-012", "USB-C Multiport Docking Station", "Electronics", "890123400012", "pcs", 15),
            ("SKU-ELEC-013", "Cat6 Ethernet Cable 15m", "Electronics", "890123400013", "pcs", 30),
            ("SKU-ELEC-014", "Smart Fitness Tracker Band", "Electronics", "890123400014", "pcs", 25),
            ("SKU-ELEC-015", "Power Bank 20000mAh", "Electronics", "890123400015", "pcs", 20),
            ("SKU-TOOL-001", "Cordless Brushless Drill 20V", "Hardware & Tools", "890123400016", "set", 8),
            ("SKU-TOOL-002", "Impact Driver Kit 18V", "Hardware & Tools", "890123400017", "set", 8),
            ("SKU-TOOL-003", "Socket Wrench Set 108pcs", "Hardware & Tools", "890123400018", "set", 10),
            ("SKU-TOOL-004", "Claw Hammer 16oz", "Hardware & Tools", "890123400019", "pcs", 20),
            ("SKU-TOOL-005", "Adjustable Wrench 10-inch", "Hardware & Tools", "890123400020", "pcs", 25),
            ("SKU-TOOL-006", "Precision Screwdriver Set 64-in-1", "Hardware & Tools", "890123400021", "set", 30),
            ("SKU-TOOL-007", "Heavy-Duty Tape Measure 8m", "Hardware & Tools", "890123400022", "pcs", 40),
            ("SKU-TOOL-008", "Digital Caliper 150mm", "Hardware & Tools", "890123400023", "pcs", 15),
            ("SKU-TOOL-009", "Angle Grinder 850W 115mm", "Hardware & Tools", "890123400024", "pcs", 10),
            ("SKU-TOOL-010", "Heavy Duty Pliers 3-Pack", "Hardware & Tools", "890123400025", "set", 18),
            ("SKU-TOOL-011", "Hex Key Allen Wrench Set 30pc", "Hardware & Tools", "890123400026", "set", 25),
            ("SKU-TOOL-012", "Torpedo Spirit Level 9-inch", "Hardware & Tools", "890123400027", "pcs", 20),
            ("SKU-TOOL-013", "Utility Knife Heavy Duty", "Hardware & Tools", "890123400028", "pcs", 50),
            ("SKU-TOOL-014", "Safety Glasses Anti-Fog", "Safety & PPE", "890123400029", "pcs", 60),
            ("SKU-TOOL-015", "Nitrile Work Gloves Pack (12 Pairs)", "Safety & PPE", "890123400030", "pack", 40),
            ("SKU-FAST-001", "Drywall Screws #6 x 1-1/4 Box 1000", "Fasteners", "890123400031", "box", 20),
            ("SKU-FAST-002", "Stainless Steel Hex Bolt M8x30 (100pc)", "Fasteners", "890123400032", "pack", 25),
            ("SKU-FAST-003", "Heavy Nylon Cable Ties 300mm (500pc)", "Fasteners", "890123400033", "pack", 45),
            ("SKU-FAST-004", "Expansion Wall Anchors M6 (200pc)", "Fasteners", "890123400034", "box", 30),
            ("SKU-FAST-005", "Spring Lock Washers M10 (250pc)", "Fasteners", "890123400035", "box", 25),
            ("SKU-CHEM-001", "Multi-Use Lubricant Spray 400ml", "Chemicals", "890123400036", "can", 30),
            ("SKU-CHEM-002", "Silicone Sealant Clear 300ml", "Chemicals", "890123400037", "tube", 25),
            ("SKU-CHEM-003", "Industrial Threadlocker Blue 50ml", "Chemicals", "890123400038", "bottle", 20),
            ("SKU-CHEM-004", "Brake Cleaner Aerosol 500ml", "Chemicals", "890123400039", "can", 20),
            ("SKU-CHEM-005", "Contact Cleaner Quick-Dry 400ml", "Chemicals", "890123400040", "can", 18),
            ("SKU-BULK-001", "Stretch Wrap Film 500mm x 300m", "Packaging", "890123400041", "roll", 20),
            ("SKU-BULK-002", "Corrugated Shipping Box Large (25pc)", "Packaging", "890123400042", "bundle", 15),
            ("SKU-BULK-003", "Bubble Cushioning Roll 100m", "Packaging", "890123400043", "roll", 15),
            ("SKU-BULK-004", "Heavy Duty Packing Tape (6 Rolls)", "Packaging", "890123400044", "pack", 30),
            ("SKU-BULK-005", "Industrial Steel Strapping 19mm", "Packaging", "890123400045", "coil", 5),
            ("SKU-RAW-001", "Aluminum Extrusion 2020 T-Slot 2m", "Raw Materials", "890123400046", "pcs", 20),
            ("SKU-RAW-002", "Copper Pipe Rigid 15mm x 3m", "Raw Materials", "890123400047", "pcs", 15),
            ("SKU-RAW-003", "Steel Square Tubing 25x25mm 2m", "Raw Materials", "890123400048", "pcs", 15),
            ("SKU-RAW-004", "Brass Round Rod 12mm x 1m", "Raw Materials", "890123400049", "pcs", 18),
            ("SKU-RAW-005", "Polycarbonate Clear Sheet 500x500mm", "Raw Materials", "890123400050", "sheet", 25),
        ]

        created_prods = []
        for sku, name, cat, barcode, unit, reorder in products_spec:
            p, _ = Product.objects.get_or_create(
                sku=sku,
                defaults={
                    'name': name,
                    'category': cat,
                    'barcode': barcode,
                    'unit': unit,
                    'reorder_level': reorder,
                    'is_active': True
                }
            )
            created_prods.append(p)
        self.stdout.write(self.style.SUCCESS(f"✓ Products created: {len(created_prods)}"))

        # 5. Populate SKU Inventory across bins
        random.seed(42)  # Deterministic seed for reproducible layout
        admin_user = created_users['admin']

        assigned_bin_indices = random.sample(range(len(all_bins)), len(created_prods) * 3)
        bin_ptr = 0

        for p_idx, prod in enumerate(created_prods):
            # Assign each product to 2-3 different bins
            num_bins = 3 if p_idx < 30 else 2
            for _ in range(num_bins):
                target_bin = all_bins[assigned_bin_indices[bin_ptr]]
                bin_ptr += 1

                # Generate realistic quantities (including low stock for demonstration)
                if p_idx % 7 == 0:
                    qty = random.randint(3, prod.reorder_level)  # Low stock
                elif p_idx % 11 == 0:
                    qty = 100  # Full bin
                else:
                    qty = random.randint(30, 85)

                sku_inv, _ = SKUInventory.objects.get_or_create(
                    product=prod,
                    bin=target_bin,
                    defaults={
                        'quantity': qty,
                        'reserved_quantity': 0,
                        'batch_number': f"BATCH-{2026}{random.randint(10, 99)}"
                    }
                )

                target_bin.current_quantity = qty
                target_bin.refresh_status()

                # Audit record
                InventoryMovement.objects.get_or_create(
                    product=prod,
                    destination_bin=target_bin,
                    movement_type=InventoryMovement.MovementType.STOCK_IN,
                    quantity=qty,
                    reference_type=InventoryMovement.ReferenceType.RESTOCK,
                    reference_id="INIT-SEED-2026",
                    defaults={'user': admin_user, 'notes': 'Initial warehouse setup seed'}
                )

        self.stdout.write(self.style.SUCCESS("✓ SKU Inventory and audit movements populated."))

        # 6. Sample Pick Lists
        manager_user = created_users['manager']
        picker1 = created_users['picker1']
        picker2 = created_users['picker2']

        pick_lists_data = [
            ("PL-2026-001", picker1, PickList.Status.IN_PROGRESS, PickList.Priority.URGENT, "Urgent rush order: 6 items for assembly line A"),
            ("PL-2026-002", picker2, PickList.Status.ASSIGNED, PickList.Priority.HIGH, "Daily morning stock replenishment for electronics shop"),
            ("PL-2026-003", None, PickList.Status.PENDING, PickList.Priority.MEDIUM, "Standard tool fulfillment order"),
        ]

        for pl_num, assigned_picker, pl_status, priority, notes in pick_lists_data:
            pl, created_pl = PickList.objects.get_or_create(
                pick_list_number=pl_num,
                defaults={
                    'assigned_to': assigned_picker,
                    'status': pl_status,
                    'priority': priority,
                    'created_by': manager_user,
                    'notes': notes
                }
            )
            if created_pl:
                # Add 4 to 6 items to this pick list
                sample_skus = random.sample(created_prods, 5)
                for s_idx, sprod in enumerate(sample_skus, start=1):
                    # Pick from one of the product's assigned bins
                    inv_loc = sprod.inventory_locations.first()
                    if inv_loc:
                        req_qty = random.randint(2, 6)
                        inv_loc.reserved_quantity += req_qty
                        inv_loc.save()

                        PickListItem.objects.create(
                            pick_list=pl,
                            product=sprod,
                            bin=inv_loc.bin,
                            quantity_requested=req_qty,
                            quantity_picked=req_qty if pl_status == PickList.Status.COMPLETED else 0,
                            sequence_number=s_idx
                        )

        self.stdout.write(self.style.SUCCESS("✓ Sample Pick Lists and Items created."))
        self.stdout.write(self.style.SUCCESS("--- Smart Warehouse Seeding Complete! ---"))
