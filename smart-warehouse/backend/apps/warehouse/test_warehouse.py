from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.warehouse.models import WarehouseZone, Aisle, Rack, Bin
from apps.inventory.models import Product, SKUInventory

User = get_user_model()


class WarehouseApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='admin_test',
            password='Password123!',
            role=User.Role.ADMIN,
            is_staff=True
        )
        self.client.force_authenticate(user=self.user)

        self.zone = WarehouseZone.objects.create(zone_code='ZA', name='Zone Alpha')
        self.aisle = Aisle.objects.create(zone=self.zone, aisle_code='A01', aisle_name='Aisle 1')
        self.rack = Rack.objects.create(aisle=self.aisle, rack_code='R01', number_of_levels=5)
        self.bin = Bin.objects.create(
            rack=self.rack,
            level=2,
            position=3,
            bin_code='ZA-A01-R01-L2P3',
            barcode='BIN-BAR-203',
            capacity=100,
            current_quantity=45,
            status=Bin.Status.OCCUPIED
        )

        self.product = Product.objects.create(
            sku='SKU-PROD-999',
            name='Test Industrial Screws',
            category='Fasteners',
            barcode='BAR-SKU-999',
            unit='pack'
        )
        SKUInventory.objects.create(
            product=self.product,
            bin=self.bin,
            quantity=45,
            reserved_quantity=0
        )

    def test_get_zones(self):
        res = self.client.get('/api/zones/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data['results']), 1)

    def test_barcode_lookup_for_bin(self):
        url = '/api/barcodes/BIN-BAR-203/'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['type'], 'BIN')
        self.assertEqual(res.data['bin_code'], 'ZA-A01-R01-L2P3')
        self.assertIn('ZA → A01 → R01 → Level 2 → ZA-A01-R01-L2P3', res.data['hierarchy']['breadcrumb'])

    def test_barcode_lookup_for_product(self):
        url = '/api/barcodes/BAR-SKU-999/'
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['type'], 'PRODUCT')
        self.assertEqual(res.data['sku'], 'SKU-PROD-999')
        self.assertEqual(len(res.data['storage_locations']), 1)
        self.assertEqual(res.data['total_quantity'], 45)

    def test_warehouse_tree(self):
        res = self.client.get('/api/bins/tree/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
        self.assertGreaterEqual(len(res.data), 1)
