from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.warehouse.models import WarehouseZone, Aisle, Rack, Bin
from apps.inventory.models import Product, SKUInventory, InventoryMovement
from apps.picking.models import PickList, PickListItem, PickSession, PickEvent

User = get_user_model()


class ConcurrentPickValidationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create user
        self.picker = User.objects.create_user(
            username='picker_test',
            password='TestPassword123!',
            role=User.Role.PICKER
        )
        self.client.force_authenticate(user=self.picker)

        # Create warehouse hierarchy
        self.zone = WarehouseZone.objects.create(zone_code='Z-TEST', name='Test Zone')
        self.aisle = Aisle.objects.create(zone=self.zone, aisle_code='A01', aisle_name='Aisle 1')
        self.rack = Rack.objects.create(aisle=self.aisle, rack_code='R01')
        self.bin = Bin.objects.create(
            rack=self.rack,
            level=1,
            position=1,
            bin_code='Z-A01-R01-L1P1',
            barcode='BIN-TEST-101',
            capacity=100,
            current_quantity=20,
            status=Bin.Status.OCCUPIED
        )

        # Create product & inventory
        self.product = Product.objects.create(
            sku='SKU-CONCURRENT-001',
            name='Precision Multimeter',
            category='Electronics',
            barcode='BAR-TEST-888',
            unit='pcs',
            reorder_level=5
        )
        self.inventory = SKUInventory.objects.create(
            product=self.product,
            bin=self.bin,
            quantity=20,
            reserved_quantity=5
        )

        # Create pick list with 1 item requesting 5 units
        self.pick_list = PickList.objects.create(
            pick_list_number='PL-TEST-001',
            assigned_to=self.picker,
            status=PickList.Status.ASSIGNED
        )
        self.pick_item = PickListItem.objects.create(
            pick_list=self.pick_list,
            product=self.product,
            bin=self.bin,
            quantity_requested=5,
            quantity_picked=0,
            sequence_number=1
        )

    def test_start_picking_session(self):
        url = '/api/pick-sessions/start/'
        res = self.client.post(url, {'pick_list_id': str(self.pick_list.id)}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', res.data)
        self.assertEqual(res.data['status'], PickSession.Status.ACTIVE)

    def test_barcode_scan_validation(self):
        session = PickSession.objects.create(
            pick_list=self.pick_list,
            picker=self.picker,
            status=PickSession.Status.ACTIVE
        )

        scan_url = f'/api/pick-sessions/{session.id}/scan/'
        res_valid = self.client.post(scan_url, {
            'item_id': str(self.pick_item.id),
            'scanned_barcode': 'BIN-TEST-101'
        }, format='json')
        self.assertEqual(res_valid.status_code, status.HTTP_200_OK)
        self.assertTrue(res_valid.data['valid'])

        res_invalid = self.client.post(scan_url, {
            'item_id': str(self.pick_item.id),
            'scanned_barcode': 'WRONG-BARCODE-999'
        }, format='json')
        self.assertEqual(res_invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res_invalid.data['valid'])

    def test_confirm_pick_concurrency_and_inventory_decrement(self):
        session = PickSession.objects.create(
            pick_list=self.pick_list,
            picker=self.picker,
            status=PickSession.Status.ACTIVE,
            total_items=1
        )

        confirm_url = f'/api/pick-sessions/{session.id}/confirm-pick/'
        res = self.client.post(confirm_url, {
            'item_id': str(self.pick_item.id),
            'quantity': 5
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 15)
        self.assertEqual(self.inventory.reserved_quantity, 0)

        self.pick_item.refresh_from_db()
        self.assertEqual(self.pick_item.status, PickListItem.Status.PICKED)
        self.assertEqual(self.pick_item.quantity_picked, 5)

        movement = InventoryMovement.objects.filter(product=self.product, source_bin=self.bin).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.movement_type, InventoryMovement.MovementType.PICK)
        self.assertEqual(movement.quantity, 5)

        # Duplicate pick prevention
        res_dup = self.client.post(confirm_url, {
            'item_id': str(self.pick_item.id),
            'quantity': 5
        }, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_409_CONFLICT)

    def test_prevent_picking_more_than_physical_stock(self):
        session = PickSession.objects.create(
            pick_list=self.pick_list,
            picker=self.picker,
            status=PickSession.Status.ACTIVE,
            total_items=1
        )

        confirm_url = f'/api/pick-sessions/{session.id}/confirm-pick/'
        res = self.client.post(confirm_url, {
            'item_id': str(self.pick_item.id),
            'quantity': 100
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('INSUFFICIENT STOCK', res.data['error'])
