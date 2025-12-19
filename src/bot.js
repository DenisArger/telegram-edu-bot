// Main bot file - Telegram bot handlers
import TelegramBot from "node-telegram-bot-api";
import { config } from "./config.js";
import {
  getStudentByTelegramId,
  createStudent,
  getAvailableLessons,
  updateStudentLesson,
} from "./student.js";
import { getTasksForLesson, checkAnswer } from "./tasks.js";
import { saveProgress } from "./progress.js";

const bot = new TelegramBot(config.telegramToken, { polling: true });

// User state management
const userState = new Map(); // Stores current task index for each user
const registrationState = new Map(); // Stores registration process state

/**
 * Send first task to user
 */
async function sendFirstTask(chatId, student) {
  try {
    const lessonId = student.fields["Текущий урок"]?.[0];

    if (!lessonId) {
      await bot.sendMessage(
        chatId,
        "У вас не назначен текущий урок. Обратитесь к учителю."
      );
      return;
    }

    const tasks = await getTasksForLesson(lessonId);

    if (tasks.length === 0) {
      await bot.sendMessage(
        chatId,
        "Для этого урока пока нет активных заданий."
      );
      return;
    }

    // Initialize user state
    userState.set(chatId, {
      taskIndex: 0,
      tasks: tasks,
      studentId: student.id,
    });

    // Send first task with navigation buttons
    const taskKeyboard = {
      inline_keyboard: [
        [
          { text: "⏭️ Пропустить", callback_data: `skip_task_${0}` },
          { text: "❌ Завершить урок", callback_data: "end_lesson" },
        ],
      ],
    };

    await bot.sendMessage(chatId, tasks[0].text, {
      reply_markup: taskKeyboard,
    });
  } catch (error) {
    console.error(`Error sending first task to ${chatId}:`, error);
    await bot.sendMessage(
      chatId,
      "Произошла ошибка при загрузке заданий. Попробуйте позже."
    );
  }
}

// Handle /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const student = await getStudentByTelegramId(chatId);

    if (!student) {
      const registerKeyboard = {
        inline_keyboard: [
          [{ text: "📝 Зарегистрироваться", callback_data: "start_register" }],
        ],
      };

      await bot.sendMessage(
        chatId,
        "Вы не зарегистрированы. Нажмите кнопку ниже для регистрации:",
        {
          reply_markup: registerKeyboard,
        }
      );
      return;
    }

    // Main menu for registered users
    const mainKeyboard = {
      inline_keyboard: [
        [{ text: "▶️ Начать урок", callback_data: "start_lesson" }],
        [{ text: "📚 Выбрать другой урок", callback_data: "change_lesson" }],
        [{ text: "ℹ️ Информация", callback_data: "show_info" }],
      ],
    };

    await bot.sendMessage(
      chatId,
      "Добро пожаловать! 👋\n\nВыберите действие:",
      {
        reply_markup: mainKeyboard,
      }
    );
  } catch (error) {
    console.error(`Error in /start handler for ${chatId}:`, error);
    await bot.sendMessage(
      chatId,
      "Произошла ошибка. Попробуйте позже или обратитесь к администратору."
    );
  }
});

// Handle /register command
bot.onText(/\/register/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Check if already registered
    const existingStudent = await getStudentByTelegramId(chatId);
    if (existingStudent) {
      await bot.sendMessage(
        chatId,
        "Вы уже зарегистрированы! Используйте /start для начала урока."
      );
      return;
    }

    // Get available lessons
    const lessons = await getAvailableLessons();

    if (lessons.length === 0) {
      await bot.sendMessage(
        chatId,
        "К сожалению, пока нет доступных уроков. Обратитесь к учителю."
      );
      return;
    }

    // Create keyboard with lesson options
    const keyboard = {
      inline_keyboard: lessons.map((lesson, index) => [
        {
          text: `${index + 1}. ${lesson.name}`,
          callback_data: `register_lesson_${lesson.id}`,
        },
      ]),
    };

    await bot.sendMessage(
      chatId,
      "Добро пожаловать! 👋\n\nВыберите урок для начала обучения:",
      {
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    console.error(`Error in /register handler for ${chatId}:`, error);
    await bot.sendMessage(
      chatId,
      "Произошла ошибка при регистрации. Попробуйте позже."
    );
  }
});

