// Script to check tasks for a specific lesson
import Airtable from "airtable";
import { config } from "./config.js";
import dotenv from "dotenv";

dotenv.config();

async function checkTasks() {
  console.log("Checking tasks in Airtable...\n");

  try {
    Airtable.configure({
      apiKey: config.airtableApiKey,
    });

    const base = Airtable.base(config.airtableBaseId);

    // Get all students to see their current lessons
    console.log("=== Ученики ===");
    const students = [];
    await base("Ученики")
      .select()
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          const fields = record.fields;
          const telegramId = fields["Telegram ID"];
          const currentLesson = fields["Текущий урок"];
          
          console.log(`Telegram ID: ${telegramId}`);
          console.log(`  Текущий урок: ${currentLesson ? currentLesson[0] : "не назначен"}`);
          console.log(`  Record ID: ${record.id}`);
          console.log("");
          
          if (currentLesson && currentLesson.length > 0) {
            students.push({
              telegramId,
              lessonId: currentLesson[0],
              recordId: record.id,
            });
          }
        });
        fetchNextPage();
      });

    // Get all lessons
    console.log("\n=== Уроки ===");
    const lessons = new Map();
    try {
      await base("Уроки")
        .select()
        .eachPage((pageRecords, fetchNextPage) => {
          pageRecords.forEach((record) => {
            lessons.set(record.id, {
              id: record.id,
              name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
            });
            console.log(`ID: ${record.id}, Название: ${lessons.get(record.id).name}`);
          });
          fetchNextPage();
        });
    } catch (error) {
      console.log("Таблица 'Уроки' не найдена или недоступна");
      console.log("Используйте ID урока напрямую в поле 'Текущий урок'");
    }

    // Get all tasks
    console.log("\n=== Задания ===");
    const tasks = [];
    await base("Задания")
      .select()
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          const fields = record.fields;
          const isActive = fields["Активно"] === true;
          const lesson = fields["Урок"];
          const taskText = fields["Текст задания"] || "";
          const order = fields["order"] || fields["Порядок"] || 0;

          tasks.push({
            id: record.id,
            isActive,
            lesson: lesson ? (Array.isArray(lesson) ? lesson[0] : lesson) : null,
            taskText: taskText.substring(0, 50) + (taskText.length > 50 ? "..." : ""),
            order,
          });

          console.log(`ID: ${record.id}`);
          console.log(`  Активно: ${isActive ? "✅" : "❌"}`);
          console.log(`  Урок: ${lesson ? (Array.isArray(lesson) ? lesson[0] : lesson) : "не назначен"}`);
          console.log(`  Текст: ${taskText.substring(0, 50)}${taskText.length > 50 ? "..." : ""}`);
          console.log(`  Порядок: ${order}`);
          console.log("");
        });
        fetchNextPage();
      });

    // Check tasks for each student's lesson
    console.log("\n=== Проверка заданий для учеников ===");
    students.forEach((student) => {
      console.log(`\nУченик с Telegram ID: ${student.telegramId}`);
      console.log(`Текущий урок: ${student.lessonId}`);
      
      const lessonName = lessons.get(student.lessonId)?.name || student.lessonId;
      console.log(`Название урока: ${lessonName}`);

      const activeTasks = tasks.filter(
        (task) => task.isActive && task.lesson === student.lessonId
      );

      if (activeTasks.length === 0) {
        console.log("❌ Нет активных заданий для этого урока!");
        console.log("\nЧто нужно сделать:");
        console.log("1. Создайте задания в таблице 'Задания'");
        console.log("2. Установите 'Активно' = TRUE");
        console.log(`3. Установите 'Урок' = ${student.lessonId}`);
        console.log("4. Заполните 'Текст задания'");
        console.log("5. Заполните 'Правильные ответы' (каждый ответ с новой строки)");
        console.log("6. Заполните 'Комментарий (верно)' и 'Комментарий (ошибка)'");
        console.log("7. Установите 'order' или 'Порядок' для сортировки");
      } else {
        console.log(`✅ Найдено активных заданий: ${activeTasks.length}`);
        activeTasks
          .sort((a, b) => a.order - b.order)
          .forEach((task, index) => {
            console.log(`  ${index + 1}. ${task.taskText}`);
          });
      }
    });

    // Summary
    console.log("\n=== Итоговая статистика ===");
    console.log(`Всего учеников: ${students.length}`);
    console.log(`Всего уроков: ${lessons.size}`);
    console.log(`Всего заданий: ${tasks.length}`);
    console.log(`Активных заданий: ${tasks.filter((t) => t.isActive).length}`);
  } catch (error) {
    console.error("Ошибка:", error);
  }
}

checkTasks().catch(console.error);

