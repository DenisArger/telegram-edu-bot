// Configuration module - loads and validates environment variables
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  airtableApiKey: process.env.AIRTABLE_API_KEY,
  airtableBaseId: process.env.AIRTABLE_BASE_ID,
};

// Validate required environment variables
function validateConfig() {
  const missing = [];

  if (!config.telegramToken) {
    missing.push("TELEGRAM_BOT_TOKEN");
  }

  if (!config.airtableApiKey) {
    missing.push("AIRTABLE_API_KEY");
  }

  if (!config.airtableBaseId) {
    missing.push("AIRTABLE_BASE_ID");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

// Validate on module load
validateConfig();

