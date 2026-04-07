import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Feedback

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Feedback)
def notify_telegram_on_feedback(sender, instance, created, **kwargs):
    if not created:
        return

    def _send():
        from .bot import send_feedback_notification

        try:
            send_feedback_notification(instance)
        except Exception:
            logger.exception(
                "Failed to send Telegram notification for feedback %s", instance.pk
            )

    transaction.on_commit(_send)
