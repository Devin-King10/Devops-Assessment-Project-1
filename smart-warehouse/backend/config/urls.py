"""
URL configuration for Smart Warehouse Bin & Barcode Locator.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.warehouse.urls')),
    path('api/', include('apps.inventory.urls')),
    path('api/', include('apps.picking.urls')),
    path('api/routes/', include('apps.routing.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
]
