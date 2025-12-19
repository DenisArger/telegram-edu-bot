// Progress module - saving student progress to Airtable
import { createRecord } from "./airtable.js";

/**
 * Save student progress to Airtable
 * @param {string} studentId - Student record ID
 * @param {string} taskId - Task record ID
 * @param {string} answer - Student's answer
 * @param {boolean} isCorrect - Whether the answer is correct
 * @returns {Promise<Object>} Created record
 */
export async function saveProgress(studentId, taskId, answer, isCorrect) {
  try {
    const record = await createRecord("Прогресс", {
      Ученик: [studentId],
      Задание: [taskId],
      "Ответ ученика": answer || "",
      Верно: isCorrect,
    });

    return record;
  } catch (error) {
    console.error("Error saving progress:", error);
    throw error;
  }
}
