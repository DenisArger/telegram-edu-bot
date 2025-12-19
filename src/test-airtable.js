// Test script to check Airtable connection using official library
import Airtable from "airtable";
import { config } from "./config.js";
import dotenv from "dotenv";

dotenv.config();

async function testAirtableConnection() {
  console.log("Testing Airtable connection with official library...");
  console.log(`Base ID: ${config.airtableBaseId}`);
  console.log(`API Key: ${config.airtableApiKey ? config.airtableApiKey.substring(0, 10) + "..." : "NOT SET"}`);
  console.log("\n");

  try {
    // Initialize Airtable
    Airtable.configure({
      apiKey: config.airtableApiKey,
    });

    const base = Airtable.base(config.airtableBaseId);

    // Try to access common table names
    const testTables = ["Ученики", "Задания", "Прогресс"];

    for (const tableName of testTables) {
      try {
        console.log(`Testing table "${tableName}"...`);
        
        const records = [];
        await base(tableName)
          .select({ maxRecords: 1 })
          .eachPage((pageRecords, fetchNextPage) => {
            records.push(...pageRecords);
            fetchNextPage();
          });

        console.log(`✓ Table "${tableName}" is accessible (found ${records.length} record(s))`);
        
        if (records.length > 0) {
          console.log(`  Sample record fields:`, Object.keys(records[0].fields).slice(0, 5));
        }
      } catch (error) {
        console.log(`✗ Table "${tableName}" - Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.log("Error initializing Airtable:", error.message);
  }
}

testAirtableConnection().catch(console.error);
