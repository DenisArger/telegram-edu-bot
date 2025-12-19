# Инструкция по настройке Personal Access Token для Airtable

Согласно [официальной документации Airtable](https://support.airtable.com/docs/creating-personal-access-tokens), выполните следующие шаги:

## Шаг 1: Откройте Developer Hub

1. Войдите в свой аккаунт Airtable
2. Откройте [Developer Hub](https://airtable.com/create/tokens)
3. В разделе "Developers" нажмите **"Personal access tokens"**

## Шаг 2: Создайте новый токен

1. Нажмите **"Create token"**
2. Введите имя токена (например: "Telegram Bot Token")

## Шаг 3: Настройте Scopes (права доступа)

Нажмите **"+ Add a scope"** и добавьте следующие scopes:

### Обязательные scopes:
- ✅ **`data.records:read`** - для чтения записей из таблиц
- ✅ **`data.records:write`** - для записи/создания записей в таблицах

### Опциональные scopes (для отладки):
- **`schema.bases:read`** - для чтения структуры базы (полезно для тестирования)

> **Важно:** Токен может выполнять только те действия, которые разрешены вашему пользователю. Например, для создания записей вы должны быть Creator в базе данных.

## Шаг 4: Настройте доступ к базе данных

Нажмите **"+ Add a base"** или **"+ Add all resources"** и выберите:

### Вариант 1: Доступ к конкретной базе (рекомендуется)
- Выберите вашу базу данных: `appBD3de3YKMddpx1`
- Или найдите её по имени в списке

### Вариант 2: Доступ ко всем базам
- Выберите "All bases" (если нужно)

## Шаг 5: Сохраните токен

1. Нажмите **"Create token"**
2. **ВАЖНО:** Скопируйте токен сразу - он показывается только один раз!
3. Токен будет начинаться с `pat...`

## Шаг 6: Обновите файл .env

Откройте файл `.env` в директории проекта и обновите `AIRTABLE_API_KEY`:

```env
AIRTABLE_API_KEY=patваш_новый_токен_здесь
```

## Шаг 7: Проверьте подключение

Запустите тестовый скрипт:

```bash
cd telegram-rus-bot
node src/test-airtable.js
```

Если всё настроено правильно, вы увидите:
```
✓ Table "Ученики" is accessible (found X record(s))
✓ Table "Задания" is accessible (found X record(s))
✓ Table "Прогресс" is accessible (found X record(s))
```

## Решение проблем

### Ошибка "INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND"

Согласно [документации Airtable](https://support.airtable.com/docs/creating-personal-access-tokens), эта ошибка может означать:

1. **Проблема с правами:**
   - Проверьте, что токен имеет нужные scopes (`data.records:read`, `data.records:write`)
   - Проверьте ваш уровень доступа в базе (должны быть права Creator или Editor)
   - Проверьте, что база добавлена в список доступных ресурсов токена

2. **Проблема с базой данных:**
   - Убедитесь, что Base ID правильный: `appBD3de3YKMddpx1`
   - Проверьте, что база не была удалена

### Обновление существующего токена

1. Откройте Developer Hub → Personal access tokens
2. Найдите ваш токен
3. Нажмите на имя токена или иконку **"…"** → **"Edit token"**
4. Обновите scopes и доступ
5. Нажмите **"Save changes"**

### Регенерация токена

Если нужно создать новый токен:

1. Нажмите **"…"** рядом с токеном
2. Выберите **"Regenerate token"**
3. **ВАЖНО:** Обновите токен во всех сервисах, которые его используют!

## Дополнительная информация

- [Официальная документация по scopes](https://airtable.com/developers/web/api/scopes)
- [Руководство по Personal Access Tokens](https://support.airtable.com/docs/creating-personal-access-tokens)

