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
    console.log(`[DEBUG] getTasksForLesson called: lessonId="${lessonId}", studentClass="${studentClass}" (type: ${typeof studentClass})`);
    
    // Get all active tasks and filter by lesson in code
    // This is more reliable than filtering Link fields in Airtable formula
    const allRecords = await getRecords("Задания", `{Активно} = TRUE()`);
    console.log(`[DEBUG] Total active tasks: ${allRecords.length}`);

    // Filter tasks that belong to the specified lesson and class
    let lessonMatchCount = 0;
    let classMatchCount = 0;
    
    const records = allRecords.filter((record) => {
      const fields = record.fields || {};
      const lessonField = fields["Урок"];
      const taskText = fields["Текст задания"] || "No text";
      
      // Check if task belongs to the lesson
      let belongsToLesson = false;
      if (Array.isArray(lessonField)) {
        belongsToLesson = lessonField.includes(lessonId);
      } else {
        belongsToLesson = lessonField === lessonId;
      }
      
      if (!belongsToLesson) {
        console.log(`[DEBUG] Task ${record.id.substring(0, 8)}...: lesson mismatch - task lesson: ${JSON.stringify(lessonField)}, required: ${lessonId}`);
        return false;
      }
      
      lessonMatchCount++;
      
      // Filter by class
      const taskClass = fields["Класс"];
      
      // If student has a class, filter tasks
      if (studentClass !== null && studentClass !== undefined && studentClass !== "") {
        const normalizedStudentClass = String(studentClass).trim();
        
        // If task has no class specified, show it to everyone
        if (taskClass === null || taskClass === undefined || taskClass === "") {
          console.log(`[DEBUG] Task ${record.id.substring(0, 8)}...: no class, showing to student class "${normalizedStudentClass}"`);
          classMatchCount++;
          return true;
        }
        
        // Normalize task class value(s) for comparison
        // Handle both numbers (3, 5) and strings ("3", "5")
        let normalizedTaskClass = null;
        if (Array.isArray(taskClass)) {
          // Handle Link field (array) - normalize each value
          normalizedTaskClass = taskClass.map(tc => {
            // Convert to string and trim, handle both numbers and strings
            const val = tc !== null && tc !== undefined ? String(tc).trim() : "";
            return val;
          }).filter(v => v !== "");
        } else {
          // Convert to string and trim
          normalizedTaskClass = taskClass !== null && taskClass !== undefined ? String(taskClass).trim() : "";
        }
        
        // Check if classes match (case-insensitive, handle empty strings)
        let matches = false;
        if (Array.isArray(normalizedTaskClass)) {
          matches = normalizedTaskClass.some(tc => tc === normalizedStudentClass);
        } else {
          matches = normalizedTaskClass === normalizedStudentClass;
        }
        
        console.log(`[DEBUG] Task ${record.id.substring(0, 8)}...: studentClass="${normalizedStudentClass}", taskClass="${JSON.stringify(normalizedTaskClass)}" (raw: ${JSON.stringify(taskClass)}, type: ${typeof taskClass}), matches=${matches}, text: "${taskText.substring(0, 50)}..."`);
        
        if (matches) {
          classMatchCount++;
        }
        return matches;
      } else {
        // If student has no class, show only tasks without class specified
        // (don't show class-specific tasks to students without class)
        if (taskClass === null || taskClass === undefined || taskClass === "") {
          console.log(`[DEBUG] Task ${record.id.substring(0, 8)}...: no class, showing to student without class`);
          classMatchCount++;
          return true;
        }
        console.log(`[DEBUG] Task ${record.id.substring(0, 8)}...: has class "${JSON.stringify(taskClass)}", hiding from student without class`);
        return false;
      }
    });
    
    console.log(`[DEBUG] Filtering summary: ${lessonMatchCount} tasks match lesson, ${classMatchCount} tasks match class filter`);
    
    console.log(`[DEBUG] Filtered tasks for lesson "${lessonId}" and class "${studentClass}": ${records.length} tasks`);

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

