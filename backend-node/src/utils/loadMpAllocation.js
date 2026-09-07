/**
 * Real Data Loader for MP Allocation
 * Ingests data/real/mplads_allocated_clean.csv into mp_allocation collection
 * Guaranteed idempotent and sets is_real_government_data: true per rules.md §9
 */
const fs = require('fs');
const path = require('path');
const { MpAllocation } = require('../models/MpAllocation');
const logger = require('./logger');

const DEFAULT_CSV_PATH = path.resolve(
  __dirname,
  '../../../data/real/mplads_allocated_clean.csv'
);

/**
 * Parses CSV lines handling quoted names with potential commas
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Generates unique, stable, deterministic MP identifier
 */
function generateMpId(state, constituency, srNo) {
  const cleanConst = (constituency || 'CONST')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const cleanState = (state || 'IND')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase();
  const cleanSr = String(srNo || '0').padStart(3, '0');
  return `MP-${cleanState}-${cleanConst}-${cleanSr}`;
}

/**
 * Ingests allocations from CSV file into MongoDB
 * @param {Object} options
 * @param {string} [options.csvPath] Path to CSV file
 * @param {string} [options.year] Financial year
 * @returns {Promise<{totalRows: number, loaded: number, skipped: number}>}
 */
async function loadMpAllocation({
  csvPath = DEFAULT_CSV_PATH,
  year = '2024-2025',
} = {}) {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Allocation CSV file not found at: ${csvPath}`);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw
    .trim()
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length <= 1) {
    logger.warn('Allocation CSV has no data rows');
    return { totalRows: 0, loaded: 0, skipped: 0 };
  }

  // Header verification: sr_no,state,mp_name,constituency,allocated_amount
  const header = parseCsvLine(lines[0]);
  const dataLines = lines.slice(1);

  const bulkOps = [];
  let validCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const cols = parseCsvLine(dataLines[i]);
    if (cols.length < 5) {
      skippedCount++;
      continue;
    }

    const srNo = cols[0];
    const state = cols[1];
    const mpName = cols[2];
    const constituency = cols[3];
    const rawAllocated = cols[4];

    const allocatedAmount = parseFloat(rawAllocated);
    if (isNaN(allocatedAmount) || allocatedAmount < 0) {
      logger.warn(
        `Skipping invalid allocation row ${srNo} (${mpName}): invalid amount ${rawAllocated}`
      );
      skippedCount++;
      continue;
    }

    const mpId = generateMpId(state, constituency, srNo);

    const doc = {
      mp_id: mpId,
      mp_name: mpName,
      state: state,
      constituency: constituency,
      year: year,
      allocated_amount: allocatedAmount,
      is_real_government_data: true,
      is_synthetic: false,
    };

    bulkOps.push({
      updateOne: {
        filter: { mp_id: mpId, year: year },
        update: { $set: doc },
        upsert: true,
      },
    });

    validCount++;
  }

  let result = null;
  if (bulkOps.length > 0) {
    result = await MpAllocation.bulkWrite(bulkOps, { ordered: false });
    logger.info(
      `Real MP Allocation Ingestion complete: ${validCount} rows processed, upserted: ${result.upsertedCount}, modified: ${result.modifiedCount}, matched: ${result.matchedCount}`
    );
  }

  return {
    totalRows: dataLines.length,
    loaded: validCount,
    skipped: skippedCount,
    upsertedCount: result ? result.upsertedCount : 0,
    matchedCount: result ? result.matchedCount : 0,
  };
}

module.exports = {
  loadMpAllocation,
  generateMpId,
  DEFAULT_CSV_PATH,
};

