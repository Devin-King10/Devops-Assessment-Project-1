from django.urls import path
from .views import DashboardStatsView, InventoryAnalyticsView, PickingAnalyticsView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='analytics_dashboard'),
    path('inventory/', InventoryAnalyticsView.as_view(), name='analytics_inventory'),
    path('picking/', PickingAnalyticsView.as_view(), name='analytics_picking'),
]
