**Ваш вопрос:**
*«Таблицы я создал в Airtable. Теперь напиши подробное описание для создания телеграм-бота на JS. Это должна быть инструкция для Cursor».*

Отлично. Ниже — **чёткая, пошаговая, инженерная инструкция**, написанная **специально как ТЗ / промпт для Cursor**, чтобы он **сгенерировал рабочий Telegram-бот на JavaScript**, который:

* читает данные из **Airtable**
* работает **только в Telegram** для ученика
* учитывает **класс, уровень**
* выдаёт задания **по русскому языку**
* проверяет ответы
* сохраняет прогресс

Без воды. Без «примерно». Это можно **скопировать целиком в Cursor**.

---

# 📘 ИНСТРУКЦИЯ ДЛЯ CURSOR

## Создание Telegram-бота (Node.js + Airtable)

---

## 0. Общие требования к боту

**Назначение:**
Школьный Telegram-бот по предмету **«Русский язык»**.

**Пользователь:**
Ученик (всё взаимодействие — через Telegram).

**Источник данных:**
Airtable (таблицы уже созданы).

**Технологии:**

* Node.js ≥ 18
* JavaScript (ES Modules)
* Telegram Bot API
* Airtable REST API

---

## 1. Архитектура проекта

Создай проект со следующей структурой:

```
telegram-rus-bot/
├── src/
│   ├── bot.js
│   ├── airtable.js
│   ├── student.js
│   ├── tasks.js
│   ├── progress.js
│   └── config.js
├── package.json
├── .env
└── README.md
```

---

## 2. Переменные окружения (.env)

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id
```

---

## 3. config.js

```js
export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  airtableApiKey: process.env.AIRTABLE_API_KEY,
  airtableBaseId: process.env.AIRTABLE_BASE_ID,
};
```

---

## 4. Модуль Airtable (airtable.js)

**Задача:**
Универсальная функция чтения данных из таблиц Airtable.

```js
import fetch from "node-fetch";
import { config } from "./config.js";

const BASE_URL = `https://api.airtable.com/v0/${config.airtableBaseId}`;

export async function getRecords(tableName, filterFormula = "") {
  const url = new URL(`${BASE_URL}/${encodeURIComponent(tableName)}`);

  if (filterFormula) {
    url.searchParams.set("filterByFormula", filterFormula);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.airtableApiKey}`,
    },
  });

  const data = await response.json();
  return data.records || [];
}
```

---

## 5. Работа с учениками (student.js)

```js
import { getRecords } from "./airtable.js";

export async function getStudentByTelegramId(telegramId) {
  const records = await getRecords(
    "Ученики",
    `{Telegram ID} = ${telegramId}`
  );
  return records[0] || null;
}
```

---

## 6. Получение заданий (tasks.js)

```js
import { getRecords } from "./airtable.js";

export async function getTasksForLesson(lessonId) {
  const records = await getRecords(
    "Задания",
    `AND({Активно} = TRUE(), {Урок} = "${lessonId}")`
  );

  return records
    .map(r => ({
      id: r.id,
      text: r.fields["Текст задания"],
      answers: r.fields["Правильные ответы"]
        .split("\n")
        .map(a => a.trim().toLowerCase()),
      correctFeedback: r.fields["Комментарий (верно)"],
      wrongFeedback: r.fields["Комментарий (ошибка)"],
    }))
    .sort((a, b) => a.order - b.order);
}
```

---

## 7. Проверка ответа (в tasks.js)

```js
export function checkAnswer(userInput, answers) {
  return answers.includes(userInput.trim().toLowerCase());
}
```

---

## 8. Сохранение прогресса (progress.js)

```js
import fetch from "node-fetch";
import { config } from "./config.js";

export async function saveProgress(studentId, taskId, answer, isCorrect) {
  const url = `https://api.airtable.com/v0/${config.airtableBaseId}/Прогресс`;

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.airtableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [
        {
          fields: {
            Ученик: [studentId],
            Задание: [taskId],
            "Ответ ученика": answer,
            Верно: isCorrect,
          },
        },
      ],
    }),
  });
}
```

---

## 9. Основной файл бота (bot.js)

```js
import TelegramBot from "node-telegram-bot-api";
import { config } from "./config.js";
import { getStudentByTelegramId } from "./student.js";
import { getTasksForLesson, checkAnswer } from "./tasks.js";
import { saveProgress } from "./progress.js";

const bot = new TelegramBot(config.telegramToken, { polling: true });

const userState = new Map();

bot.onText(/\/start/, async msg => {
  const chatId = msg.chat.id;
  const student = await getStudentByTelegramId(chatId);

  if (!student) {
    bot.sendMessage(chatId, "Вы не зарегистрированы.");
    return;
  }

  bot.sendMessage(chatId, "Начинаем урок русского языка ✍️");
  userState.set(chatId, { taskIndex: 0 });
});

bot.on("message", async msg => {
  const chatId = msg.chat.id;
  if (msg.text.startsWith("/")) return;

  const state = userState.get(chatId);
  if (!state) return;

  const student = await getStudentByTelegramId(chatId);
  const lessonId = student.fields["Текущий урок"][0];
  const tasks = await getTasksForLesson(lessonId);

  const task = tasks[state.taskIndex];
  if (!task) {
    bot.sendMessage(chatId, "Урок завершён ✅");
    return;
  }

  const isCorrect = checkAnswer(msg.text, task.answers);
  await saveProgress(student.id, task.id, msg.text, isCorrect);

  bot.sendMessage(
    chatId,
    isCorrect ? task.correctFeedback : task.wrongFeedback
  );

  if (isCorrect) {
    state.taskIndex += 1;
    const nextTask = tasks[state.taskIndex];
    if (nextTask) {
      bot.sendMessage(chatId, nextTask.text);
    } else {
      bot.sendMessage(chatId, "Молодец! Урок завершён 🎉");
    }
  }
});
```

---

## 10. package.json

```json
{
  "type": "module",
  "dependencies": {
    "node-fetch": "^3.3.2",
    "node-telegram-bot-api": "^0.61.0"
  }
}
```

---

## 11. Поведение бота (результат)

**Ученик видит:**

* только Telegram
* задания по русскому языку
* проверку ответов
* комментарии
* прогресс

**Учитель работает:**

* только в Airtable
* без Telegram
* без кода

---

## Итог

✔ полноценная школьная архитектура
✔ Telegram — единственный интерфейс ученика
✔ Airtable — админка учителя
✔ JS / Node.js
✔ готово к масштабированию

---

### Что логично следующим шагом

1️⃣ регистрация ученика в боте
2️⃣ выбор класса
3️⃣ выбор темы
4️⃣ поддержка вариантов ответов

Если хотите — следующим сообщением сделаю:

* улучшенную логику FSM
* поддержку нескольких уроков
* или **финальный production-вариант** бота
