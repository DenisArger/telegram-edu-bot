# Инструкция по публикации Telegram-бота

## ⚠️ Важно: Netlify не подходит для polling бота

Netlify предназначен для статических сайтов и serverless функций. Telegram бот с polling требует постоянно работающий процесс, что не соответствует модели Netlify.

## Рекомендуемые платформы для деплоя

### 1. Railway (рекомендуется) ⭐

**Преимущества:**
- Бесплатный тарифный план
- Простая настройка
- Автоматический деплой из GitHub
- Поддержка Node.js из коробки

**Шаги:**

1. Зарегистрируйтесь на [Railway](https://railway.app)

2. Создайте новый проект:
   - Нажмите "New Project"
   - Выберите "Deploy from GitHub repo"
   - Выберите ваш репозиторий

3. Настройте переменные окружения:
   - `TELEGRAM_BOT_TOKEN` - ваш токен бота
   - `AIRTABLE_API_KEY` - ваш API ключ Airtable
   - `AIRTABLE_BASE_ID` - ваш Base ID

4. Railway автоматически определит Node.js проект и запустит его

5. Добавьте `Procfile` (опционально):
```
web: node src/bot.js
```

### 2. Render

**Шаги:**

1. Зарегистрируйтесь на [Render](https://render.com)

2. Создайте новый Web Service:
   - Connect your repository
   - Выберите ваш репозиторий
   - Build Command: `yarn install`
   - Start Command: `yarn start`

3. Добавьте переменные окружения в разделе Environment

4. Render автоматически запустит бота

### 3. Heroku

**Шаги:**

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
cd telegram-rus-bot
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

### 4. VPS (DigitalOcean, AWS, etc.)

**Шаги:**

1. Создайте VPS сервер (Ubuntu 20.04+)

2. Подключитесь по SSH:
```bash
ssh user@your-server-ip
```

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
cd telegram-rus-bot
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

### 1. Создайте Procfile (для Heroku/Railway)

Создайте файл `Procfile` в корне проекта:

```
web: node src/bot.js
```

### 2. Обновите package.json

Убедитесь, что в `package.json` есть скрипт start:

```json
{
  "scripts": {
    "start": "node src/bot.js"
  }
}
```

### 3. Добавьте .gitignore

Убедитесь, что `.env` в `.gitignore`:

```
.env
node_modules/
*.log
```

### 4. Создайте README с инструкциями

Добавьте информацию о переменных окружения в README.

## Использование Netlify (не рекомендуется, но возможно)

Если вы все же хотите использовать Netlify, нужно переделать бота на webhooks вместо polling:

### Шаги:

1. Создайте Netlify функцию в `netlify/functions/bot.js`:

```javascript
const TelegramBot = require('node-telegram-bot-api');

exports.handler = async (event, context) => {
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const update = JSON.parse(event.body);
  
  // Обработка update
  await bot.processUpdate(update);
  
  return { statusCode: 200, body: 'OK' };
};
```

2. Настройте webhook в Telegram:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-site.netlify.app/.netlify/functions/bot"}'
```

⚠️ **Проблемы с Netlify:**
- Нужно переписать весь бот на webhooks
- Сложнее отладка
- Ограничения по времени выполнения функций
- Не подходит для long polling

## Рекомендация

**Используйте Railway или Render** - они идеально подходят для Telegram ботов и имеют бесплатные тарифы.

