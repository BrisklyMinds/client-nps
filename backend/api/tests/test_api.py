import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from api.models import Feedback, FeedbackFile, System


# ======================================================================
# User API (existing)
# ======================================================================


@pytest.mark.django_db
def test_api_users_me_unauthorized(client):
    response = client.get(reverse("api-users-me"))
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_api_users_me_authorized(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    response = api_client.get(reverse("api-users-me"))
    assert response.status_code == status.HTTP_200_OK


# ======================================================================
# System model
# ======================================================================


@pytest.mark.django_db
def test_system_str(system_factory):
    system = system_factory.create(name="Test System")
    assert str(system) == "Test System"


@pytest.mark.django_db
def test_system_slug_unique(system_factory):
    system_factory.create(slug="unique-slug")
    with pytest.raises(Exception):
        system_factory.create(slug="unique-slug")


# ======================================================================
# Feedback model
# ======================================================================


@pytest.mark.django_db
def test_feedback_str(feedback_factory):
    fb = feedback_factory.create()
    assert fb.system.name in str(fb)
    assert "New" in str(fb)


@pytest.mark.django_db
def test_feedback_ordering(feedback_factory, system_factory):
    system = system_factory.create()
    fb1 = feedback_factory.create(system=system, comment="First feedback comment here")
    fb2 = feedback_factory.create(system=system, comment="Second feedback comment here")
    feedbacks = list(Feedback.objects.all())
    assert feedbacks[0].pk == fb2.pk  # newest first


# ======================================================================
# Feedback API — Public Create (no auth)
# ======================================================================


@pytest.mark.django_db
def test_feedback_create_success(api_client, system_factory):
    system = system_factory.create(slug="test-sys")
    url = reverse("api-feedback-list")
    data = {
        "system_slug": "test-sys",
        "phone": "+996555000111",
        "feedback_type": "review",
        "rating": 5,
        "comment": "Great service, very happy!",
    }
    response = api_client.post(url, data, format="multipart")
    assert response.status_code == status.HTTP_201_CREATED
    assert Feedback.objects.count() == 1
    fb = Feedback.objects.first()
    assert fb.system == system
    assert fb.phone == "+996555000111"
    assert fb.rating == 5


@pytest.mark.django_db
def test_feedback_create_with_file(api_client, system_factory):
    system_factory.create(slug="file-sys")
    url = reverse("api-feedback-list")
    test_file = SimpleUploadedFile(
        "screenshot.png", b"fake-image-content", content_type="image/png"
    )
    data = {
        "system_slug": "file-sys",
        "phone": "+996555000222",
        "feedback_type": "bug",
        "comment": "Something is broken, see screenshot attached",
        "files": test_file,
    }
    response = api_client.post(url, data, format="multipart")
    assert response.status_code == status.HTTP_201_CREATED
    assert FeedbackFile.objects.count() == 1
    ff = FeedbackFile.objects.first()
    assert ff.original_name == "screenshot.png"
    assert ff.content_type == "image/png"


@pytest.mark.django_db
def test_feedback_create_review_requires_rating(api_client, system_factory):
    system_factory.create(slug="rating-sys")
    url = reverse("api-feedback-list")
    data = {
        "system_slug": "rating-sys",
        "phone": "+996555000333",
        "feedback_type": "review",
        "comment": "Forgot to add rating for this review",
    }
    response = api_client.post(url, data, format="multipart")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "rating" in response.data


@pytest.mark.django_db
def test_feedback_create_bug_ignores_rating(api_client, system_factory):
    system_factory.create(slug="bug-sys")
    url = reverse("api-feedback-list")
    data = {
        "system_slug": "bug-sys",
        "phone": "+996555000444",
        "feedback_type": "bug",
        "rating": 3,
        "comment": "Bug report with unnecessary rating field",
    }
    response = api_client.post(url, data, format="multipart")
    assert response.status_code == status.HTTP_201_CREATED
    fb = Feedback.objects.first()
    assert fb.rating is None  # rating cleared for non-review


@pytest.mark.django_db
def test_feedback_create_inactive_system_rejected(api_client, system_factory):
    system_factory.create(slug="inactive-sys", is_active=False)
    url = reverse("api-feedback-list")
    data = {
        "system_slug": "inactive-sys",
        "phone": "+996555000555",
        "feedback_type": "other",
        "comment": "Trying to submit to inactive system",
    }
    response = api_client.post(url, data, format="multipart")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


# ======================================================================
# Feedback API — List / Detail (auth required)
# ======================================================================


@pytest.mark.django_db
def test_feedback_list_unauthorized(api_client):
    url = reverse("api-feedback-list")
    response = api_client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_feedback_list_authorized(api_client, regular_user, feedback_factory):
    feedback_factory.create()
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-feedback-list")
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1


@pytest.mark.django_db
def test_feedback_detail_authorized(api_client, regular_user, feedback_factory):
    fb = feedback_factory.create()
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-feedback-detail", args=[fb.pk])
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["phone"] == fb.phone
    assert "files" in response.data
    assert "system" in response.data


@pytest.mark.django_db
def test_feedback_filter_by_type(api_client, regular_user, feedback_factory, system_factory):
    system = system_factory.create()
    feedback_factory.create(system=system, feedback_type="bug", rating=None, comment="Bug report test comment here")
    feedback_factory.create(system=system, feedback_type="review", comment="Review test comment here")
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-feedback-list")
    response = api_client.get(url, {"feedback_type": "bug"})
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["feedback_type"] == "bug"


# ======================================================================
# Feedback Stats
# ======================================================================


@pytest.mark.django_db
def test_feedback_stats(api_client, regular_user, feedback_factory, system_factory):
    system = system_factory.create()
    feedback_factory.create(system=system, feedback_type="review", rating=5, comment="Great feedback comment here")
    feedback_factory.create(system=system, feedback_type="bug", rating=None, comment="Bug feedback comment here too")
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-feedback-stats")
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["total_count"] == 2
    assert response.data["average_rating"] == 5.0
    assert "review" in response.data["by_type"]
    assert "bug" in response.data["by_type"]


# ======================================================================
# Feedback Export CSV
# ======================================================================


@pytest.mark.django_db
def test_feedback_export_csv(api_client, regular_user, feedback_factory):
    feedback_factory.create()
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-feedback-export-csv")
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response["Content-Type"] == "text/csv"
    content = response.content.decode("utf-8")
    assert "ID" in content
    assert "System" in content


# ======================================================================
# System API — CRUD (auth required)
# ======================================================================


@pytest.mark.django_db
def test_system_list_unauthorized(api_client):
    url = reverse("api-systems-list")
    response = api_client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_system_list_authorized(api_client, regular_user, system_factory):
    system_factory.create()
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-systems-list")
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_system_create(api_client, regular_user):
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-systems-list")
    data = {"name": "New System", "slug": "new-system", "description": "Desc"}
    response = api_client.post(url, data)
    assert response.status_code == status.HTTP_201_CREATED
    assert System.objects.filter(slug="new-system").exists()


@pytest.mark.django_db
def test_system_update(api_client, regular_user, system_factory):
    system = system_factory.create(slug="edit-me")
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-systems-detail", args=["edit-me"])
    response = api_client.patch(url, {"name": "Updated Name"})
    assert response.status_code == status.HTTP_200_OK
    system.refresh_from_db()
    assert system.name == "Updated Name"


@pytest.mark.django_db
def test_system_delete(api_client, regular_user, system_factory):
    system_factory.create(slug="delete-me")
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-systems-detail", args=["delete-me"])
    response = api_client.delete(url)
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not System.objects.filter(slug="delete-me").exists()


# ======================================================================
# System Public Endpoint (no auth)
# ======================================================================


@pytest.mark.django_db
def test_system_public(api_client, system_factory):
    system_factory.create(name="Public System", slug="pub-sys")
    url = reverse("api-systems-public", args=["pub-sys"])
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["name"] == "Public System"
    assert response.data["slug"] == "pub-sys"


# ======================================================================
# System QR Code
# ======================================================================


@pytest.mark.django_db
def test_system_qr_code(api_client, regular_user, system_factory):
    system_factory.create(slug="qr-sys")
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-systems-qr-code", args=["qr-sys"])
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert "qr_code" in response.data
    assert response.data["qr_code"].startswith("data:image/png;base64,")
    assert "url" in response.data
    assert "qr-sys" in response.data["url"]


@pytest.mark.django_db
def test_system_qr_code_download(api_client, regular_user, system_factory):
    system_factory.create(slug="dl-sys")
    api_client.force_authenticate(user=regular_user)
    url = reverse("api-systems-qr-code-download", args=["dl-sys"])
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert "attachment" in response.get("Content-Disposition", "")
