from django.contrib.auth import get_user_model
from factory import Sequence, SubFactory
from factory.django import DjangoModelFactory

from api.models import Feedback, System


class UserFactory(DjangoModelFactory):
    username = "sample@example.com"
    email = "sample@example.com"

    class Meta:
        model = get_user_model()


class SystemFactory(DjangoModelFactory):
    name = Sequence(lambda n: f"System {n}")
    slug = Sequence(lambda n: f"system-{n}")
    description = "Test system"
    is_active = True

    class Meta:
        model = System


class FeedbackFactory(DjangoModelFactory):
    system = SubFactory(SystemFactory)
    phone = "+996555123456"
    feedback_type = "review"
    rating = 4
    comment = "This is a test feedback with enough characters"

    class Meta:
        model = Feedback
