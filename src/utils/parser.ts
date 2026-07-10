import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DataType, ColumnInfo, ColumnStats, RowData, Dataset } from '../types';

// Helper to check if a value is numeric
const isNumericValue = (val: any): boolean => {
  if (val === null || val === undefined || val === '') return false;
  // Strip currency symbols and commas for testing numeric state
  const cleaned = String(val).replace(/[$,]/g, '').trim();
  if (cleaned === '') return false;
  return !isNaN(Number(cleaned));
};

// Helper to check if a value is a date
const isDateValue = (val: any): boolean => {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number') return false; // Excel date numbers will be parsed, but let's check strings first
  if (typeof val === 'object' && val instanceof Date) return !isNaN(val.getTime());
  
  const str = String(val).trim();
  // Avoid parsing short numbers (like zipcodes or years) as dates
  if (/^\d{1,4}$/.test(str)) return false;
  
  const parsed = Date.parse(str);
  return !isNaN(parsed) && str.length > 4; // minimum format size, e.g. "5/23" or similar
};

// Clean a numeric value
const cleanNumeric = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[$,]/g, '').trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
};

// Parse a Date value
const parseDate = (val: any): Date | null => {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const num = Number(val);
  // Handle Excel serialized dates if SheetJS passed raw numbers
  if (!isNaN(num) && num > 30000 && num < 60000) {
    return new Date((num - 25569) * 86400 * 1000);
  }
  const parsed = new Date(String(val).trim());
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const parseCSV = (csvText: string, filename: string = 'Imported Dataset'): Promise<Dataset> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      complete: (results) => {
        try {
          if (!results.data || results.data.length === 0) {
            throw new Error('The CSV file appears to be empty or could not be parsed.');
          }
          const rawRows = results.data as Record<string, any>[];
          const dataset = profileData(rawRows, filename);
          resolve(dataset);
        } catch (e) {
          reject(e);
        }
      },
      error: (error: any) => {
        reject(error);
      }
    });
  });
};

export const parseExcel = (fileBuffer: ArrayBuffer, filename: string = 'Excel Dataset'): Dataset => {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as Record<string, any>[];
  
  if (rawRows.length === 0) {
    throw new Error('The Excel sheet appears to be empty.');
  }
  
  return profileData(rawRows, filename);
};

export const parseJSON = (jsonText: string, filename: string = 'JSON Dataset'): Dataset => {
  let parsed = JSON.parse(jsonText);
  // Handle case where JSON is an object with a data array or just an array
  if (!Array.isArray(parsed)) {
    if (parsed.data && Array.isArray(parsed.data)) {
      parsed = parsed.data;
    } else if (parsed.rows && Array.isArray(parsed.rows)) {
      parsed = parsed.rows;
    } else {
      // Try to wrap or extract
      const arrays = Object.values(parsed).filter(val => Array.isArray(val));
      if (arrays.length > 0) {
        parsed = arrays[0]; // Take the first array found
      } else {
        throw new Error('JSON format is invalid. It must be an array of objects or contain a nested data array.');
      }
    }
  }
  
  const rawRows = parsed as Record<string, any>[];
  if (rawRows.length === 0) {
    throw new Error('The JSON array is empty.');
  }
  
  return profileData(rawRows, filename);
};

// Main function to profile data and calculate column types & statistics
export const profileData = (rawRows: Record<string, any>[], filename: string): Dataset => {
  const headers = Object.keys(rawRows[0] || {});
  if (headers.length === 0) {
    throw new Error('No columns detected in the dataset.');
  }

  const rowCount = rawRows.length;
  const columns: ColumnInfo[] = [];
  const processedRows: RowData[] = rawRows.map(() => ({}));

  for (const colName of headers) {
    let numericHits = 0;
    let dateHits = 0;
    let emptyHits = 0;

    // First pass: analyze types
    for (let i = 0; i < rowCount; i++) {
      const val = rawRows[i][colName];
      if (val === null || val === undefined || String(val).trim() === '') {
        emptyHits++;
        continue;
      }
      if (isNumericValue(val)) numericHits++;
      if (isDateValue(val)) dateHits++;
    }

    const nonNewCount = rowCount - emptyHits;
    let type: DataType = 'text';

    if (nonNewCount > 0) {
      if (numericHits / nonNewCount > 0.8) {
        type = 'numeric';
      } else if (dateHits / nonNewCount > 0.8) {
        type = 'temporal';
      }
    }

    // Secondary Type Pass: Categorical vs Text/Numeric IDs
    const valuesList: any[] = [];
    const freqMap: Record<string, number> = {};

    for (let i = 0; i < rowCount; i++) {
      let val = rawRows[i][colName];
      
      if (val === null || val === undefined || String(val).trim() === '') {
        processedRows[i][colName] = null;
        continue;
      }

      if (type === 'numeric') {
        const numVal = cleanNumeric(val);
        processedRows[i][colName] = numVal;
        valuesList.push(numVal);
        freqMap[numVal] = (freqMap[numVal] || 0) + 1;
      } else if (type === 'temporal') {
        const dateVal = parseDate(val);
        processedRows[i][colName] = dateVal;
        if (dateVal) {
          valuesList.push(dateVal);
          const dateStr = dateVal.toISOString().split('T')[0];
          freqMap[dateStr] = (freqMap[dateStr] || 0) + 1;
        }
      } else {
        // text or categorical
        const strVal = String(val).trim();
        processedRows[i][colName] = strVal;
        valuesList.push(strVal);
        freqMap[strVal] = (freqMap[strVal] || 0) + 1;
      }
    }

    const uniqueValues = Object.keys(freqMap);
    const uniqueCount = uniqueValues.length;

    // Auto-detect categorical fields: string type with low cardinality
    if (type === 'text') {
      if (uniqueCount <= 15 || (rowCount > 20 && uniqueCount / rowCount < 0.2)) {
        type = 'categorical';
      }
    }

    // Compute column stats
    const stats: ColumnStats = {
      count: rowCount,
      uniqueCount
    };

    // Find most frequent value
    let topVal: string | number = '';
    let topCount = 0;
    for (const [key, count] of Object.entries(freqMap)) {
      if (count > topCount) {
        topCount = count;
        topVal = key;
      }
    }
    if (topCount > 0) {
      stats.mostFrequent = {
        value: type === 'numeric' ? Number(topVal) : topVal,
        count: topCount
      };
    }

    if (type === 'numeric' && valuesList.length > 0) {
      const nums = valuesList as number[];
      const sum = nums.reduce((acc, curr) => acc + curr, 0);
      stats.sum = parseFloat(sum.toFixed(2));
      stats.min = Math.min(...nums);
      stats.max = Math.max(...nums);
      stats.avg = parseFloat((sum / nums.length).toFixed(2));
    }

    columns.push({
      name: colName,
      type,
      stats
    });
  }

  return {
    name: filename,
    columns,
    rows: processedRows
  };
};
