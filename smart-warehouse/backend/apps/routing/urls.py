from django.urls import path
from .views import (
    DijkstraRouteView,
    AStarRouteView,
    OptimizeRouteView,
    CompareAlgorithmsView,
    GraphDataView
)

urlpatterns = [
    path('dijkstra/', DijkstraRouteView.as_view(), name='route_dijkstra'),
    path('astar/', AStarRouteView.as_view(), name='route_astar'),
    path('optimize/', OptimizeRouteView.as_view(), name='route_optimize'),
    path('compare/', CompareAlgorithmsView.as_view(), name='route_compare'),
    path('graph/', GraphDataView.as_view(), name='route_graph'),
]
