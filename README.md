# Telegram Bot для школьных уроков

Telegram-бот для выдачи заданий по школьным предметам с интеграцией Airtable.

## Краткое описание

Бот предназначен для учеников и работает исключительно через Telegram. Учитель управляет данными через Airtable без необходимости работы с кодом.

## Быстрый старт

1. Установите зависимости:
```bash
yarn install
```

2. Создайте файл `.env` и заполните переменные окружения:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id
```

3. Запустите бота:
```bash
yarn start
```

## Полная документация

Вся подробная документация находится в каталоге [`.memory-bank`](.memory-bank/):

- **[project-overview.md](.memory-bank/project-overview.md)** - Общий обзор проекта, возможности, технологический стек
- **[architecture.md](.memory-bank/architecture.md)** - Архитектура проекта, модульная структура, потоки данных
- **[code-structure.md](.memory-bank/code-structure.md)** - Детальная структура кода, описание функций
- **[setup-and-deployment.md](.memory-bank/setup-and-deployment.md)** - Настройка и деплой на различные платформы
- **[documentation-index.md](.memory-bank/documentation-index.md)** - Индекс всей документации проекта

## Основные команды

- `/start` - Главное меню
- `/register` - Регистрация нового ученика

## Технологии

- Node.js ≥ 18
- node-telegram-bot-api
- Airtable API
- ES Modules

## Лицензия

ISC
