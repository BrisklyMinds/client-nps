# Client NPS — Система отзывов и обратной связи от клиентов

## Context

Нужно построить систему сбора обратной связи от клиентов. Клиент сканирует QR-код (привязанный к конкретной системе/продукту), попадает на форму и оставляет отзыв: телефон, тип обращения, звёзды (для отзывов), комментарий, прикреплённые файлы. Админ видит все отзывы, статистику, управляет системами и QR-кодами.

Проект уже содержит fullstack-шаблон из unfoldadmin/turbo (Django 5.1 + Next.js 16 + PostgreSQL 17). Брендинг берётся из `KSW_branding/` (цвет `#50beaf`, шрифт Intro, логотипы SVG).

---

## Фаза 1: Backend — Модели и миграции

### Файл: `backend/api/models.py`

Добавить 3 модели к существующему `User`:

**System** — системы/продукты, к которым привязан QR:
- `name` (CharField, unique) — название системы
- `slug` (SlugField, unique) — для URL в QR-коде
- `description` (TextField, blank) — описание
- `is_active` (BooleanField, default=True)
- `created_at`, `modified_at` (auto timestamps)

**Feedback** — отзыв от клиента:
- `system` (FK → System, CASCADE)
- `phone` (CharField, max_length=20) — номер телефона
- `feedback_type` (CharField, choices: bug/review/suggestion/other)
- `rating` (PositiveSmallIntegerField, null=True, 1-5) — только для type=review
- `comment` (TextField) — текст отзыва
- `created_at` (auto)

**FeedbackFile** — прикреплённые файлы:
- `feedback` (FK → Feedback, CASCADE)
- `file` (FileField, upload_to=`feedback/{feedback_id}/`)
- `original_name` (CharField) — исходное имя файла
- `file_size` (PositiveIntegerField) — размер в байтах
- `content_type` (CharField) — MIME тип
- `created_at` (auto)

Запустить: `python manage.py makemigrations && python manage.py migrate`

---

## Фаза 2: Backend — Settings, зависимости

### Файл: `backend/api/settings.py`
- Добавить `MEDIA_URL = "media/"` и `MEDIA_ROOT = BASE_DIR / "media"`
- Добавить `corsheaders` в INSTALLED_APPS + middleware
- Добавить `FRONTEND_URL = environ.get("FRONTEND_URL", "http://localhost:3000")`
- Настроить `DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024`
- Добавить `MultiPartParser`, `FormParser` в REST_FRAMEWORK parsers

### Файл: `backend/pyproject.toml`
- Добавить: `django-cors-headers>=4.0`, `qrcode[pil]>=7.4`

### Файл: `backend/api/urls.py`
- Добавить media serving в dev mode
- Зарегистрировать новые ViewSet'ы в router

### Файл: `docker-compose.yaml`
- Добавить volume `media_data:/app/media` к сервису `api`

---

## Фаза 3: Backend — Сериализаторы

### Файл: `backend/api/serializers.py`

Добавить (следуя существующему паттерну data + error сериализаторов):

- `SystemSerializer` — полный CRUD (id, name, slug, description, is_active)
- `SystemListSerializer` — лёгкий для списков (+ feedback_count, average_rating)
- `FeedbackFileSerializer` — вложенные файлы (id, file URL, original_name, size, content_type)
- `FeedbackCreateSerializer` — публичная форма:
  - `system_slug` (SlugRelatedField) — резолвит System по slug
  - `files` (ListField of FileField, write_only)
  - `validate()` — rating обязателен только для type=review
  - `create()` — в транзакции создаёт Feedback + FeedbackFile для каждого файла
- `FeedbackCreateErrorSerializer` — ошибки формы (по полям)
- `FeedbackDetailSerializer` — для админа (вложенные system + files)
- `FeedbackListSerializer` — для списка (system_name, files_count)
- `FeedbackStatsSerializer` — статистика дашборда

---

## Фаза 4: Backend — API Views

### Файл: `backend/api/api.py`

**FeedbackViewSet** (Create + List + Retrieve):
- `create` — AllowAny (публичная форма), multipart/form-data
- `list` — IsAuthenticated, фильтры (system, type, rating, дата)
- `retrieve` — IsAuthenticated, с вложенными файлами
- `stats` action — GET `/api/feedback/stats/` (общее кол-во, средний рейтинг, по типам, по системам, тренд 30 дней)
- `export_csv` action — GET `/api/feedback/export/` (CSV выгрузка)

