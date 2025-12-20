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

/**
 * Get all available subjects, optionally filtered by student class
 * @param {string|number|null} studentClass - Optional student class for filtering
 * @returns {Promise<Array>} Array of subject objects
 */
export async function getAvailableSubjects(studentClass = null) {
  try {
    const subjects = await getRecords("Предметы");
    
    // If no class filter, return all subjects
    if (studentClass === null || studentClass === undefined || studentClass === "") {
      const result = subjects.map((record) => ({
        id: record.id,
        name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
      }));
      return result;
    }
    
    // Normalize student class
    const normalizedStudentClass = normalizeClassValue(studentClass);
    
    if (normalizedStudentClass === null) {
      const result = subjects.map((record) => ({
        id: record.id,
        name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
      }));
      return result;
    }
    
    // Filter subjects by class
    const filteredSubjects = subjects.filter((record) => {
      const fields = record.fields || {};
      const subjectClass = fields["Класс"];
      const normalizedSubjectClass = normalizeClassValue(subjectClass);
      
      // If subject has no class, show it to everyone
      if (normalizedSubjectClass === null) {
        return true;
      }
      
      // Check if classes match
      const matches = normalizedSubjectClass === normalizedStudentClass;
      return matches;
    });
    
    const result = filteredSubjects.map((record) => ({
      id: record.id,
      name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
    }));
    return result;
  } catch (error) {
    console.error("Error getting available subjects:", error);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Get sections for a specific subject
 * @param {string} subjectId - Subject ID
 * @returns {Promise<Array>} Array of section objects
 */
export async function getSectionsForSubject(subjectId) {
  try {
    const sections = await getRecords("Разделы");
    
    // Filter sections that belong to the specified subject
    const subjectSections = sections.filter((record) => {
      const fields = record.fields || {};
      const subjectField = fields["Предмет"];
      
      // Check if section belongs to the subject
      let belongs = false;
      if (Array.isArray(subjectField)) {
        belongs = subjectField.includes(subjectId);
      } else {
        belongs = subjectField === subjectId;
      }
      if (belongs) {
      }
      return belongs;
    });
    
    return subjectSections.map((record) => ({
      id: record.id,
      name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
    }));
  } catch (error) {
    console.error(`Error getting sections for subject ${subjectId}:`, error);
    console.error(`Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Get topics for a specific section, optionally filtered by student class
 * @param {string} sectionId - Section ID
 * @param {string|number|null} studentClass - Optional student class for filtering
 * @returns {Promise<Array>} Array of topic objects
 */
export async function getTopicsForSection(sectionId, studentClass = null) {
  try {
    const topics = await getRecords("Темы");
    
    // Filter topics that belong to the specified section
    const sectionTopics = topics.filter((record) => {
      const fields = record.fields || {};
      const sectionField = fields["Раздел"];
      
      // Check if topic belongs to the section
      let belongs = false;
      if (Array.isArray(sectionField)) {
        belongs = sectionField.includes(sectionId);
      } else {
        belongs = sectionField === sectionId;
      }
      if (belongs) {
      }
      return belongs;
    });
    
    // If no class filter, return all topics for this section
    if (studentClass === null || studentClass === undefined || studentClass === "") {
      const result = sectionTopics.map((record) => ({
        id: record.id,
        name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
      }));
      return result;
    }
    
    // Normalize student class
    const normalizedStudentClass = normalizeClassValue(studentClass);
    
    if (normalizedStudentClass === null) {
      const result = sectionTopics.map((record) => ({
        id: record.id,
        name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
      }));
      return result;
    }
    
    // Filter topics by class
    const filteredTopics = sectionTopics.filter((record) => {
      const fields = record.fields || {};
      const topicClass = fields["Класс"];
      const normalizedTopicClass = normalizeClassValue(topicClass);
      
      // If topic has no class, show it to everyone
      if (normalizedTopicClass === null) {
        return true;
      }
      
      // Check if classes match
      return normalizedTopicClass === normalizedStudentClass;
    });
    
    const result = filteredTopics.map((record) => ({
      id: record.id,
      name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
    }));
    return result;
  } catch (error) {
    console.error(`Error getting topics for section ${sectionId}:`, error);
    console.error(`Error stack:`, error.stack);
    throw error;
  }
}

/**
 * Get lessons for a specific topic, optionally filtered by student class
 * @param {string} topicId - Topic ID
 * @param {string|number|null} studentClass - Optional student class for filtering
 * @returns {Promise<Array>} Array of lesson objects
 */
export async function getLessonsForTopic(topicId, studentClass = null) {
  try {
    const lessons = await getRecords("Уроки");
    
    // Filter lessons that belong to the specified topic
    const topicLessons = lessons.filter((record) => {
      const fields = record.fields || {};
      const topicField = fields["Тема"];
      
      // Check if lesson belongs to the topic
      let belongs = false;
      if (Array.isArray(topicField)) {
        belongs = topicField.includes(topicId);
      } else {
        belongs = topicField === topicId;
      }
      if (belongs) {
      }
      return belongs;
    });
    
    // If no class filter, return all lessons for this topic
    if (studentClass === null || studentClass === undefined || studentClass === "") {
      const result = topicLessons.map((record) => ({
        id: record.id,
        name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
      }));
      return result;
    }
    
    // Normalize student class
    const normalizedStudentClass = normalizeClassValue(studentClass);
    
    if (normalizedStudentClass === null) {
      const result = topicLessons.map((record) => ({
        id: record.id,
        name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
      }));
      return result;
    }
    
    // Build lesson -> class map
    const lessonClassMap = await buildLessonClassMap();
    
    // Filter lessons by class
    const filteredLessons = topicLessons.filter((record) => {
      const lessonClass = lessonClassMap.get(record.id);
      const normalizedLessonClass = normalizeClassValue(lessonClass);
      
      // If lesson has no class, show it to everyone
      if (normalizedLessonClass === null) {
        return true;
      }
      
      // Check if classes match
      return normalizedLessonClass === normalizedStudentClass;
    });
    
    const result = filteredLessons.map((record) => ({
      id: record.id,
      name: record.fields["Название"] || record.fields["Имя"] || "Без названия",
    }));
    return result;
  } catch (error) {
    console.error(`Error getting lessons for topic ${topicId}:`, error);
    console.error(`Error stack:`, error.stack);
    throw error;
  }
}

