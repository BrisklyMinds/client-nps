import uuid

from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    modified_at = models.DateTimeField(_("modified at"), auto_now=True)

    class Meta:
        db_table = "users"
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self):
        return self.email if self.email else self.username


class System(models.Model):
    name = models.CharField(_("name"), max_length=255, unique=True)
    slug = models.SlugField(_("slug"), max_length=255, unique=True)
    description = models.TextField(_("description"), blank=True, default="")
    is_active = models.BooleanField(_("is active"), default=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    modified_at = models.DateTimeField(_("modified at"), auto_now=True)

    class Meta:
        db_table = "systems"
        verbose_name = _("system")
        verbose_name_plural = _("systems")
        ordering = ["name"]

    def __str__(self):
        return self.name


class FeedbackType(models.TextChoices):
    BUG = "bug", _("System Problem")
    REVIEW = "review", _("Review")
    SUGGESTION = "suggestion", _("Suggestion")
    OTHER = "other", _("Other")


class FeedbackStatus(models.TextChoices):
    NEW = "new", _("New")
    IN_PROGRESS = "in_progress", _("In Progress")
    RESOLVED = "resolved", _("Resolved")
    REJECTED = "rejected", _("Rejected")


class Feedback(models.Model):
    tracking_id = models.UUIDField(
        _("tracking ID"), default=uuid.uuid4, unique=True, editable=False
    )
    system = models.ForeignKey(
        System,
        on_delete=models.CASCADE,
        related_name="feedbacks",
        verbose_name=_("system"),
    )
    phone = models.CharField(_("phone number"), max_length=20)
    feedback_type = models.CharField(
        _("feedback type"),
        max_length=20,
        choices=FeedbackType.choices,
    )
    rating = models.PositiveSmallIntegerField(
        _("rating"),
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField(_("comment"))
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=FeedbackStatus.choices,
        default=FeedbackStatus.NEW,
    )
    is_public = models.BooleanField(
        _("show on status page"),
        default=False,
        help_text=_("If checked, this feedback will appear on the public status page"),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        db_table = "feedbacks"
        verbose_name = _("feedback")
        verbose_name_plural = _("feedbacks")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tracking_id} - {self.system.name} - {self.get_status_display()}"

    @property
    def short_id(self):
        return str(self.tracking_id)[:8].upper()


class FeedbackStatusLog(models.Model):
    feedback = models.ForeignKey(
        Feedback,
        on_delete=models.CASCADE,
        related_name="status_logs",
        verbose_name=_("feedback"),
    )
    status = models.CharField(
        _("status"), max_length=20, choices=FeedbackStatus.choices
    )
    comment = models.TextField(_("operator comment"), blank=True, default="")
    operator = models.ForeignKey(
        "User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("operator"),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        db_table = "feedback_status_logs"
        verbose_name = _("status log")
        verbose_name_plural = _("status logs")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.feedback.short_id} → {self.get_status_display()}"


def feedback_file_upload_path(instance, filename):
    return f"feedback/{instance.feedback.id}/{filename}"


class FeedbackFile(models.Model):
    feedback = models.ForeignKey(
        Feedback,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name=_("feedback"),
    )
    file = models.FileField(_("file"), upload_to=feedback_file_upload_path)
    original_name = models.CharField(_("original filename"), max_length=255)
    file_size = models.PositiveIntegerField(
        _("file size"), help_text=_("Size in bytes")
    )
    content_type = models.CharField(_("content type"), max_length=100)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        db_table = "feedback_files"
        verbose_name = _("feedback file")
        verbose_name_plural = _("feedback files")

    def __str__(self):
        return self.original_name