**SystemViewSet** (полный ModelViewSet):
- CRUD — IsAuthenticated
- `retrieve_by_slug` action — AllowAny (публичный, для формы)
- `qr_code` action — GET `/api/systems/{slug}/qr-code/` (base64 PNG)
- `qr_code_download` action — GET `/api/systems/{slug}/qr-code/download/` (файл PNG)
- QR кодирует URL: `{FRONTEND_URL}/feedback?system={slug}`

### Файл: `backend/api/admin.py`

- `SystemAdmin` — list_display, prepopulated_fields для slug
- `FeedbackAdmin` — list_display, list_filter, inlines=[FeedbackFileInline]
- `FeedbackFileInline` — TabularInline, readonly

---

## Фаза 5: Frontend — Брендинг

### Шрифт
- Скопировать `KSW_branding/SW_Font/intro_regular.ttf`, `intro_bold.ttf` → `frontend/apps/web/public/fonts/`
- Подключить через `next/font/local` в layout

### Цвета — обновить CSS-переменные
### Файл: `frontend/packages/ui/styles/globals.css`

Заменить `:root` переменные на KSW-брендинг:
```
--primary: 170 42% 53%       /* #50beaf */
--primary-foreground: 0 0% 100%
--background: 210 20% 97%    /* #f4f6f8 */
--foreground: 0 0% 10%       /* #1a1a1a */
```

### Логотип
- Выбрать подходящий SVG из `KSW_branding/SW_LOGO/SW_LOGO_RGB/SVG/`
- Скопировать в `frontend/apps/web/public/logo.svg`

---

## Фаза 6: Frontend — Новые UI-компоненты

### Файл: `frontend/packages/ui/forms/star-rating.tsx`
- 5 кликабельных звёзд (SVG)
- Hover-preview, заполнение цветом `#50beaf`
- Touch-friendly (min 44px tap target)
- Интеграция через react-hook-form `Controller`

