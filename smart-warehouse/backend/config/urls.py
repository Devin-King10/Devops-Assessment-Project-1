"""
URL configuration for Smart Warehouse Bin & Barcode Locator.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def api_root_status(request):
    return JsonResponse({
        "status": "online",
        "service": "Smart Warehouse Bin & Barcode Locator API",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "auth": "/api/auth/",
            "warehouse": "/api/warehouse/",
            "inventory": "/api/inventory/",
            "picking": "/api/picking/",
            "routes": "/api/routes/",
            "analytics": "/api/analytics/"
        }
    })

urlpatterns = [
    path('', api_root_status, name='api-root-status'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.warehouse.urls')),
    path('api/', include('apps.inventory.urls')),
    path('api/', include('apps.picking.urls')),
    path('api/routes/', include('apps.routing.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
]
