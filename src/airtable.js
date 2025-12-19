// Airtable API module - using official Airtable.js library
import Airtable from "airtable";
import { config } from "./config.js";

// Initialize Airtable base
Airtable.configure({
  apiKey: config.airtableApiKey,
});

const base = Airtable.base(config.airtableBaseId);

/**
 * Get records from Airtable table
 * @param {string} tableName - Name of the table
 * @param {string} filterFormula - Optional Airtable filter formula
 * @returns {Promise<Array>} Array of records
 */
export async function getRecords(tableName, filterFormula = "") {
  try {
    const records = [];

    // Build select options - only include filterByFormula if it's not empty
    const selectOptions = {};
    if (filterFormula && filterFormula.trim().length > 0) {
      selectOptions.filterByFormula = filterFormula;
    }

    const query = base(tableName).select(selectOptions);

    await query.eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });

    return records;
  } catch (error) {
    console.error(`Error fetching records from table "${tableName}":`, error);
    throw error;
  }
}

/**
 * Create a record in Airtable table
 * @param {string} tableName - Name of the table
 * @param {Object} fields - Fields to create
 * @returns {Promise<Object>} Created record
 */
export async function createRecord(tableName, fields) {
  try {
    const record = await base(tableName).create(fields);
    return record;
  } catch (error) {
    console.error(`Error creating record in table "${tableName}":`, error);
    throw error;
  }
}

/**
 * Update a record in Airtable table
 * @param {string} tableName - Name of the table
 * @param {string} recordId - Record ID to update
 * @param {Object} fields - Fields to update
 * @returns {Promise<Object>} Updated record
 */
export async function updateRecord(tableName, recordId, fields) {
  try {
    const record = await base(tableName).update(recordId, fields);
    return record;
  } catch (error) {
    console.error(
      `Error updating record ${recordId} in table "${tableName}":`,
      error
    );
    throw error;
  }
}
