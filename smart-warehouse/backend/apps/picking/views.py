from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.utils import timezone
from .models import PickList, PickListItem, PickSession, PickEvent
from .serializers import PickListSerializer, PickListItemSerializer, PickSessionSerializer, PickEventSerializer
from apps.inventory.models import SKUInventory, InventoryMovement
from apps.warehouse.models import Bin


class PickListViewSet(viewsets.ModelViewSet):
    queryset = PickList.objects.prefetch_related(
        'items__product',
        'items__bin__rack__aisle__zone',
        'assigned_to'
    ).all()
    serializer_class = PickListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        role = getattr(user, 'role', 'PICKER')
        status_filter = self.request.query_params.get('status')
        priority_filter = self.request.query_params.get('priority')

        # If user is a picker, allow filtering to their own assigned lists or viewing all
        my_assigned = self.request.query_params.get('my_assigned')
        if my_assigned == 'true' or (role == 'PICKER' and not user.is_staff):
            qs = qs.filter(assigned_to=user)

        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        if priority_filter:
            qs = qs.filter(priority=priority_filter.upper())

        return qs

    def create(self, request, *args, **kwargs):
        """
        Create a pick list along with multiple items and reserve the stock atomically.
        """
        data = request.data
        pick_list_number = data.get('pick_list_number') or f"PL-{int(timezone.now().timestamp())}"
        assigned_to_id = data.get('assigned_to_id')
        priority = data.get('priority', PickList.Priority.MEDIUM)
        notes = data.get('notes', '')
        items_data = data.get('items', [])

        if not items_data:
            return Response({'error': 'Pick list must contain at least one item.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            pick_list = PickList.objects.create(
                pick_list_number=pick_list_number,
                assigned_to_id=assigned_to_id,
                status=PickList.Status.ASSIGNED if assigned_to_id else PickList.Status.PENDING,
                priority=priority,
                created_by=request.user,
                notes=notes
            )

            seq = 1
            for item in items_data:
                product_id = item.get('product_id')
                bin_id = item.get('bin_id')
                quantity_requested = int(item.get('quantity_requested', 1))

                # If bin_id is not specified, auto-select a bin that holds available stock for this product
                if not bin_id:
                    inv_candidate = SKUInventory.objects.select_for_update().filter(
                        product_id=product_id,
                        quantity__gt=models.F('reserved_quantity')
                    ).order_by('-quantity').first()

                    if not inv_candidate:
                        transaction.set_rollback(True)
                        return Response({
                            'error': f"Insufficient available stock to create pick item for product ID {product_id}."
                        }, status=status.HTTP_400_BAD_REQUEST)
                    bin_id = inv_candidate.bin_id
                else:
                    # Lock inventory row
                    inv_candidate = SKUInventory.objects.select_for_update().filter(
                        product_id=product_id,
                        bin_id=bin_id
                    ).first()

                # Reserve quantity to protect against concurrent picking
                if inv_candidate:
                    inv_candidate.reserved_quantity += quantity_requested
                    inv_candidate.save(update_fields=['reserved_quantity'])

                PickListItem.objects.create(
                    pick_list=pick_list,
                    product_id=product_id,
                    bin_id=bin_id,
                    quantity_requested=quantity_requested,
                    quantity_picked=0,
                    sequence_number=seq
                )
                seq += 1

            serializer = PickListSerializer(pick_list)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign_picker(self, request, pk=None):
        pick_list = self.get_object()
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        pick_list.assigned_to_id = user_id
        if pick_list.status == PickList.Status.PENDING:
            pick_list.status = PickList.Status.ASSIGNED
        pick_list.save()

        return Response(PickListSerializer(pick_list).data)


class PickSessionViewSet(viewsets.ModelViewSet):
    queryset = PickSession.objects.select_related('pick_list', 'picker').prefetch_related(
        'events', 'pick_list__items__product', 'pick_list__items__bin__rack__aisle__zone'
    ).all()
    serializer_class = PickSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='start')
    def start_session(self, request):
        """
        Starts an interactive picking session for an assigned pick list.
        """
        pick_list_id = request.data.get('pick_list_id')
        route_data = request.data.get('route_data', [])

        if not pick_list_id:
            return Response({'error': 'pick_list_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            pick_list = PickList.objects.select_for_update().get(id=pick_list_id)

            # Check if there is already an active session for this pick list
            existing_session = PickSession.objects.filter(
                pick_list=pick_list,
                status=PickSession.Status.ACTIVE
            ).first()

            if existing_session:
                return Response(PickSessionSerializer(existing_session).data)

            # Update pick list status
            pick_list.status = PickList.Status.IN_PROGRESS
            if not pick_list.started_at:
                pick_list.started_at = timezone.now()
            if not pick_list.assigned_to:
                pick_list.assigned_to = request.user
            pick_list.save()

            total_items_count = pick_list.items.count()
            picked_count = pick_list.items.filter(status=PickListItem.Status.PICKED).count()

            session = PickSession.objects.create(
                pick_list=pick_list,
                picker=request.user,
                status=PickSession.Status.ACTIVE,
                total_items=total_items_count,
                picked_items=picked_count,
                route_data=route_data
            )

            # Record session start event
            PickEvent.objects.create(
                session=session,
                event_type=PickEvent.EventType.SESSION_START,
                details={'started_by': request.user.username, 'time': timezone.now().isoformat()}
            )

            return Response(PickSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='scan')
    def scan_location(self, request, pk=None):
        """
        Validates scanned barcode against the active pick list item.
        Accepts: scanned_barcode, item_id
        """
        session = self.get_object()
        scanned_barcode = (request.data.get('scanned_barcode') or '').strip()
        item_id = request.data.get('item_id')

        if not scanned_barcode or not item_id:
            return Response({'error': 'scanned_barcode and item_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = session.pick_list.items.select_related('bin', 'product').get(id=item_id)
        except PickListItem.DoesNotExist:
            return Response({'error': 'PickListItem not found in this session.'}, status=status.HTTP_404_NOT_FOUND)

        # Scanned barcode can match either the Bin barcode/bin_code OR the Product barcode/SKU
        bin_match = (
            scanned_barcode.upper() == item.bin.barcode.upper() or
            scanned_barcode.upper() == item.bin.bin_code.upper()
        )
        prod_match = (
            scanned_barcode.upper() == item.product.barcode.upper() or
            scanned_barcode.upper() == item.product.sku.upper()
        )

        is_valid = bin_match or prod_match

        PickEvent.objects.create(
            session=session,
            pick_list_item=item,
            event_type=PickEvent.EventType.LOCATION_SCANNED,
            details={
                'scanned_barcode': scanned_barcode,
                'target_bin_barcode': item.bin.barcode,
                'target_bin_code': item.bin.bin_code,
                'is_valid': is_valid,
                'match_type': 'BIN' if bin_match else ('PRODUCT' if prod_match else 'NONE')
            }
        )

        if not is_valid:
            return Response({
                'valid': False,
                'message': f"Scanned barcode '{scanned_barcode}' does not match expected location '{item.bin.bin_code}' ({item.bin.barcode})."
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'valid': True,
            'message': f"Barcode validated successfully: {item.bin.bin_code}",
            'item': PickListItemSerializer(item).data
        })

    @action(detail=True, methods=['post'], url_path='confirm-pick')
    def confirm_pick(self, request, pk=None):
        """
        CONCURRENCY-CONTROLLED PICK CONFIRMATION.
        Uses select_for_update() row locking inside an atomic database transaction.
        Deducts physical quantity, releases reservation, updates bin totals, and logs audit trail.
        """
        session = self.get_object()
        item_id = request.data.get('item_id')
        quantity_to_pick = int(request.data.get('quantity', 0))

        if not item_id or quantity_to_pick <= 0:
            return Response({'error': 'A valid item_id and positive quantity are required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # 1. Lock PickListItem
            item = PickListItem.objects.select_for_update().select_related('product', 'bin').get(id=item_id, pick_list=session.pick_list)

            if item.status == PickListItem.Status.PICKED:
                return Response({'error': 'This item has already been confirmed as picked.'}, status=status.HTTP_409_CONFLICT)

            # 2. Lock SKUInventory row with row-level lock (select_for_update)
            try:
                sku_inv = SKUInventory.objects.select_for_update().get(
                    product=item.product,
                    bin=item.bin
                )
            except SKUInventory.DoesNotExist:
                return Response({
                    'error': f"CRITICAL: No inventory record exists for product {item.product.sku} at bin {item.bin.bin_code}."
                }, status=status.HTTP_404_NOT_FOUND)

            # 3. Concurrent Pick Validation: Validate actual inventory quantity
            if sku_inv.quantity < quantity_to_pick:
                return Response({
                    'error': f"INSUFFICIENT STOCK: Available physical quantity in bin ({sku_inv.quantity}) is less than requested pick ({quantity_to_pick}). Another picker may have collected stock."
                }, status=status.HTTP_409_CONFLICT)

            # 4. Deduct inventory and release reserved stock
            sku_inv.quantity -= quantity_to_pick
            sku_inv.reserved_quantity = max(0, sku_inv.reserved_quantity - quantity_to_pick)
            sku_inv.save()

            # 5. Update PickListItem
            item.quantity_picked = quantity_to_pick
            item.status = PickListItem.Status.PICKED
            item.save()

            # 6. Refresh Bin current_quantity and status
            bin_obj = item.bin
            total_bin_qty = bin_obj.sku_records.aggregate(total=models.Sum('quantity'))['total'] or 0
            bin_obj.current_quantity = total_bin_qty
            bin_obj.refresh_status()

            # 7. Update Session progress
            session.picked_items = session.pick_list.items.filter(status=PickListItem.Status.PICKED).count()
            session.save(update_fields=['picked_items'])

            # 8. Record Inventory Movement audit trail
            InventoryMovement.objects.create(
                product=item.product,
                source_bin=item.bin,
                destination_bin=None,
                movement_type=InventoryMovement.MovementType.PICK,
                quantity=quantity_to_pick,
                reference_type=InventoryMovement.ReferenceType.PICK_LIST,
                reference_id=session.pick_list.pick_list_number,
                user=request.user,
                notes=f"Picked in session {session.id} by {request.user.username}"
            )

            # 9. Log PickEvent
            PickEvent.objects.create(
                session=session,
                pick_list_item=item,
                event_type=PickEvent.EventType.ITEM_PICKED,
                details={
                    'quantity_picked': quantity_to_pick,
                    'remaining_bin_quantity': sku_inv.quantity,
                    'picked_by': request.user.username
                }
            )

            # Check if all items in pick list are now picked
            all_done = not session.pick_list.items.exclude(status=PickListItem.Status.PICKED).exists()
            if all_done:
                session.status = PickSession.Status.COMPLETED
                session.end_time = timezone.now()
                session.save(update_fields=['status', 'end_time'])

                session.pick_list.status = PickList.Status.COMPLETED
                session.pick_list.completed_at = timezone.now()
                session.pick_list.save(update_fields=['status', 'completed_at'])

            return Response({
                'success': True,
                'message': f"Picked {quantity_to_pick} of {item.product.name} from {item.bin.bin_code}.",
                'item': PickListItemSerializer(item).data,
                'session_progress': {
                    'picked': session.picked_items,
                    'total': session.total_items,
                    'is_completed': all_done
                }
            })

    @action(detail=True, methods=['post'], url_path='report-issue')
    def report_issue(self, request, pk=None):
        """
        Picker reports an issue: incorrect barcode, empty bin, insufficient stock, damaged product, or blocked location.
        """
        session = self.get_object()
        item_id = request.data.get('item_id')
        issue_type = request.data.get('issue_type')  # EMPTY_BIN, DAMAGED, BLOCKED, SHORTAGE, WRONG_BARCODE
        notes = request.data.get('notes', '')

        with transaction.atomic():
            item = session.pick_list.items.select_related('bin', 'product').get(id=item_id)
            item.status = PickListItem.Status.SKIPPED if issue_type in ['DAMAGED', 'BLOCKED'] else PickListItem.Status.SHORTAGE
            item.notes = f"Issue [{issue_type}]: {notes}"
            item.save()

            if issue_type == 'BLOCKED':
                # Mark bin as blocked
                item.bin.status = Bin.Status.BLOCKED
                item.bin.save()

            PickEvent.objects.create(
                session=session,
                pick_list_item=item,
                event_type=PickEvent.EventType.ISSUE_REPORTED,
                details={'issue_type': issue_type, 'notes': notes, 'reported_by': request.user.username}
            )

            return Response({
                'success': True,
                'message': f"Issue '{issue_type}' reported for item {item.product.sku}.",
                'item': PickListItemSerializer(item).data
            })

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_session(self, request, pk=None):
        session = self.get_object()
        session.status = PickSession.Status.COMPLETED
        session.end_time = timezone.now()
        session.save()

        session.pick_list.status = PickList.Status.COMPLETED
        session.pick_list.completed_at = timezone.now()
        session.pick_list.save()

        PickEvent.objects.create(
            session=session,
            event_type=PickEvent.EventType.SESSION_COMPLETE,
            details={'completed_by': request.user.username}
        )

        return Response(PickSessionSerializer(session).data)
