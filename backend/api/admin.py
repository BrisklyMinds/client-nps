from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from unfold.admin import ModelAdmin, TabularInline
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import Feedback, FeedbackFile, System, User

admin.site.unregister(Group)


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


@admin.register(System)
class SystemAdmin(ModelAdmin):
    list_display = ["name", "slug", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


class FeedbackFileInline(TabularInline):
    model = FeedbackFile
    extra = 0
    readonly_fields = ["file", "original_name", "file_size", "content_type"]


@admin.register(Feedback)
class FeedbackAdmin(ModelAdmin):
    list_display = ["system", "phone", "feedback_type", "rating", "created_at"]
    list_filter = ["feedback_type", "rating", "system", "created_at"]
    search_fields = ["phone", "comment"]
    readonly_fields = ["created_at"]
    inlines = [FeedbackFileInline]
