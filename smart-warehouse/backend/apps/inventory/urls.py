from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, SKUInventoryViewSet, InventoryMovementViewSet, barcode_lookup_view

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'inventory', SKUInventoryViewSet, basename='inventory')
router.register(r'movements', InventoryMovementViewSet, basename='movements')

urlpatterns = [
    path('barcodes/<str:barcode>/', barcode_lookup_view, name='barcode_lookup'),
    path('', include(router.urls)),
]
