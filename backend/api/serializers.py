from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions, serializers

from .models import Feedback, FeedbackFile, FeedbackStatusLog, FeedbackType, System

User = get_user_model()


class UserCurrentSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "first_name", "last_name"]


class UserCurrentErrorSerializer(serializers.Serializer):
    username = serializers.ListSerializer(child=serializers.CharField(), required=False)
    first_name = serializers.ListSerializer(
        child=serializers.CharField(), required=False
    )
    last_name = serializers.ListSerializer(
        child=serializers.CharField(), required=False
    )


class UserChangePasswordSerializer(serializers.ModelSerializer):
    password = serializers.CharField(style={"input_type": "password"}, write_only=True)
    password_new = serializers.CharField(style={"input_type": "password"})
    password_retype = serializers.CharField(
        style={"input_type": "password"}, write_only=True
    )

    default_error_messages = {
        "password_mismatch": _("Current password is not matching"),
        "password_invalid": _("Password does not meet all requirements"),
        "password_same": _("Both new and current passwords are same"),
    }

    class Meta:
        model = User
        fields = ["password", "password_new", "password_retype"]

    def validate(self, attrs):
        request = self.context.get("request", None)

        if not request.user.check_password(attrs["password"]):
            raise serializers.ValidationError(
                {"password": self.default_error_messages["password_mismatch"]}
            )

        try:
            validate_password(attrs["password_new"])
        except ValidationError as e:
            raise exceptions.ValidationError({"password_new": list(e.messages)}) from e

        if attrs["password_new"] != attrs["password_retype"]:
            raise serializers.ValidationError(
                {"password_retype": self.default_error_messages["password_invalid"]}
            )

        if attrs["password_new"] == attrs["password"]:
            raise serializers.ValidationError(
                {"password_new": self.default_error_messages["password_same"]}
            )
        return super().validate(attrs)


class UserChangePasswordErrorSerializer(serializers.Serializer):
    password = serializers.ListSerializer(child=serializers.CharField(), required=False)
    password_new = serializers.ListSerializer(
        child=serializers.CharField(), required=False
    )
    password_retype = serializers.ListSerializer(
        child=serializers.CharField(), required=False
    )


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(style={"input_type": "password"}, write_only=True)
    password_retype = serializers.CharField(
        style={"input_type": "password"}, write_only=True
    )

    default_error_messages = {
        "password_mismatch": _("Password are not matching."),
        "password_invalid": _("Password does not meet all requirements."),
    }

    class Meta:
        model = User
        fields = ["username", "password", "password_retype"]

    def validate(self, attrs):
        password_retype = attrs.pop("password_retype")

        try:
            validate_password(attrs.get("password"))
        except exceptions.ValidationError:
            self.fail("password_invalid")

        if attrs["password"] == password_retype:
            return attrs

        return self.fail("password_mismatch")

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(**validated_data)

            # By default newly registered accounts are inactive.
            user.is_active = False
            user.save(update_fields=["is_active"])

        return user


class UserCreateErrorSerializer(serializers.Serializer):
    username = serializers.ListSerializer(child=serializers.CharField(), required=False)
    password = serializers.ListSerializer(child=serializers.CharField(), required=False)
    password_retype = serializers.ListSerializer(
        child=serializers.CharField(), required=False
    )


######################################################################
# System serializers
######################################################################


class SystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = System
        fields = ["id", "name", "slug", "description", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class SystemListSerializer(serializers.ModelSerializer):
    feedback_count = serializers.IntegerField(read_only=True)
    average_rating = serializers.FloatField(read_only=True, allow_null=True)

    class Meta:
        model = System
        fields = ["id", "name", "slug", "feedback_count", "average_rating"]


class SystemPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = System
        fields = ["name", "slug"]


######################################################################
# Feedback serializers
######################################################################


class FeedbackFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackFile
        fields = ["id", "file", "original_name", "file_size", "content_type"]
        read_only_fields = ["id"]


class FeedbackCreateSerializer(serializers.ModelSerializer):
    system_slug = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=System.objects.filter(is_active=True),
        source="system",
    )
    files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Feedback
        fields = ["tracking_id", "system_slug", "phone", "feedback_type", "rating", "comment", "files"]
        read_only_fields = ["tracking_id"]
        extra_kwargs = {
            "phone": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        fb_type = attrs.get("feedback_type")
        if fb_type == FeedbackType.REVIEW and not attrs.get("rating"):
            raise serializers.ValidationError(
                {"rating": _("Rating is required for reviews.")}
            )
        if fb_type != FeedbackType.REVIEW:
            attrs["rating"] = None
        if fb_type != FeedbackType.CORRUPTION and not attrs.get("phone"):
            raise serializers.ValidationError(
                {"phone": _("Phone number is required.")}
            )
        if fb_type == FeedbackType.CORRUPTION:
            attrs["phone"] = ""
        return attrs

    def create(self, validated_data):
        files_data = validated_data.pop("files", [])
        with transaction.atomic():
            feedback = Feedback.objects.create(**validated_data)
            for f in files_data:
                FeedbackFile.objects.create(
                    feedback=feedback,
                    file=f,
                    original_name=f.name,
                    file_size=f.size,
                    content_type=f.content_type or "application/octet-stream",
                )
        return feedback


class FeedbackCreateErrorSerializer(serializers.Serializer):
    system_slug = serializers.ListSerializer(
        child=serializers.CharField(), required=False
    )
    phone = serializers.ListSerializer(child=serializers.CharField(), required=False)
    feedback_type = serializers.ListSerializer(
        child=serializers.CharField(), required=False
    )
    rating = serializers.ListSerializer(child=serializers.CharField(), required=False)
    comment = serializers.ListSerializer(child=serializers.CharField(), required=False)
    files = serializers.ListSerializer(child=serializers.CharField(), required=False)


class FeedbackStatusLogSerializer(serializers.ModelSerializer):
    operator_name = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackStatusLog
        fields = ["id", "status", "comment", "operator_name", "created_at"]

    def get_operator_name(self, obj):
        if obj.operator:
            return obj.operator.get_full_name() or obj.operator.username
        return None


class FeedbackDetailSerializer(serializers.ModelSerializer):
    system = SystemSerializer(read_only=True)
    files = FeedbackFileSerializer(many=True, read_only=True)
    status_logs = FeedbackStatusLogSerializer(many=True, read_only=True)
    short_id = serializers.CharField(read_only=True)

    class Meta:
        model = Feedback
        fields = [
            "id",
            "tracking_id",
            "short_id",
            "system",
            "phone",
            "feedback_type",
            "rating",
            "comment",
            "status",
            "is_public",
            "files",
            "status_logs",
            "created_at",
        ]


class FeedbackListSerializer(serializers.ModelSerializer):
    system_name = serializers.CharField(source="system.name", read_only=True)
    files_count = serializers.IntegerField(source="files.count", read_only=True)
    short_id = serializers.CharField(read_only=True)

    class Meta:
        model = Feedback
        fields = [
            "id",
            "tracking_id",
            "short_id",
            "system_name",
            "phone",
            "feedback_type",
            "rating",
            "comment",
            "status",
            "files_count",
            "created_at",
        ]


class FeedbackStatsSerializer(serializers.Serializer):
    total_count = serializers.IntegerField()
    average_rating = serializers.FloatField(allow_null=True)
    by_type = serializers.DictField(child=serializers.IntegerField())
    by_system = serializers.ListField(child=serializers.DictField())


class FeedbackUpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["new", "in_progress", "resolved", "rejected"])
    comment = serializers.CharField(required=False, default="")


class FeedbackTrackSerializer(serializers.ModelSerializer):
    system_name = serializers.CharField(source="system.name", read_only=True)
    status_logs = FeedbackStatusLogSerializer(many=True, read_only=True)
    short_id = serializers.CharField(read_only=True)

    class Meta:
        model = Feedback
        fields = [
            "tracking_id",
            "short_id",
            "system_name",
            "feedback_type",
            "status",
            "status_logs",
            "created_at",
        ]


class FeedbackPublicIncidentSerializer(serializers.ModelSerializer):
    system_name = serializers.CharField(source="system.name", read_only=True)
    status_logs = FeedbackStatusLogSerializer(many=True, read_only=True)
    short_id = serializers.CharField(read_only=True)

    class Meta:
        model = Feedback
        fields = [
            "short_id",
            "system_name",
            "feedback_type",
            "comment",
            "status",
            "status_logs",
            "created_at",
        ]
