# Настройка SSH для GitHub

## Ваш SSH публичный ключ

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILgBZUUpGj3YdNIsRnyFyEV7NBtZXR9jIFt9p0OjzULl den.arger@mail.com
```

## Шаги для настройки

### 1. Добавьте ключ в GitHub

1. Откройте https://github.com/settings/keys
2. Нажмите **"New SSH key"**
3. В поле **Title** введите: "Astra Server" (или любое название)
4. В поле **Key** вставьте весь ключ выше (начиная с `ssh-ed25519`)
5. Нажмите **"Add SSH key"**

### 2. Проверьте подключение

```bash
ssh -T git@github.com
```

Должно появиться:
```
Hi DenisArger! You've successfully authenticated, but GitHub does not provide shell access.
```

### 3. Выполните push

```bash
cd ~/ADV/SD/SD/telegram-rus-bot
git push --force origin main
```

## Если SSH не работает

### Альтернатива: Personal Access Token в URL

1. Создайте токен: https://github.com/settings/tokens
2. Scope: `repo`
3. Выполните:

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/DenisArger/telegram-edu-bot.git
git push --force origin main
```

⚠️ После push верните URL:
```bash
git remote set-url origin https://github.com/DenisArger/telegram-edu-bot.git
```

## Проверка после успешного push

1. Откройте https://github.com/DenisArger/telegram-edu-bot
2. Убедитесь, что все файлы на месте
3. Проверьте, что `.env.example` содержит только placeholders
4. Убедитесь, что `.env` НЕ в репозитории