### Файл: `frontend/packages/ui/forms/file-upload.tsx`
- Drop-зона с пунктирной рамкой
- 3 способа добавления: клик (browse), drag & drop, Ctrl+V (paste)
- Поддержка множественных файлов
- Превью миниатюр (images) или иконка файла (остальные)
- Кнопка удаления (X) на каждом файле
- Валидация: макс 5 МБ на файл, макс 10 файлов
- Допустимые типы: image/*, PDF, DOC/DOCX, XLS/XLSX

### Файл: `frontend/packages/ui/forms/textarea-field.tsx`
- По паттерну TextField, но `<textarea>` с параметром `rows`

### Файл: `frontend/packages/ui/forms/radio-group.tsx`
- Стилизованные radio-кнопки / segmented control
- Для выбора типа обращения
- Mobile-friendly

---

## Фаза 7: Frontend — Публичная форма обратной связи

### Route: `frontend/apps/web/app/(feedback)/layout.tsx`
- Отдельная route group без auth
- Брендированный layout: логотип сверху, фон #f4f6f8, max-w-md, mobile-first

### Route: `frontend/apps/web/app/(feedback)/feedback/page.tsx`
- Server component, читает `?system=` из searchParams
- Запрашивает имя системы через публичный API
- Рендерит `<FeedbackForm systemSlug={slug} systemName={name} />`

### Route: `frontend/apps/web/app/(feedback)/feedback/success/page.tsx`
- Страница "Спасибо!" с галочкой и сообщением

### Файл: `frontend/apps/web/lib/validation.ts` — добавить:
```typescript
feedbackFormSchema = z.object({
  systemSlug: z.string().min(1),
  phone: z.string().min(7).max(20).regex(/^\+?[\d\s\-()]+$/),
  feedbackType: z.enum(["bug", "review", "suggestion", "other"]),
  rating: z.number().min(1).max(5).optional().nullable(),
  comment: z.string().min(10),
}).refine(
  (d) => d.feedbackType !== "review" || (d.rating != null && d.rating >= 1),
  { message: "Оценка обязательна для отзывов", path: ["rating"] }
)
```

### Файл: `frontend/apps/web/actions/feedback-action.ts`
- Server action, принимает FormData (из-за файлов)
- POST на `/api/feedback/` через `fetch` с multipart/form-data
- Возвращает `true | FeedbackCreateError`

### Файл: `frontend/apps/web/components/forms/feedback-form.tsx`
- `"use client"` component
- react-hook-form + zodResolver
- Поля:
  1. Система (read-only, отображение названия)
  2. Телефон (TextField, type=tel, placeholder "+996 XXX XXX XXX")
  3. Тип обращения (RadioGroup: Проблема / Отзыв / Предложение / Другое)
  4. Звёзды (StarRating, показывается только при type=review)
  5. Комментарий (TextAreaField, rows=4)
  6. Файлы (FileUpload)
  7. Кнопка отправки (SubmitField)
- На submit: собирает FormData, вызывает feedbackAction
- Успех → redirect на /feedback/success

---

## Фаза 8: Frontend — Админ-панель

### Routes (все под `(account)` с auth guard):

**Дашборд**: `app/(account)/admin/dashboard/page.tsx`
- Карточки: всего отзывов, средний рейтинг, по типам
- Список по системам с кол-вом и средним рейтингом
- Тренд за 30 дней

**Список отзывов**: `app/(account)/admin/feedback/page.tsx`
- Таблица с пагинацией
- Фильтры: система, тип, рейтинг, период
- Кнопка экспорта CSV

**Деталь отзыва**: `app/(account)/admin/feedback/[id]/page.tsx`
- Все поля + прикреплённые файлы (превью/скачивание)

**Системы**: `app/(account)/admin/systems/page.tsx`
- Список систем с feedback_count, average_rating
- CRUD: создание/редактирование/деактивация

**Деталь системы**: `app/(account)/admin/systems/[slug]/page.tsx`
- Форма редактирования
- QR-код (img + кнопка скачивания + копировать ссылку)

---

## Фаза 9: Типы API (openapi-typescript-codegen)

После реализации бэкенда:
1. Запустить Django и сгенерировать OpenAPI schema
2. Запустить codegen для обновления `frontend/packages/types/api/`
3. Новые типы: `System`, `Feedback`, `FeedbackFile`, `FeedbackCreate`, `FeedbackCreateError`, `FeedbackStats`
4. Новые сервисы: `FeedbackService`, `SystemsService`

---

## Порядок реализации

1. **Backend модели + миграции** (Фаза 1)
2. **Backend settings + зависимости** (Фаза 2)
3. **Backend сериализаторы** (Фаза 3)
4. **Backend views + URLs + admin** (Фаза 4)
5. **Брендинг** (Фаза 5)
6. **UI-компоненты** (Фаза 6)
7. **Публичная форма** (Фаза 7)
8. **Админ-панель** (Фаза 8)
9. **API-типы codegen** (Фаза 9)

---

## Ключевые файлы для модификации

| Файл | Действие |
|------|----------|
| `backend/api/models.py` | Добавить System, Feedback, FeedbackFile |
| `backend/api/serializers.py` | Добавить 8 сериализаторов |
| `backend/api/api.py` | Добавить FeedbackViewSet, SystemViewSet |
| `backend/api/urls.py` | Зарегистрировать новые ViewSet'ы |
| `backend/api/admin.py` | Зарегистрировать модели в Unfold admin |
| `backend/api/settings.py` | Media, CORS, parsers |
| `backend/pyproject.toml` | Новые зависимости |
| `docker-compose.yaml` | Media volume |
| `frontend/packages/ui/styles/globals.css` | KSW цвета |
| `frontend/packages/ui/forms/` | 4 новых компонента |
| `frontend/apps/web/lib/validation.ts` | feedbackFormSchema |
| `frontend/apps/web/actions/feedback-action.ts` | Новый server action |
| `frontend/apps/web/components/forms/feedback-form.tsx` | Форма обратной связи |
| `frontend/apps/web/app/(feedback)/` | Публичные страницы |
| `frontend/apps/web/app/(account)/admin/` | Админ-страницы |

---

## Переиспользуемые паттерны

- `fieldApiError()` из `frontend/apps/web/lib/forms.ts` — маппинг ошибок API → форма
- `getApiClient()` из `frontend/apps/web/lib/api.ts` — инициализация API-клиента
- `cn()` из `frontend/packages/ui/lib/utils.ts` — merge tailwind классов
- Server action паттерн из `frontend/apps/web/actions/register-action.ts`
- Serializer + error serializer паттерн из `backend/api/serializers.py`
- ViewSet + @action паттерн из `backend/api/api.py`

---

## Верификация

1. **Backend**: `python manage.py test` — тесты API (создание feedback, фильтры, QR)
2. **Frontend**: `pnpm --filter web dev` — запуск dev-сервера
3. **E2E**: Docker Compose up → открыть `/feedback?system=test-system` → заполнить форму → проверить в `/admin/`
4. **Адаптивность**: проверить на мобильных viewports (375px, 768px, 1024px)
5. **Файлы**: drag & drop, paste, browse — все 3 способа
6. **QR**: GET `/api/systems/{slug}/qr-code/` → отсканировать → попасть на форму
