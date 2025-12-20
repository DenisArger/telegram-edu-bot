// Main bot file - Telegram bot handlers
import TelegramBot from "node-telegram-bot-api";
import { config } from "./config.js";
import {
  getStudentByTelegramId,
  createStudent,
  getAvailableLessons,
  updateStudentLesson,
  getAvailableSubjects,
  getSectionsForSubject,
  getTopicsForSection,
  getLessonsForTopic,
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

    // Get student class for task filtering
    // Single select field can return string or object {name: "value"}
    const studentClass = student.fields["Класс"] || null;
    
    // Handle Link field (array) - take first value if array
    let classValue = Array.isArray(studentClass) ? studentClass[0] : studentClass;
    
    // Normalize class value - handle Single select object {name: "value"} or primitive
    if (classValue !== null && classValue !== undefined && classValue !== "") {
      // Handle Single select object {name: "3"}
      if (typeof classValue === 'object' && classValue.name !== undefined) {
        classValue = String(classValue.name).trim();
      } else {
        // Handle primitive values (number, string)
        classValue = String(classValue).trim();
      }
    } else {
      classValue = null;
    }

    const tasks = await getTasksForLesson(lessonId, classValue);

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

    // Check if student has current lesson
    const currentLessonId = student.fields["Текущий урок"]?.[0];
    
    // Main menu for registered users
    const mainKeyboard = {
      inline_keyboard: [
        [{ text: "▶️ Начать урок", callback_data: currentLessonId ? "start_current_lesson" : "start_lesson" }],
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

    // Get available subjects
    const subjects = await getAvailableSubjects();

    if (subjects.length === 0) {
      await bot.sendMessage(
        chatId,
        "К сожалению, пока нет доступных предметов. Обратитесь к учителю."
      );
      return;
    }

    // Create keyboard with subject options
    const keyboard = {
      inline_keyboard: subjects.map((subject) => [
        {
          text: subject.name,
          callback_data: `register_subject_${subject.id}`,
        },
      ]),
    };

    await bot.sendMessage(
      chatId,
      "Добро пожаловать! 👋\n\nВыберите предмет для начала обучения:",
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

  try {
    // Registration flow - select subject
    if (data.startsWith("register_subject_")) {
      try {
        const subjectId = data.replace("register_subject_", "");
        
        await bot.answerCallbackQuery(query.id);

        // Get sections for this subject
        const sections = await getSectionsForSubject(subjectId);

        if (sections.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого предмета пока нет доступных разделов."
          );
          return;
        }

        // Create keyboard with section options
        const keyboard = {
          inline_keyboard: sections.map((section) => [
            {
              text: section.name,
              callback_data: `register_section_${section.id}`,
            },
          ]),
        };

        // Get subject name for display
        const subjects = await getAvailableSubjects();
        const selectedSubject = subjects.find((s) => s.id === subjectId);

        await bot.sendMessage(
          chatId,
          `📖 Предмет: ${selectedSubject?.name || "Предмет"}\n\nВыберите раздел:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in register_subject handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Registration flow - select section
    else if (data.startsWith("register_section_")) {
      try {
        const sectionId = data.replace("register_section_", "");
        
        await bot.answerCallbackQuery(query.id);

        // Get topics for this section
        const topics = await getTopicsForSection(sectionId);

        if (topics.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого раздела пока нет доступных тем."
          );
          return;
        }

        // Create keyboard with topic options
        const keyboard = {
          inline_keyboard: topics.map((topic) => [
            {
              text: topic.name,
              callback_data: `register_topic_${topic.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          `📚 Выберите тему:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in register_section handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Registration flow - select topic
    else if (data.startsWith("register_topic_")) {
      try {
        const topicId = data.replace("register_topic_", "");
        
        await bot.answerCallbackQuery(query.id);

        // Get lessons for this topic
        const lessons = await getLessonsForTopic(topicId);

        if (lessons.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этой темы пока нет доступных уроков."
          );
          return;
        }

        // Create keyboard with lesson options
        const keyboard = {
          inline_keyboard: lessons.map((lesson) => [
            {
              text: lesson.name,
              callback_data: `register_lesson_${lesson.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          `📚 Выберите урок для начала обучения:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in register_topic handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Registration flow - select lesson
    else if (data.startsWith("register_lesson_")) {
      try {
        const lessonId = data.replace("register_lesson_", "");

        // Get lesson name for confirmation
        const lessons = await getAvailableLessons();
        const selectedLesson = lessons.find((l) => l.id === lessonId);

        if (!selectedLesson) {
          await bot.answerCallbackQuery(query.id, {
            text: "Урок не найден",
            show_alert: true,
          });
          return;
        }

        // Check if there are tasks for this lesson before creating student
        const tasks = await getTasksForLesson(lessonId);
        
        if (tasks.length === 0) {
          await bot.answerCallbackQuery(query.id, {
            text: "Для этого урока пока нет активных заданий",
            show_alert: true,
          });
          return;
        }

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
        try {
          await bot.deleteMessage(chatId, query.message.message_id);
        } catch (e) {
          // Ignore if message already deleted
        }
      } catch (error) {
        console.error(`Error in register_lesson handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка при регистрации. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Start registration from main menu
    else if (data === "start_register") {
      try {
        await bot.answerCallbackQuery(query.id);
        
        // Get available subjects
        const subjects = await getAvailableSubjects();

        if (subjects.length === 0) {
          await bot.sendMessage(
            chatId,
            "К сожалению, пока нет доступных предметов. Обратитесь к учителю."
          );
          return;
        }

        const keyboard = {
          inline_keyboard: subjects.map((subject) => [
            {
              text: subject.name,
              callback_data: `register_subject_${subject.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          "Добро пожаловать! 👋\n\nВыберите предмет для начала обучения:",
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in start_register handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Start lesson - show subjects menu
    else if (data === "start_lesson") {
      try {
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }

        // Get available subjects
        const subjects = await getAvailableSubjects(normalizedStudentClass);

        if (subjects.length === 0) {
          await bot.sendMessage(
            chatId,
            "К сожалению, пока нет доступных предметов."
          );
          return;
        }

        // Create keyboard with subjects
        const keyboard = {
          inline_keyboard: subjects.map((subject) => [
            {
              text: subject.name,
              callback_data: `select_subject_${subject.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          "📚 Выберите предмет:",
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in start_lesson handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Start current lesson - begin tasks immediately
    else if (data === "start_current_lesson") {
      try {
        await bot.answerCallbackQuery(query.id, { text: "Загружаем урок..." });

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        const lessonId = student.fields["Текущий урок"]?.[0];
        if (!lessonId) {
          await bot.sendMessage(
            chatId,
            "У вас не назначен текущий урок. Выберите урок из меню."
          );
          return;
        }

        // Check if there are tasks for this lesson
        const studentClass = student.fields["Класс"] || null;
        let normalizedClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedClass = String(studentClass.name).trim();
          } else {
            normalizedClass = String(studentClass).trim();
          }
        }

        const tasks = await getTasksForLesson(lessonId, normalizedClass);
        
        if (tasks.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого урока пока нет активных заданий. Выберите другой урок."
          );
          return;
        }

        await bot.sendMessage(chatId, "Начинаем урок ✍️");
        await sendFirstTask(chatId, student);
      } catch (error) {
        console.error(`Error in start_current_lesson handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Select subject - show sections for this subject
    else if (data.startsWith("select_subject_")) {
      try {
        const subjectId = data.replace("select_subject_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }


        // Get sections for this subject
        const sections = await getSectionsForSubject(subjectId);

        if (sections.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого предмета пока нет доступных разделов."
          );
          return;
        }

        // Create keyboard with sections
        const keyboard = {
          inline_keyboard: sections.map((section) => [
            {
              text: section.name,
              callback_data: `select_section_${section.id}`,
            },
          ]),
        };

        // Get subject name for display
        const subjects = await getAvailableSubjects();
        const selectedSubject = subjects.find((s) => s.id === subjectId);

        await bot.sendMessage(
          chatId,
          `📖 Предмет: ${selectedSubject?.name || "Предмет"}\n\nВыберите раздел:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in select_subject handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Select section - show topics for this section
    else if (data.startsWith("select_section_")) {
      try {
        const sectionId = data.replace("select_section_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }

        // Get topics for this section
        const topics = await getTopicsForSection(sectionId, normalizedStudentClass);

        if (topics.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого раздела пока нет доступных тем."
          );
          return;
        }

        // Create keyboard with topics
        const keyboard = {
          inline_keyboard: topics.map((topic) => [
            {
              text: topic.name,
              callback_data: `select_topic_${topic.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          `📚 Выберите тему:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in select_section handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Select topic - show lessons for this topic
    else if (data.startsWith("select_topic_")) {
      try {
        const topicId = data.replace("select_topic_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }

        // Get lessons for this topic
        const lessons = await getLessonsForTopic(topicId, normalizedStudentClass);

        if (lessons.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этой темы пока нет доступных уроков."
          );
          return;
        }

        // Create keyboard with lessons
        const keyboard = {
          inline_keyboard: lessons.map((lesson) => [
            {
              text: lesson.name,
              callback_data: `select_lesson_${lesson.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          `📚 Выберите урок:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in select_topic handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Select lesson - start tasks
    else if (data.startsWith("select_lesson_")) {
      try {
        const lessonId = data.replace("select_lesson_", "");
        
        await bot.answerCallbackQuery(query.id, { text: "Загружаем урок..." });

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedClass = String(studentClass.name).trim();
          } else {
            normalizedClass = String(studentClass).trim();
          }
        }

        // Check if there are tasks for this lesson before updating
        const tasks = await getTasksForLesson(lessonId, normalizedClass);
        
        if (tasks.length === 0) {
          await bot.answerCallbackQuery(query.id, {
            text: "Для этого урока пока нет активных заданий",
            show_alert: true,
          });
          return;
        }

        // Update student's current lesson
        await updateStudentLesson(student.id, lessonId);

        // Get updated student data
        const updatedStudent = await getStudentByTelegramId(chatId);

        await bot.sendMessage(chatId, "Начинаем урок ✍️");
        await sendFirstTask(chatId, updatedStudent);
      } catch (error) {
        console.error(`Error in select_lesson handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка при загрузке урока. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Change lesson - show subjects menu
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

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }

        // Get available subjects
        const subjects = await getAvailableSubjects(normalizedStudentClass);

        if (subjects.length === 0) {
          await bot.sendMessage(
            chatId,
            "К сожалению, пока нет доступных предметов."
          );
          return;
        }

        // Create keyboard with subjects
        const keyboard = {
          inline_keyboard: subjects.map((subject) => [
            {
              text: subject.name,
              callback_data: `change_subject_${subject.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          "📚 Выберите предмет для смены урока:",
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in change_lesson handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Change subject - show sections for this subject
    else if (data.startsWith("change_subject_")) {
      try {
        const subjectId = data.replace("change_subject_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }


        // Get sections for this subject
        const sections = await getSectionsForSubject(subjectId);

        if (sections.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого предмета пока нет доступных разделов."
          );
          return;
        }

        // Create keyboard with sections
        const keyboard = {
          inline_keyboard: sections.map((section) => [
            {
              text: section.name,
              callback_data: `change_section_${section.id}`,
            },
          ]),
        };

        // Get subject name for display
        const subjects = await getAvailableSubjects();
        const selectedSubject = subjects.find((s) => s.id === subjectId);

        await bot.sendMessage(
          chatId,
          `📖 Предмет: ${selectedSubject?.name || "Предмет"}\n\nВыберите раздел:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in change_subject handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Change section - show topics for this section
    else if (data.startsWith("change_section_")) {
      try {
        const sectionId = data.replace("change_section_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }


        // Get topics for this section
        const topics = await getTopicsForSection(sectionId, normalizedStudentClass);

        if (topics.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого раздела пока нет доступных тем."
          );
          return;
        }

        // Create keyboard with topics
        const keyboard = {
          inline_keyboard: topics.map((topic) => [
            {
              text: topic.name,
              callback_data: `change_topic_${topic.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          `📚 Выберите тему:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in change_section handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Change topic - show lessons for this topic
    else if (data.startsWith("change_topic_")) {
      try {
        const topicId = data.replace("change_topic_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }

        const currentLessonId = student.fields["Текущий урок"]?.[0];

        // Get lessons for this topic
        const lessons = await getLessonsForTopic(topicId, normalizedStudentClass);

        if (lessons.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этой темы пока нет доступных уроков."
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
          `📚 Текущий урок: ${currentLessonName}\n\nВыберите новый урок:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in change_topic handler for ${chatId}:`, error);
        console.error(`Error stack:`, error.stack);
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

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedClass = String(studentClass.name).trim();
          } else {
            normalizedClass = String(studentClass).trim();
          }
        }

        // Get lessons filtered by student class (for validation)
        const lessons = await getAvailableLessons(normalizedClass);
        const selectedLesson = lessons.find((l) => l.id === lessonId);

        if (!selectedLesson) {
          await bot.answerCallbackQuery(query.id, {
            text: "Урок не найден",
            show_alert: true,
          });
          return;
        }

        // Check if there are tasks for this lesson before updating
        const tasks = await getTasksForLesson(lessonId, normalizedClass);
        
        if (tasks.length === 0) {
          await bot.answerCallbackQuery(query.id, {
            text: "Для этого урока пока нет активных заданий",
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

        // Get updated student data
        const updatedStudent = await getStudentByTelegramId(chatId);

        const startKeyboard = {
          inline_keyboard: [
            [{ text: "▶️ Начать урок", callback_data: "start_current_lesson" }],
            [{ text: "📚 Выбрать другой урок", callback_data: "change_lesson" }],
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
    // Restart lesson - show subjects menu
    else if (data === "restart_lesson") {
      try {
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }

        // Get available subjects
        const subjects = await getAvailableSubjects(normalizedStudentClass);

        if (subjects.length === 0) {
          await bot.sendMessage(
            chatId,
            "К сожалению, пока нет доступных предметов."
          );
          return;
        }

        // Create keyboard with subjects
        const keyboard = {
          inline_keyboard: subjects.map((subject) => [
            {
              text: subject.name,
              callback_data: `restart_subject_${subject.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          "📚 Выберите предмет для повторного прохождения:",
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in restart_lesson handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Restart subject - show sections for this subject
    else if (data.startsWith("restart_subject_")) {
      try {
        const subjectId = data.replace("restart_subject_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get sections for this subject
        const sections = await getSectionsForSubject(subjectId);

        if (sections.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого предмета пока нет доступных разделов."
          );
          return;
        }

        // Create keyboard with sections
        const keyboard = {
          inline_keyboard: sections.map((section) => [
            {
              text: section.name,
              callback_data: `restart_section_${section.id}`,
            },
          ]),
        };

        // Get subject name for display
        const subjects = await getAvailableSubjects();
        const selectedSubject = subjects.find((s) => s.id === subjectId);

        await bot.sendMessage(
          chatId,
          `📖 Предмет: ${selectedSubject?.name || "Предмет"}\n\nВыберите раздел:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in restart_subject handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Restart section - show topics for this section
    else if (data.startsWith("restart_section_")) {
      try {
        const sectionId = data.replace("restart_section_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }

        // Get topics for this section
        const topics = await getTopicsForSection(sectionId, normalizedStudentClass);

        if (topics.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этого раздела пока нет доступных тем."
          );
          return;
        }

        // Create keyboard with topics
        const keyboard = {
          inline_keyboard: topics.map((topic) => [
            {
              text: topic.name,
              callback_data: `restart_topic_${topic.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          `📚 Выберите тему:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in restart_section handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Restart topic - show lessons for this topic
    else if (data.startsWith("restart_topic_")) {
      try {
        const topicId = data.replace("restart_topic_", "");
        
        await bot.answerCallbackQuery(query.id);

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }

        // Get lessons for this topic
        const lessons = await getLessonsForTopic(topicId, normalizedStudentClass);

        if (lessons.length === 0) {
          await bot.sendMessage(
            chatId,
            "Для этой темы пока нет доступных уроков."
          );
          return;
        }

        // Create keyboard with lessons
        const keyboard = {
          inline_keyboard: lessons.map((lesson) => [
            {
              text: lesson.name,
              callback_data: `restart_lesson_${lesson.id}`,
            },
          ]),
        };

        await bot.sendMessage(
          chatId,
          `📚 Выберите урок для повторного прохождения:`,
          {
            reply_markup: keyboard,
          }
        );
      } catch (error) {
        console.error(`Error in restart_topic handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка. Попробуйте еще раз.",
          show_alert: true,
        });
      }
    }
    // Restart specific lesson - start tasks
    else if (data.startsWith("restart_lesson_")) {
      try {
        const lessonId = data.replace("restart_lesson_", "");
        
        await bot.answerCallbackQuery(query.id, { text: "Перезапускаем урок..." });

        const student = await getStudentByTelegramId(chatId);
        if (!student) {
          await bot.sendMessage(chatId, "Вы не зарегистрированы.");
          return;
        }

        // Update student's current lesson
        await updateStudentLesson(student.id, lessonId);

        // Get updated student data
        const updatedStudent = await getStudentByTelegramId(chatId);

        await sendFirstTask(chatId, updatedStudent);
      } catch (error) {
        console.error(`Error in restart_lesson handler for ${chatId}:`, error);
        await bot.answerCallbackQuery(query.id, {
          text: "Произошла ошибка при перезапуске урока. Попробуйте еще раз.",
          show_alert: true,
        });
      }
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

      // Check if student has current lesson
      const currentLessonId = student.fields["Текущий урок"]?.[0];
      
      const mainKeyboard = {
        inline_keyboard: [
          [{ text: "▶️ Начать урок", callback_data: currentLessonId ? "start_current_lesson" : "start_lesson" }],
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
        
        // Get student class for filtering
        const studentClass = student.fields["Класс"] || null;
        let normalizedStudentClass = null;
        if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
          if (typeof studentClass === 'object' && studentClass.name !== undefined) {
            normalizedStudentClass = String(studentClass.name).trim();
          } else {
            normalizedStudentClass = String(studentClass).trim();
          }
        }
        
        // Get lessons filtered by student class
        const lessons = await getAvailableLessons(normalizedStudentClass);
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
    console.error(` ===== ERROR IN CALLBACK QUERY HANDLER =====`);
    console.error(` chatId: ${chatId}`);
    console.error(` callback_data: "${data}"`);
    console.error(`Error:`, error);
    console.error(`Error stack:`, error.stack);
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
  
  // Handle 409 Conflict - another bot instance is running
  if (error.code === 'ETELEGRAM' && error.response?.body?.error_code === 409) {
    console.log("⚠️  Conflict detected: another bot instance is running.");
    console.log("Waiting 10 seconds before retry...");
    
    setTimeout(() => {
      console.log("🔄 Retrying bot connection...");
      // The bot will automatically retry on next polling cycle
    }, 10000);
  }
});

console.log("Bot is running...");

