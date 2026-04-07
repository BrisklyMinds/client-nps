import base64
import csv
from datetime import timedelta
from io import BytesIO

import qrcode
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Feedback, FeedbackStatusLog, System
from .serializers import (
    FeedbackCreateErrorSerializer,
    FeedbackCreateSerializer,
    FeedbackDetailSerializer,
    FeedbackListSerializer,
    FeedbackPublicIncidentSerializer,
    FeedbackStatsSerializer,
    FeedbackTrackSerializer,
    FeedbackUpdateStatusSerializer,
    SystemListSerializer,
    SystemPublicSerializer,
    SystemSerializer,
    UserChangePasswordErrorSerializer,
    UserChangePasswordSerializer,
    UserCreateErrorSerializer,
    UserCreateSerializer,
    UserCurrentErrorSerializer,
    UserCurrentSerializer,
)

User = get_user_model()


class UserViewSet(
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all()
    serializer_class = UserCurrentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(pk=self.request.user.pk)

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]

        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        elif self.action == "me":
            return UserCurrentSerializer
        elif self.action == "change_password":
            return UserChangePasswordSerializer

        return super().get_serializer_class()

    @extend_schema(
        responses={
            200: UserCreateSerializer,
            400: UserCreateErrorSerializer,
        }
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        responses={
            200: UserCurrentSerializer,
            400: UserCurrentErrorSerializer,
        }
    )
    @action(["get", "put", "patch"], detail=False)
    def me(self, request, *args, **kwargs):
        if request.method == "GET":
            serializer = self.get_serializer(self.request.user)
            return Response(serializer.data)
        elif request.method == "PUT":
            serializer = self.get_serializer(
                self.request.user, data=request.data, partial=False
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        elif request.method == "PATCH":
            serializer = self.get_serializer(
                self.request.user, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @extend_schema(
        responses={
            204: None,
            400: UserChangePasswordErrorSerializer,
        }
    )
    @action(["post"], url_path="change-password", detail=False)
    def change_password(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        self.request.user.set_password(serializer.data["password_new"])
        self.request.user.save()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(["delete"], url_path="delete-account", detail=False)
    def delete_account(self, request, *args, **kwargs):
        self.request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FeedbackViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = (
        Feedback.objects.select_related("system").prefetch_related("files").all()
    )
    permission_classes = [IsAuthenticated]
    filterset_fields = ["system__slug", "feedback_type", "rating"]

    def get_permissions(self):
        if self.action in ("create", "track", "incidents"):
            return [AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "create":
            return FeedbackCreateSerializer
        if self.action == "list":
            return FeedbackListSerializer
        if self.action == "track":
            return FeedbackTrackSerializer
        if self.action == "update_status":
            return FeedbackUpdateStatusSerializer
        if self.action == "incidents":
            return FeedbackPublicIncidentSerializer
        return FeedbackDetailSerializer

    @extend_schema(
        responses={201: FeedbackCreateSerializer, 400: FeedbackCreateErrorSerializer}
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(responses={200: FeedbackStatsSerializer})
    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        system_slug = request.query_params.get("system__slug")
        if system_slug:
            qs = qs.filter(system__slug=system_slug)

        stats_data = {
            "total_count": qs.count(),
            "average_rating": qs.filter(rating__isnull=False).aggregate(
                avg=Avg("rating")
            )["avg"],
            "by_type": dict(
                qs.values_list("feedback_type")
                .annotate(count=Count("id"))
                .order_by()
            ),
            "by_system": list(
                qs.values("system__name")
                .annotate(count=Count("id"))
                .order_by("-count")
            ),
            "by_status": dict(
                qs.values_list("status")
                .annotate(count=Count("id"))
                .order_by()
            ),
        }
        return Response(FeedbackStatsSerializer(stats_data).data)

    @action(detail=False, methods=["get"], url_path="export")
    def export_csv(self, request):
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="feedback_export.csv"'
        writer = csv.writer(response)
        writer.writerow(
            ["ID", "System", "Phone", "Type", "Rating", "Comment", "Date"]
        )
        for fb in qs:
            writer.writerow(
                [
                    fb.id,
                    fb.system.name,
                    fb.phone,
                    fb.feedback_type,
                    fb.rating,
                    fb.comment,
                    fb.created_at.isoformat(),
                ]
            )
        return response

    @extend_schema(responses={200: FeedbackTrackSerializer})
    @action(
        detail=False,
        methods=["get"],
        url_path="track/(?P<tracking_id>[^/.]+)",
        permission_classes=[AllowAny],
    )
    def track(self, request, tracking_id=None):
        try:
            feedback = Feedback.objects.select_related("system").prefetch_related(
                "status_logs__operator"
            ).get(tracking_id=tracking_id)
        except Feedback.DoesNotExist:
            return Response(
                {"detail": "Заявка не найдена"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response(FeedbackTrackSerializer(feedback).data)

    @action(detail=True, methods=["post"], url_path="update-status")
    def update_status(self, request, pk=None):
        feedback = self.get_object()
        serializer = FeedbackUpdateStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        comment = serializer.validated_data.get("comment", "")

        feedback.status = new_status
        feedback.save(update_fields=["status"])

        FeedbackStatusLog.objects.create(
            feedback=feedback,
            status=new_status,
            comment=comment,
            operator=request.user,
        )

        return Response(FeedbackDetailSerializer(feedback).data)

    @extend_schema(responses={200: FeedbackPublicIncidentSerializer(many=True)})
    @action(
        detail=False,
        methods=["get"],
        url_path="incidents",
        permission_classes=[AllowAny],
    )
    def incidents(self, request):
        qs = (
            Feedback.objects.filter(is_public=True)
            .select_related("system")
            .prefetch_related("status_logs__operator")
            .order_by("-created_at")[:50]
        )
        return Response(FeedbackPublicIncidentSerializer(qs, many=True).data)


class SystemViewSet(viewsets.ModelViewSet):
    queryset = System.objects.all()
    serializer_class = SystemSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ("public", "active_list"):
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "list":
            qs = qs.annotate(
                feedback_count=Count("feedbacks"),
                average_rating=Avg("feedbacks__rating"),
            )
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return SystemListSerializer
        if self.action in ("public", "active_list"):
            return SystemPublicSerializer
        return SystemSerializer

    @extend_schema(responses={200: SystemPublicSerializer(many=True)})
    @action(
        detail=False,
        methods=["get"],
        url_path="active",
        permission_classes=[AllowAny],
    )
    def active_list(self, request):
        qs = System.objects.filter(is_active=True).order_by("name")
        serializer = SystemPublicSerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(responses={200: SystemPublicSerializer})
    @action(
        detail=True,
        methods=["get"],
        url_path="public",
        permission_classes=[AllowAny],
    )
    def public(self, request, slug=None):
        system = self.get_object()
        serializer = SystemPublicSerializer(system)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="qr-code")
    def qr_code(self, request, slug=None):
        system = self.get_object()
        feedback_url = f"{settings.FRONTEND_URL}/feedback?system={system.slug}"

        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(feedback_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1a1a1a", back_color="white")

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        return Response(
            {
                "qr_code": f"data:image/png;base64,{qr_base64}",
                "url": feedback_url,
            }
        )

    @action(detail=True, methods=["get"], url_path="qr-code/download")
    def qr_code_download(self, request, slug=None):
        system = self.get_object()
        feedback_url = f"{settings.FRONTEND_URL}/feedback?system={system.slug}"

        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(feedback_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1a1a1a", back_color="white")

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        return FileResponse(
            buffer,
            as_attachment=True,
            filename=f"qr-{system.slug}.png",
        )
