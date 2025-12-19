// Student module - functions for working with student data
import { getRecords, createRecord, updateRecord } from "./airtable.js";

/**
 * Get student by Telegram ID
 * @param {number} telegramId - Telegram user ID
 * @returns {Promise<Object|null>} Student record or null if not found
 */
export async function getStudentByTelegramId(telegramId) {
  try {
    const records = await getRecords(
      "Ученики",
      `{Telegram ID} = ${telegramId}`
    );
    
    if (records.length === 0) {
      return null;
    }
    
    // Convert Airtable record to plain object
    const record = records[0];
    return {
      id: record.id,
      fields: record.fields,
    };
  } catch (error) {
    console.error(`Error getting student by Telegram ID ${telegramId}:`, error);
    throw error;
  }
}

/**
 * Create a new student record
 * @param {number} telegramId - Telegram user ID
 * @param {string} lessonId - Lesson ID to assign
 * @param {string} name - Optional student name
 * @returns {Promise<Object>} Created student record
 */
export async function createStudent(telegramId, lessonId, name = null) {
  try {
    const fields = {
      "Telegram ID": telegramId,
      "Текущий урок": [lessonId],
    };

    // Add name if provided and field exists
    if (name) {
      fields["Имя"] = name;
    }

    const record = await createRecord("Ученики", fields);
    
    return {
      id: record.id,
      fields: record.fields,
    };
  } catch (error) {
    console.error(`Error creating student for Telegram ID ${telegramId}:`, error);
    throw error;
  }
}

/**
 * Get all available lessons
 * @returns {Promise<Array>} Array of lesson objects
 */
export async function getAvailableLessons() {
  try {
    const records = await getRecords("Уроки");
    
    return records.map((record) => ({
      id: record.id,
      name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
    }));
  } catch (error) {
    console.error("Error getting available lessons:", error);
    throw error;
  }
}

/**
 * Update student's current lesson
 * @param {string} studentId - Student record ID
 * @param {string} lessonId - New lesson ID
 * @returns {Promise<Object>} Updated student record
 */
export async function updateStudentLesson(studentId, lessonId) {
  try {
    const record = await updateRecord("Ученики", studentId, {
      "Текущий урок": [lessonId],
    });
    
    return {
      id: record.id,
      fields: record.fields,
    };
  } catch (error) {
    console.error(`Error updating student lesson:`, error);
    throw error;
  }
}

