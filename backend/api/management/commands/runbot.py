import logging

from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Start the Telegram bot with long-polling"

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            self.stderr.write(
                self.style.ERROR("TELEGRAM_BOT_TOKEN is not set. Cannot start bot.")
            )
            return

        from api.bot import create_bot_application

        self.stdout.write(self.style.SUCCESS("Starting Telegram bot..."))
        application = create_bot_application()
        application.run_polling(drop_pending_updates=True)
