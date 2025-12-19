# Решение проблемы с аутентификацией GitHub

## Проблема: Cursor askpass не работает

Cursor использует свой askpass, который может не работать правильно с GitHub. 

## Решение 1: Использовать обычный терминал (рекомендуется)

Откройте обычный терминал (не в Cursor) и выполните:

```bash
cd ~/ADV/SD/SD/telegram-rus-bot
git push --force origin main
```

Когда Git попросит credentials:
- Username: `DenisArger`
- Password: вставьте Personal Access Token (не пароль!)

## Решение 2: Использовать токен в URL (временно)

Если нужно сделать push прямо сейчас:

1. Создайте Personal Access Token на https://github.com/settings/tokens
2. Выполните:

```bash
cd ~/ADV/SD/SD/telegram-rus-bot
git remote set-url origin https://YOUR_TOKEN@github.com/DenisArger/telegram-edu-bot.git
git push --force origin main
```

⚠️ **ВАЖНО:** После push верните URL обратно:
```bash
git remote set-url origin https://github.com/DenisArger/telegram-edu-bot.git
```

## Решение 3: Отключить askpass Cursor

В терминале выполните:

```bash
export GIT_ASKPASS=""
unset SSH_ASKPASS
cd ~/ADV/SD/SD/telegram-rus-bot
git push --force origin main
```

## Решение 4: Настроить SSH (долгосрочное решение)

1. Покажите публичный ключ:
```bash
cat ~/.ssh/id_ed25519.pub
```

2. Добавьте ключ в GitHub: https://github.com/settings/keys

3. Измените remote:
```bash
git remote set-url origin git@github.com:DenisArger/telegram-edu-bot.git
```

4. Push:
```bash
git push --force origin main
```

## Проверка после push

После успешного push проверьте на GitHub:
- Репозиторий: https://github.com/DenisArger/telegram-edu-bot
- Убедитесь, что `.env.example` содержит только placeholders
- Убедитесь, что `.env` НЕ в репозитории

