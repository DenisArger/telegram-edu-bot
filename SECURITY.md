# Безопасность и защита секретов

## ⚠️ ВАЖНО: Защита переменных окружения

**НИКОГДА не коммитьте реальные токены и ключи в Git!**

## Что защищено в .gitignore

Следующие файлы автоматически игнорируются Git:

- `.env` - файл с реальными переменными окружения
- `node_modules/` - зависимости
- `*.log` - логи

## Файл .env.example

Файл `.env.example` содержит **только placeholder значения** и может быть закоммичен в репозиторий:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
```

## Что делать, если секреты попали в Git

### Если еще не было push на GitHub:

1. Удалите секреты из коммита:
```bash
git reset HEAD~1
# Исправьте файлы
git add .
git commit -m "Initial commit"
```

### Если уже был push:

1. Используйте `git filter-branch` или BFG Repo-Cleaner
2. Или создайте новый репозиторий без истории
3. **ОБЯЗАТЕЛЬНО** смените все токены, которые попали в историю!

## Настройка переменных окружения на платформе деплоя

На платформах (Railway, Render, Heroku) добавьте переменные окружения через интерфейс:

- `TELEGRAM_BOT_TOKEN` - токен от @BotFather
- `AIRTABLE_API_KEY` - Personal Access Token из Airtable
- `AIRTABLE_BASE_ID` - ID базы данных Airtable

**НЕ добавляйте их в код!**

## Проверка перед коммитом

Перед каждым коммитом проверьте:

```bash
# Проверить, что .env не добавлен
git status

# Проверить содержимое коммита
git diff --cached
```

## Если токены скомпрометированы

Если токены попали в публичный репозиторий:

1. **Немедленно** смените все токены:
   - Telegram Bot Token (через @BotFather)
   - Airtable Personal Access Token (в настройках Airtable)

2. Удалите старые токены из истории Git

3. Уведомите пользователей, если необходимо

