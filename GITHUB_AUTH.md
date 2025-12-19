# Настройка аутентификации GitHub

## Проблема: Authentication failed (401)

GitHub больше не принимает пароли для аутентификации. Нужно использовать Personal Access Token.

## Решение 1: Использовать Personal Access Token (рекомендуется)

### Шаг 1: Создайте Personal Access Token

1. Откройте GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Нажмите "Generate new token (classic)"
3. Введите название (например: "Telegram Bot Deploy")
4. Выберите срок действия (например: 90 days или No expiration)
5. Выберите scopes:
   - ✅ `repo` (полный доступ к репозиториям)
6. Нажмите "Generate token"
7. **ВАЖНО:** Скопируйте токен сразу - он показывается только один раз!

### Шаг 2: Используйте токен для push

При push используйте токен вместо пароля:

```bash
git push --force origin main
```

Когда Git попросит:
- Username: ваш GitHub username (DenisArger)
- Password: вставьте Personal Access Token (НЕ пароль!)

### Шаг 3: Сохраните credentials (опционально)

Чтобы не вводить токен каждый раз:

```bash
git config --global credential.helper store
```

После первого успешного push, credentials сохранятся.

## Решение 2: Использовать SSH (альтернатива)

### Шаг 1: Проверьте наличие SSH ключа

```bash
ls -la ~/.ssh/id_*.pub
```

Если файла нет, создайте ключ:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### Шаг 2: Добавьте ключ в GitHub

1. Скопируйте публичный ключ:
```bash
cat ~/.ssh/id_ed25519.pub
```

2. GitHub → Settings → SSH and GPG keys → New SSH key
3. Вставьте ключ и сохраните

### Шаг 3: Измените remote на SSH

```bash
git remote set-url origin git@github.com:DenisArger/telegram-edu-bot.git
```

### Шаг 4: Push

```bash
git push --force origin main
```

## Решение 3: Использовать GitHub CLI

```bash
# Установите GitHub CLI (если еще не установлен)
# Затем:
gh auth login
git push --force origin main
```

## Проверка аутентификации

После настройки проверьте:

```bash
git ls-remote origin
```

Если команда выполнилась без ошибок - аутентификация работает.

## После успешного push

1. Проверьте репозиторий на GitHub
2. Убедитесь, что `.env.example` содержит только placeholders
3. Убедитесь, что `.env` НЕ в репозитории

## Важно

- **НИКОГДА** не коммитьте реальные токены
- Используйте только `.env.example` с placeholder значениями
- Реальные токены добавляйте только на платформе деплоя (Railway/Render/Heroku)

