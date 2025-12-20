# Руководство по настройке и деплою

## Локальная настройка

### 1. Требования

- Node.js ≥ 18
- Yarn (рекомендуется) или npm
- Telegram Bot Token (получить у [@BotFather](https://t.me/BotFather))
- Airtable аккаунт с базой данных

### 2. Установка зависимостей

```bash
cd telegram-edu-bot
yarn install
```

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
```

**Где получить**:
- `TELEGRAM_BOT_TOKEN`: Создайте бота через [@BotFather](https://t.me/BotFather) в Telegram
- `AIRTABLE_API_KEY`: Создайте Personal Access Token в Airtable (см. SETUP_AIRTABLE.md)
- `AIRTABLE_BASE_ID`: ID вашей базы данных Airtable (находится в URL базы)

### 4. Настройка Airtable

#### Структура таблиц:

**Таблица "Ученики"**:
- `Telegram ID` (Number) - обязательное
- `Текущий урок` (Link to "Уроки") - обязательное
- `Класс` (Text или Number) - опционально, для фильтрации заданий

**Таблица "Уроки"**:
- `Название` или `Имя` (Single line text) - название урока

**Таблица "Задания"**:
- `Активно` (Checkbox) - активность задания
- `Урок` (Link to "Уроки") - связь с уроком
- `Текст задания` (Single line text) - текст задания
- `Правильные ответы` (Long text) - правильные ответы (каждый с новой строки)
- `Комментарий (верно)` (Single line text) - комментарий при правильном ответе
- `Комментарий (ошибка)` (Single line text) - комментарий при неправильном ответе
- `order` или `Порядок` (Number) - порядок (не используется, задания перемешиваются)
- `Класс` (Text или Number) - опционально, для фильтрации заданий

**Таблица "Прогресс"**:
- `Ученик` (Link to "Ученики") - связь с учеником
- `Задание` (Link to "Задания") - связь с заданием
- `Ответ ученика` (Single line text) - ответ ученика
- `Верно` (Checkbox) - правильность ответа

Подробнее см. SETUP_AIRTABLE.md

### 5. Запуск локально

```bash
yarn start
```

Или:

```bash
node src/bot.js
```

### 6. Проверка работы

1. Запустите тестовый скрипт для проверки Airtable:
```bash
node src/test-airtable.js
```

2. Откройте бота в Telegram и отправьте `/start`
3. Зарегистрируйтесь через `/register`
4. Начните урок

## Деплой на платформу

### Railway (рекомендуется) ⭐

**Преимущества**:
- Бесплатный тарифный план
- Простая настройка
- Автоматический деплой из GitHub
- Поддержка Node.js из коробки

**Шаги**:

1. Зарегистрируйтесь на [Railway](https://railway.app)
2. Создайте новый проект:
   - Нажмите "New Project"
   - Выберите "Deploy from GitHub repo"
   - Выберите ваш репозиторий
3. Настройте переменные окружения в настройках проекта:
   - `TELEGRAM_BOT_TOKEN`
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`
4. Railway автоматически определит Node.js проект и запустит его
5. Убедитесь, что `Procfile` содержит: `web: node src/bot.js`

### Render

**Шаги**:

1. Зарегистрируйтесь на [Render](https://render.com)
2. Создайте новый Web Service:
   - Connect your repository
   - Выберите ваш репозиторий
   - Build Command: `yarn install`
   - Start Command: `yarn start`
3. Добавьте переменные окружения в разделе Environment
4. Render автоматически запустит бота

### Heroku

**Шаги**:

1. Установите Heroku CLI:
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

2. Войдите в Heroku:
```bash
heroku login
```

3. Создайте приложение:
```bash
heroku create your-bot-name
```

4. Добавьте переменные окружения:
```bash
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set AIRTABLE_API_KEY=your_key
heroku config:set AIRTABLE_BASE_ID=your_base_id
```

5. Деплой:
```bash
git push heroku main
```

6. Убедитесь, что бот запущен:
```bash
heroku ps:scale web=1
```

### VPS (DigitalOcean, AWS, etc.)

**Шаги**:

1. Создайте VPS сервер (Ubuntu 20.04+)
2. Подключитесь по SSH
3. Установите Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. Установите yarn:
```bash
npm install -g yarn
```

5. Клонируйте репозиторий:
```bash
git clone your-repo-url
cd telegram-edu-bot
```

6. Установите зависимости:
```bash
yarn install
```

7. Создайте файл `.env`:
```bash
nano .env
# Добавьте переменные окружения
```

8. Установите PM2 для управления процессом:
```bash
npm install -g pm2
```

9. Запустите бота:
```bash
pm2 start src/bot.js --name telegram-bot
pm2 save
pm2 startup
```

## Подготовка проекта для деплоя

### 1. Procfile

Создайте файл `Procfile` в корне проекта:

```
web: node src/bot.js
```

### 2. package.json

Убедитесь, что в `package.json` есть скрипт start:

```json
{
  "scripts": {
    "start": "node src/bot.js"
  }
}
```

### 3. .gitignore

Убедитесь, что `.gitignore` содержит:

```
.env
node_modules/
*.log
.DS_Store
```

**ВАЖНО**: Никогда не коммитьте файл `.env` с реальными токенами!

### 4. .env.example

Создайте файл `.env.example` с placeholder значениями:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here
```

Этот файл можно коммитить в репозиторий.

## Проверка после деплоя

1. Проверьте логи на платформе деплоя
2. Откройте бота в Telegram
3. Отправьте `/start`
4. Проверьте, что бот отвечает
5. Зарегистрируйтесь и начните урок

## Решение проблем

### Бот не отвечает

1. Проверьте логи на платформе деплоя
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что бот запущен (не в спящем режиме)
4. Проверьте токен Telegram бота

### Ошибки подключения к Airtable

1. Проверьте `AIRTABLE_API_KEY` - должен быть Personal Access Token (начинается с `pat`)
2. Проверьте `AIRTABLE_BASE_ID` - должен быть правильный ID базы
3. Проверьте права доступа токена (scopes: `data.records:read`, `data.records:write`)
4. Проверьте, что база данных доступна

### Ошибки при регистрации

1. Проверьте структуру таблиц в Airtable
2. Убедитесь, что таблица "Уроки" содержит хотя бы один урок
3. Проверьте права доступа токена на создание записей

### Конфликт при запуске (409)

Если видите ошибку 409 - другой экземпляр бота уже запущен:
1. Остановите все экземпляры бота
2. Подождите несколько секунд
3. Запустите бота снова

## Мониторинг

### Логи

- Railway: автоматические логи в интерфейсе
- Render: логи в разделе Logs
- Heroku: `heroku logs --tail`
- VPS: `pm2 logs telegram-bot`

### Проверка работоспособности

- Регулярно проверяйте логи на ошибки
- Тестируйте основные функции бота
- Проверяйте сохранение прогресса в Airtable

## Обновление бота

После изменений в коде:

1. Закоммитьте изменения:
```bash
git add .
git commit -m "Описание изменений"
git push
```

2. Платформа автоматически перезапустит бота с новым кодом

3. Проверьте логи на наличие ошибок

4. Протестируйте бота

## Резервное копирование

### Airtable

- Airtable автоматически сохраняет все данные
- Можно экспортировать данные через интерфейс
- Используйте Airtable API для автоматического бэкапа

### Код

- Код хранится в Git репозитории
- Используйте GitHub/GitLab для хранения
- Регулярно делайте коммиты

## Безопасность

1. **Никогда не коммитьте реальные токены в Git**
2. Используйте только переменные окружения для секретов
3. Регулярно обновляйте зависимости: `yarn upgrade`
4. Используйте Personal Access Tokens с минимальными правами
5. Регулярно проверяйте логи на подозрительную активность

Подробнее см. SECURITY.md