// Handle callback queries (button presses)
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  console.log(`Callback query received: ${data} from ${chatId}`);

  try {
    // Registration flow
    if (data.startsWith("register_lesson_")) {
      const lessonId = data.replace("register_lesson_", "");

      // Get lesson name for confirmation
      const lessons = await getAvailableLessons();
      const selectedLesson = lessons.find((l) => l.id === lessonId);

      // Create student record
      const student = await createStudent(chatId, lessonId);

      // Answer callback query
      await bot.answerCallbackQuery(query.id, {
        text: "Регистрация успешна! ✅",
      });

      // Send confirmation message with start button
      const startKeyboard = {
        inline_keyboard: [
          [{ text: "▶️ Начать урок", callback_data: "start_lesson" }],
        ],
      };

      await bot.sendMessage(
        chatId,
        `Отлично! Вы зарегистрированы на урок "${selectedLesson?.name || "урок"}".\n\nНажмите кнопку ниже, чтобы начать:`,
        {
          reply_markup: startKeyboard,
        }
      );

      // Delete the registration message
      await bot.deleteMessage(chatId, query.message.message_id);
    }
    // Start registration from main menu
    else if (data === "start_register") {
      await bot.answerCallbackQuery(query.id);
      // Trigger registration flow
      const lessons = await getAvailableLessons();

      if (lessons.length === 0) {
        await bot.sendMessage(
          chatId,
          "К сожалению, пока нет доступных уроков. Обратитесь к учителю."
        );
        return;
      }

      const keyboard = {
        inline_keyboard: lessons.map((lesson, index) => [
          {
            text: `${index + 1}. ${lesson.name}`,
            callback_data: `register_lesson_${lesson.id}`,
          },
        ]),
      };

      await bot.sendMessage(
        chatId,
        "Добро пожаловать! 👋\n\nВыберите урок для начала обучения:",
        {
          reply_markup: keyboard,
        }
      );
    }
    // Start lesson
    else if (data === "start_lesson") {
      await bot.answerCallbackQuery(query.id, { text: "Загружаем урок..." });

      const student = await getStudentByTelegramId(chatId);
      if (!student) {
        await bot.sendMessage(chatId, "Вы не зарегистрированы.");
        return;
      }

      await bot.sendMessage(chatId, "Начинаем урок русского языка ✍️");
      await sendFirstTask(chatId, student);
    }
    // Change lesson
    else if (data === "change_lesson") {
      try {
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(
            chatId,
            "Вы не зарегистрированы. Используйте /register для регистрации."
          );
          return;
        }

        const currentLessonId = student.fields["Текущий урок"]?.[0];

        const lessons = await getAvailableLessons();
        if (lessons.length === 0) {
          await bot.sendMessage(
            chatId,
            "К сожалению, пока нет доступных уроков."
          );
          return;
        }

        // Create keyboard with current lesson marked
        const keyboard = {
          inline_keyboard: lessons.map((lesson) => {
            const isCurrent = lesson.id === currentLessonId;
            return [
              {
                text: `${isCurrent ? "✅ " : ""}${lesson.name}${isCurrent ? " (текущий)" : ""}`,
                callback_data: `change_to_lesson_${lesson.id}`,
              },
            ];
          }),
        };

        const currentLessonName = lessons.find((l) => l.id === currentLessonId)?.name || "не назначен";

        await bot.sendMessage(
          chatId,
          `📚 Выбор урока\n\nТекущий урок: ${currentLessonName}\n\nВыберите новый урок:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in change_lesson handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Change to specific lesson
    else if (data.startsWith("change_to_lesson_")) {
      try {
        const lessonId = data.replace("change_to_lesson_", "");
        
        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.answerCallbackQuery(query.id, {
            text: "Вы не зарегистрированы",
            show_alert: true,
          });
          return;
        }

        const lessons = await getAvailableLessons();
        const selectedLesson = lessons.find((l) => l.id === lessonId);

        if (!selectedLesson) {
          await bot.answerCallbackQuery(query.id, {
            text: "Урок не найден",
            show_alert: true,
          });
          return;
        }

        // Update student's current lesson
        await updateStudentLesson(student.id, lessonId);

        await bot.answerCallbackQuery(query.id, {
          text: `Урок изменен на "${selectedLesson.name}"`,
        });

        // Delete the lesson selection message
        try {
          await bot.deleteMessage(chatId, query.message.message_id);
        } catch (e) {
          // Ignore if message already deleted
        }

        const startKeyboard = {
          inline_keyboard: [
            [{ text: "▶️ Начать новый урок", callback_data: "start_lesson" }],
            [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
          ],
        };

        await bot.sendMessage(
          chatId,
          `✅ Урок изменен на "${selectedLesson.name}"\n\nНажмите кнопку ниже, чтобы начать:`,
          {
            reply_markup: startKeyboard,
          }
        );
      } catch (error) {
        console.error(`Error in change_to_lesson handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка при изменении урока. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Skip task
    else if (data.startsWith("skip_task_")) {
      const taskIndex = parseInt(data.replace("skip_task_", ""));
      const state = userState.get(chatId);

      if (state && state.tasks && state.tasks.length > taskIndex) {
        state.taskIndex = taskIndex + 1;
        const nextTask = state.tasks[state.taskIndex];

        if (nextTask) {
          await bot.answerCallbackQuery(query.id, {
            text: "Задание пропущено",
          });

          const taskKeyboard = {
            inline_keyboard: [
              [
                {
                  text: "⏭️ Пропустить",
                  callback_data: `skip_task_${state.taskIndex}`,
                },
                { text: "❌ Завершить урок", callback_data: "end_lesson" },
              ],
            ],
          };

          await bot.editMessageText(nextTask.text, {
            chat_id: chatId,
            message_id: query.message.message_id,
            reply_markup: taskKeyboard,
          });
        } else {
          await bot.answerCallbackQuery(query.id);
          await bot.sendMessage(chatId, "Это было последнее задание!");
        }
      }
    }
    // End lesson
    else if (data === "end_lesson") {
      await bot.answerCallbackQuery(query.id);
      userState.delete(chatId);

      const endKeyboard = {
        inline_keyboard: [
          [{ text: "🔄 Пройти урок снова", callback_data: "restart_lesson" }],
          [{ text: "📚 Выбрать другой урок", callback_data: "change_lesson" }],
          [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
        ],
      };

      await bot.sendMessage(chatId, "Урок завершен. Вы можете начать заново:", {
        reply_markup: endKeyboard,
      });
    }
    // Restart lesson
    else if (data === "restart_lesson") {
      await bot.answerCallbackQuery(query.id, { text: "Перезапускаем урок..." });

      const student = await getStudentByTelegramId(chatId);
      if (!student) {
        await bot.sendMessage(chatId, "Вы не зарегистрированы.");
        return;
      }

      await sendFirstTask(chatId, student);
    }
    // Main menu
    else if (data === "main_menu") {
      await bot.answerCallbackQuery(query.id);

      const student = await getStudentByTelegramId(chatId);
      if (!student) {
        const registerKeyboard = {
          inline_keyboard: [
            [{ text: "📝 Зарегистрироваться", callback_data: "start_register" }],
          ],
        };

        await bot.sendMessage(
          chatId,
          "Вы не зарегистрированы. Нажмите кнопку ниже для регистрации:",
          {
            reply_markup: registerKeyboard,
          }
        );
        return;
      }

      const mainKeyboard = {
        inline_keyboard: [
          [{ text: "▶️ Начать урок", callback_data: "start_lesson" }],
          [{ text: "📚 Выбрать другой урок", callback_data: "change_lesson" }],
          [{ text: "ℹ️ Информация", callback_data: "show_info" }],
        ],
      };

      await bot.sendMessage(chatId, "Главное меню:", {
        reply_markup: mainKeyboard,
      });
    }
    // Show info
    else if (data === "show_info") {
      await bot.answerCallbackQuery(query.id);

      const student = await getStudentByTelegramId(chatId);
      if (student) {
        const lessonId = student.fields["Текущий урок"]?.[0];
        const lessons = await getAvailableLessons();
        const currentLesson = lessons.find((l) => l.id === lessonId);
        const allLessons = lessons.map((l) => l.name).join(", ");

        const infoKeyboard = {
          inline_keyboard: [
            [{ text: "📚 Выбрать другой урок", callback_data: "change_lesson" }],
            [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
          ],
        };

        await bot.sendMessage(
          chatId,
          `ℹ️ Информация:\n\n` +
            `Текущий урок: ${currentLesson?.name || "не назначен"}\n\n` +
            `Доступные уроки:\n${allLessons || "нет"}\n\n` +
            `Команды:\n` +
            `/start - Главное меню\n` +
            `/register - Регистрация\n\n` +
            `Используйте кнопки для навигации.`,
          {
            reply_markup: infoKeyboard,
          }
        );
      } else {
        await bot.sendMessage(
          chatId,
          "Вы не зарегистрированы. Используйте /register для регистрации."
        );
      }
    }
  } catch (error) {
    console.error(`Error handling callback query for ${chatId}:`, error);
    await bot.answerCallbackQuery(query.id, {
      text: "Произошла ошибка. Попробуйте еще раз.",
      show_alert: true,
    });
  }
});

// Handle regular messages (answers)
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // Skip commands
  if (msg.text && msg.text.startsWith("/")) {
    return;
  }

  // Skip if user doesn't have active state
  const state = userState.get(chatId);
  if (!state || !state.tasks || state.tasks.length === 0) {
    return;
  }

  try {
    const task = state.tasks[state.taskIndex];

    if (!task) {
      await bot.sendMessage(chatId, "Урок завершён ✅");
      userState.delete(chatId);
      return;
    }

    // Check answer
    const isCorrect = checkAnswer(msg.text, task.answers);

    // Save progress
    try {
      await saveProgress(state.studentId, task.id, msg.text, isCorrect);
    } catch (progressError) {
      console.error("Error saving progress:", progressError);
      // Continue even if progress saving fails
    }

    // Send feedback
    await bot.sendMessage(
      chatId,
      isCorrect ? task.correctFeedback : task.wrongFeedback
    );

    if (isCorrect) {
      // Move to next task
      state.taskIndex += 1;
      const nextTask = state.tasks[state.taskIndex];

      if (nextTask) {
        const taskKeyboard = {
          inline_keyboard: [
            [
              {
                text: "⏭️ Пропустить",
                callback_data: `skip_task_${state.taskIndex}`,
              },
              { text: "❌ Завершить урок", callback_data: "end_lesson" },
            ],
          ],
        };

        await bot.sendMessage(chatId, nextTask.text, {
          reply_markup: taskKeyboard,
        });
      } else {
        const completionKeyboard = {
          inline_keyboard: [
            [{ text: "🔄 Пройти урок снова", callback_data: "restart_lesson" }],
            [{ text: "📚 Выбрать другой урок", callback_data: "change_lesson" }],
            [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
          ],
        };

        await bot.sendMessage(chatId, "Молодец! Урок завершён 🎉", {
          reply_markup: completionKeyboard,
        });
        userState.delete(chatId);
      }
    }
    // If incorrect, user can try again (state remains the same)
  } catch (error) {
    console.error(`Error processing message from ${chatId}:`, error);
    await bot.sendMessage(
      chatId,
      "Произошла ошибка при обработке ответа. Попробуйте еще раз."
    );
  }
});

// Error handling
bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

console.log("Bot is running...");

