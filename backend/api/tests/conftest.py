from pytest_factoryboy import register

from api.tests.factories import FeedbackFactory, SystemFactory, UserFactory
from api.tests.fixtures import *  # noqa: F403

register(UserFactory)
register(SystemFactory)
register(FeedbackFactory)
