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
 * Build a map of lesson -> topic -> class for efficient lookup
 * @returns {Promise<Map<string, string>>} Map of lessonId -> class
 */
async function buildLessonClassMap() {
  try {
    // Get all lessons with their topics
    const lessons = await getRecords("Уроки");
    
    // Get all topics with their classes
    const topics = await getRecords("Темы");
    
    // Build topic -> class map
    const topicClassMap = new Map();
    topics.forEach((topic) => {
      const fields = topic.fields || {};
      const topicClass = fields["Класс"];
      
      // Normalize class value (handle Single select)
      let normalizedClass = null;
      if (topicClass !== null && topicClass !== undefined && topicClass !== "") {
        if (typeof topicClass === 'object' && topicClass.name !== undefined) {
          normalizedClass = String(topicClass.name).trim();
        } else {
          normalizedClass = String(topicClass).trim();
        }
        if (normalizedClass === "") {
          normalizedClass = null;
        }
      }
      
      topicClassMap.set(topic.id, normalizedClass);
    });
    
    // Build lesson -> class map
    const lessonClassMap = new Map();
    lessons.forEach((lesson) => {
      const fields = lesson.fields || {};
      const topicField = fields["Тема"];
      
      // Get topic ID(s) from lesson
      let topicIds = [];
      if (Array.isArray(topicField)) {
        topicIds = topicField;
      } else if (topicField) {
        topicIds = [topicField];
      }
      
      // Get class from first topic (if lesson has multiple topics, use first one)
      if (topicIds.length > 0) {
        const topicId = topicIds[0];
        const topicClass = topicClassMap.get(topicId);
        lessonClassMap.set(lesson.id, topicClass);
      } else {
        // Lesson has no topic, so no class
        lessonClassMap.set(lesson.id, null);
      }
    });
    
    return lessonClassMap;
  } catch (error) {
    console.error("Error building lesson-class map:", error);
    // Return empty map on error
    return new Map();
  }
}

/**
 * Normalize class value for comparison
 * @param {any} value - Class value (string, number, object, etc.)
 * @returns {string|null} Normalized class value or null
 */
function normalizeClassValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  
  if (Array.isArray(value)) {
    // Handle arrays - take first value
    if (value.length > 0) {
      return normalizeClassValue(value[0]);
    }
    return null;
  }
  
  // Handle Single select object {name: "3"}
  if (typeof value === 'object' && value.name !== undefined) {
    const normalized = String(value.name).trim();
    return normalized !== "" ? normalized : null;
  }
  
  // Handle primitive values (number, string)
  const normalized = String(value).trim();
  return normalized !== "" ? normalized : null;
}

/**
 * Get all available lessons, optionally filtered by student class
 * @param {string|number|null} studentClass - Optional student class for filtering
 * @returns {Promise<Array>} Array of lesson objects
 */
export async function getAvailableLessons(studentClass = null) {
  try {
    const records = await getRecords("Уроки");
    
    // If no class filter, return all lessons
    if (studentClass === null || studentClass === undefined || studentClass === "") {
      return records.map((record) => ({
        id: record.id,
        name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
      }));
    }
    
    // Normalize student class
    const normalizedStudentClass = normalizeClassValue(studentClass);
    
    if (normalizedStudentClass === null) {
      return records.map((record) => ({
        id: record.id,
        name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
      }));
    }
    
    // Build lesson -> class map
    const lessonClassMap = await buildLessonClassMap();
    
    // Filter lessons by class
    const filteredLessons = records.filter((record) => {
      const lessonClass = lessonClassMap.get(record.id);
      const normalizedLessonClass = normalizeClassValue(lessonClass);
      
      // If lesson has no class, show it to everyone
      if (normalizedLessonClass === null) {
        return true;
      }
      
      // Check if classes match
      return normalizedLessonClass === normalizedStudentClass;
    });
    
    return filteredLessons.map((record) => ({
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

