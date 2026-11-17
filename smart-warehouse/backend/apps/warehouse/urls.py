from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WarehouseZoneViewSet, AisleViewSet, RackViewSet, BinViewSet

router = DefaultRouter()
router.register(r'zones', WarehouseZoneViewSet, basename='zones')
router.register(r'aisles', AisleViewSet, basename='aisles')
router.register(r'racks', RackViewSet, basename='racks')
router.register(r'bins', BinViewSet, basename='bins')

urlpatterns = [
    path('', include(router.urls)),
]
