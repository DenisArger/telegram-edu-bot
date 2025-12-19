// Test script to debug task filtering
import { getTasksForLesson } from "./tasks.js";
import dotenv from "dotenv";

dotenv.config();

async function testTaskFilter() {
  const lessonId = "rec8OHVT77gIi1zVf"; // From check-tasks.js output
  
  console.log(`Testing task filter for lesson: ${lessonId}\n`);
  
  try {
    const tasks = await getTasksForLesson(lessonId);
    
    console.log(`Found ${tasks.length} tasks:\n`);
    
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.text}`);
      console.log(`   Answers: ${task.answers.join(", ")}`);
      console.log(`   Order: ${task.order}`);
      console.log("");
    });
    
    if (tasks.length === 0) {
      console.log("❌ No tasks found! This is the problem.");
      console.log("\nPossible issues:");
      console.log("1. Filter formula syntax might be wrong");
      console.log("2. Link field filtering might need different syntax");
      console.log("3. Field names might not match exactly");
    } else {
      console.log("✅ Tasks found successfully!");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testTaskFilter().catch(console.error);

