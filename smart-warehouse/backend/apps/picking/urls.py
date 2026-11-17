from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PickListViewSet, PickSessionViewSet

router = DefaultRouter()
router.register(r'pick-lists', PickListViewSet, basename='pick-lists')
router.register(r'pick-sessions', PickSessionViewSet, basename='pick-sessions')

urlpatterns = [
    path('', include(router.urls)),
]
