# Настройка Git для проекта

## Шаг 1: Инициализация Git репозитория

Выполните в терминале:

```bash
cd telegram-rus-bot
git init
```

## Шаг 2: Добавьте файлы в репозиторий

```bash
git add .
```

## Шаг 3: Создайте первый коммит

```bash
git commit -m "Initial commit: Telegram bot for Russian language lessons"
```

## Шаг 4: Создайте репозиторий на GitHub

1. Откройте [GitHub](https://github.com)
2. Нажмите "New repository"
3. Введите название (например: `telegram-rus-bot`)
4. Выберите "Private" или "Public"
5. **НЕ** добавляйте README, .gitignore или лицензию (они уже есть)
6. Нажмите "Create repository"

## Шаг 5: Подключите локальный репозиторий к GitHub

GitHub покажет команды. Выполните:

```bash
git remote add origin https://github.com/ваш-username/telegram-rus-bot.git
git branch -M main
git push -u origin main
```

Если используете SSH:

```bash
git remote add origin git@github.com:ваш-username/telegram-rus-bot.git
git branch -M main
git push -u origin main
```

## Шаг 6: Проверьте .gitignore

Убедитесь, что файл `.gitignore` содержит:

```
.env
node_modules/
*.log
.DS_Store
```

**ВАЖНО:** Никогда не коммитьте файл `.env` с реальными токенами!

## Шаг 7: После деплоя на платформу

После того как репозиторий на GitHub, вы можете:

1. **Railway:**
   - Создать проект
   - Выбрать "Deploy from GitHub repo"
   - Выбрать ваш репозиторий

2. **Render:**
   - Создать Web Service
   - Connect your repository
   - Выбрать ваш репозиторий

3. **Heroku:**
   - `heroku create your-bot-name`
   - `git push heroku main`

## Полезные команды Git

```bash
# Проверить статус
git status

# Добавить изменения
git add .

# Создать коммит
git commit -m "Описание изменений"

# Отправить на GitHub
git push

# Посмотреть историю
git log

# Создать новую ветку
git checkout -b feature-name
```

## Если нужно обновить код на сервере

После изменений в коде:

```bash
git add .
git commit -m "Описание изменений"
git push
```

Платформа автоматически перезапустит бота с новым кодом.

