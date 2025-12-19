// Tasks module - functions for getting tasks and checking answers
import { getRecords } from "./airtable.js";

/**
 * Get tasks for a specific lesson
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Array>} Array of task objects
 */
export async function getTasksForLesson(lessonId) {
  try {
    // Get all active tasks and filter by lesson in code
    // This is more reliable than filtering Link fields in Airtable formula
    const allRecords = await getRecords("Задания", `{Активно} = TRUE()`);

    // Filter tasks that belong to the specified lesson
    const records = allRecords.filter((record) => {
      const fields = record.fields || {};
      const lessonField = fields["Урок"];
      
      // Link fields in Airtable are arrays of record IDs
      if (Array.isArray(lessonField)) {
        return lessonField.includes(lessonId);
      }
      // Fallback for single value
      return lessonField === lessonId;
    });

    return records
      .map((record) => {
        const fields = record.fields || {};
        const answersText = fields["Правильные ответы"] || "";
        const order = fields["order"] || fields["Порядок"] || 0;

        return {
          id: record.id,
          text: fields["Текст задания"] || "",
          answers: answersText
            .split("\n")
            .map((a) => a.trim().toLowerCase())
            .filter((a) => a.length > 0),
          correctFeedback: fields["Комментарий (верно)"] || "Правильно! ✅",
          wrongFeedback:
            fields["Комментарий (ошибка)"] || "Неправильно. Попробуйте еще раз.",
          order: Number(order),
        };
      })
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error(`Error getting tasks for lesson ${lessonId}:`, error);
    throw error;
  }
}

/**
 * Check if user answer is correct
 * @param {string} userInput - User's answer
 * @param {Array<string>} answers - Array of correct answers
 * @returns {boolean} True if answer is correct
 */
export function checkAnswer(userInput, answers) {
  if (!userInput || !answers || answers.length === 0) {
    return false;
  }

  const normalizedInput = userInput.trim().toLowerCase();
  return answers.includes(normalizedInput);
}

