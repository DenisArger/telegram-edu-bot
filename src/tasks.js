// Tasks module - functions for getting tasks and checking answers
import { getRecords } from "./airtable.js";

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
 * Get tasks for a specific lesson
 * @param {string} lessonId - Lesson ID
 * @param {string|number|null} studentClass - Optional student class for filtering tasks
 * @returns {Promise<Array>} Array of task objects in random order
 */
export async function getTasksForLesson(lessonId, studentClass = null) {
  try {
    // Build lesson -> class map for efficient lookup
    const lessonClassMap = await buildLessonClassMap();
    
    // Get all active tasks and filter by lesson in code
    // This is more reliable than filtering Link fields in Airtable formula
    const allRecords = await getRecords("Задания", `{Активно} = TRUE()`);

    // Filter tasks that belong to the specified lesson and class
    const records = allRecords.filter((record) => {
      const fields = record.fields || {};
      const lessonField = fields["Урок"];
      
      // Check if task belongs to the lesson
      let belongsToLesson = false;
      let taskLessonId = null;
      
      if (Array.isArray(lessonField)) {
        belongsToLesson = lessonField.includes(lessonId);
        taskLessonId = lessonField.find(lid => lid === lessonId) || (lessonField.length > 0 ? lessonField[0] : null);
      } else {
        belongsToLesson = lessonField === lessonId;
        taskLessonId = lessonField;
      }
      
      if (!belongsToLesson) {
        return false;
      }
      
      // Get class from lesson (via topic)
      // Class is stored in Topic, not in Task
      // Get class for the task's lesson from the map
      const taskClass = taskLessonId ? lessonClassMap.get(taskLessonId) : null;
      
      // Helper function to normalize class value
      // Handles: numbers, strings, Single select (string or object with name property), arrays
      const normalizeClassValue = (value) => {
        if (value === null || value === undefined || value === "") {
          return null;
        }
        
        // Handle arrays (Link fields or multiple select)
        if (Array.isArray(value)) {
          return value
            .map(tc => {
              if (tc === null || tc === undefined || tc === "") {
                return null;
              }
              // Handle Single select object {name: "3"}
              if (typeof tc === 'object' && tc.name !== undefined) {
                return String(tc.name).trim();
              }
              // Convert to string and trim
              return String(tc).trim();
            })
            .filter(v => v !== null && v !== "");
        }
        
        // Handle Single select object {name: "3"}
        if (typeof value === 'object' && value.name !== undefined) {
          const normalized = String(value.name).trim();
          return normalized !== "" ? normalized : null;
        }
        
        // Handle primitive values (number, string)
        const normalized = String(value).trim();
        return normalized !== "" ? normalized : null;
      };
      
      // Normalize student class
      const normalizedStudentClass = normalizeClassValue(studentClass);
      
      // If student has a class, filter tasks
      if (normalizedStudentClass !== null) {
        // Normalize task class
        const normalizedTaskClass = normalizeClassValue(taskClass);
        
        // If task has no class specified, show it to everyone
        if (normalizedTaskClass === null || (Array.isArray(normalizedTaskClass) && normalizedTaskClass.length === 0)) {
          return true;
        }
        
        // Check if classes match
        let matches = false;
        if (Array.isArray(normalizedTaskClass)) {
          // Task has multiple classes (Link field) - check if student's class matches any
          matches = normalizedTaskClass.some(tc => tc === normalizedStudentClass);
        } else {
          // Task has single class - direct comparison
          matches = normalizedTaskClass === normalizedStudentClass;
        }
        
        return matches;
      } else {
        // If student has no class, show only tasks without class specified
        // (don't show class-specific tasks to students without class)
        const normalizedTaskClass = normalizeClassValue(taskClass);
        
        if (normalizedTaskClass === null || (Array.isArray(normalizedTaskClass) && normalizedTaskClass.length === 0)) {
          return true;
        }
        return false;
      }
    });

    const tasks = records.map((record) => {
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
    });

    // Return tasks in random order
    return shuffleArray(tasks);
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

