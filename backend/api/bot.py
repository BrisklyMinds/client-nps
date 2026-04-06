import asyncio
import logging

from asgiref.sync import sync_to_async
from django.conf import settings
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

logger = logging.getLogger(__name__)

FEEDBACK_TYPE_EMOJI = {
    "bug": "\U0001f41b",
    "review": "\u2b50",
    "suggestion": "\U0001f4a1",
    "other": "\U0001f4dd",
}

FEEDBACK_TYPE_LABEL = {
    "bug": "Проблема",
    "review": "Отзыв",
    "suggestion": "Предложение",
    "other": "Другое",
}


def format_feedback_message(feedback) -> str:
    emoji = FEEDBACK_TYPE_EMOJI.get(feedback.feedback_type, "\U0001f4dd")
    label = FEEDBACK_TYPE_LABEL.get(feedback.feedback_type, feedback.feedback_type)

    lines = [
        f"\U0001f4cb <b>Новый отзыв — {feedback.system.name}</b>",
        f"Тип: {emoji} {label}",
        f"Телефон: {feedback.phone}",
    ]

    if feedback.rating:
        stars = "\u2b50" * feedback.rating + "\u2606" * (5 - feedback.rating)
        lines.append(f"Оценка: {stars}")

    files_count = feedback.files.count()
    if files_count:
        lines.append(f"\U0001f4ce Файлов: {files_count}")

    comment = feedback.comment
    if len(comment) > 500:
        comment = comment[:497] + "..."
    lines.append(f"\n\U0001f4ac {comment}")

    lines.append(f"\n\U0001f552 {feedback.created_at.strftime('%Y-%m-%d %H:%M')}")

    return "\n".join(lines)


def send_feedback_notification(feedback) -> None:
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID

    if not token or not chat_id:
        return

    text = format_feedback_message(feedback)

    try:
        bot = Bot(token=token)
        asyncio.run(bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML"))
    except RuntimeError:
        # Event loop already running (e.g. under ASGI)
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor() as pool:
            pool.submit(_send_sync, token, chat_id, text)
    except Exception:
        logger.exception("Failed to send Telegram notification for feedback %s", feedback.pk)


def _send_sync(token: str, chat_id: str, text: str) -> None:
    try:
        bot = Bot(token=token)
        asyncio.run(bot.send_message(chat_id=chat_id, text=text, parse_mode="HTML"))
    except Exception:
        logger.exception("Failed to send Telegram notification in thread")


# ======================================================================
# Bot handlers for DM interaction
# ======================================================================


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    from .models import System

    systems = await sync_to_async(list)(
        System.objects.filter(is_active=True).order_by("name")
    )

    if not systems:
        await update.message.reply_text(
            "\U0001f4cb Нет доступных систем для обратной связи."
        )
        return

    keyboard = [
        [InlineKeyboardButton(s.name, callback_data=f"system:{s.slug}")]
        for s in systems
    ]

    await update.message.reply_text(
        "\U0001f44b Здравствуйте! Я бот обратной связи КСВ.\n\n"
        "Выберите систему, чтобы оставить отзыв:",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )


async def system_selected_handler(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    query = update.callback_query
    await query.answer()

    data = query.data
    if not data or not data.startswith("system:"):
        return

    slug = data.split(":", 1)[1]

    from .models import System

    system = await sync_to_async(
        lambda: System.objects.filter(slug=slug, is_active=True).first()
    )()

    if not system:
        await query.edit_message_text("\u274c Система не найдена или неактивна.")
        return

    feedback_url = f"{settings.FRONTEND_URL}/feedback?system={slug}"

    await query.edit_message_text(
        f"\U0001f4cb <b>{system.name}</b>\n\n"
        f"Перейдите по ссылке для заполнения формы:\n"
        f'{feedback_url}',
        parse_mode="HTML",
    )


def create_bot_application() -> Application:
    application = Application.builder().token(settings.TELEGRAM_BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start_handler))
    application.add_handler(CallbackQueryHandler(system_selected_handler))
    return application
