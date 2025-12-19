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
 * Get tasks for a specific lesson
 * @param {string} lessonId - Lesson ID
 * @param {string|number|null} studentClass - Optional student class for filtering tasks
 * @returns {Promise<Array>} Array of task objects in random order
 */
export async function getTasksForLesson(lessonId, studentClass = null) {
  try {
    // Get all active tasks and filter by lesson in code
    // This is more reliable than filtering Link fields in Airtable formula
    const allRecords = await getRecords("Задания", `{Активно} = TRUE()`);

    // Filter tasks that belong to the specified lesson and class
    const records = allRecords.filter((record) => {
      const fields = record.fields || {};
      const lessonField = fields["Урок"];
      
      // Check if task belongs to the lesson
      let belongsToLesson = false;
      if (Array.isArray(lessonField)) {
        belongsToLesson = lessonField.includes(lessonId);
      } else {
        belongsToLesson = lessonField === lessonId;
      }
      
      if (!belongsToLesson) {
        return false;
      }
      
      // Filter by class if student class is provided
      if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
        const taskClass = fields["Класс"];
        
        // If task has no class specified, show it to everyone
        if (taskClass === null || taskClass === undefined || taskClass === "") {
          return true;
        }
        
        // Normalize class values for comparison (handle numbers: 3, 5, etc.)
        // Convert to string for consistent comparison
        const normalizedStudentClass = String(studentClass).trim();
        
        // If task has class, show only to students of that class
        // Support both single value and array (Link field)
        if (Array.isArray(taskClass)) {
          return taskClass.some(tc => String(tc).trim() === normalizedStudentClass);
        }
        return String(taskClass).trim() === normalizedStudentClass;
      }
      
      // If no student class provided, return all tasks for the lesson
      return true;
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

