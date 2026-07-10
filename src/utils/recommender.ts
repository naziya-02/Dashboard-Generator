import { Dataset, Widget } from '../types';

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Get colors for KPI cards and charts
const COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
];

export const recommendDashboard = (dataset: Dataset): Widget[] => {
  const widgets: Widget[] = [];
  const columns = dataset.columns;

  const numericCols = columns.filter(c => c.type === 'numeric');
  const temporalCols = columns.filter(c => c.type === 'temporal');
  const categoricalCols = columns.filter(c => c.type === 'categorical');

  // --- 1. KPI WIDGETS ---
  // Create KPI cards for up to 4 key numeric columns
  const kpiColumns = numericCols.slice(0, 4);
  kpiColumns.forEach((col, idx) => {
    const isRate = /rate|pct|percent|ratio|avg|grade|score/i.test(col.name);
    const stat = isRate ? 'avg' : 'sum';
    const title = `${isRate ? 'Avg' : 'Total'} ${col.name}`;

    widgets.push({
      id: generateId(),
      type: 'kpi',
      title,
      kpiColumn: col.name,
      kpiStat: stat,
      color: COLORS[idx % COLORS.length],
      gridSpan: 1 // taking 25% width
    });
  });

  // If we have fewer than 2 numeric KPIs but have categorical columns, add a unique count KPI
  if (widgets.length < 3 && categoricalCols.length > 0) {
    const catCol = categoricalCols[0];
    widgets.push({
      id: generateId(),
      type: 'kpi',
      title: `Unique ${catCol.name}s`,
      kpiColumn: catCol.name,
      kpiStat: 'unique',
      color: COLORS[widgets.length % COLORS.length],
      gridSpan: 1
    });
  }

  // Add a generic total records count card if widgets are empty
  if (widgets.length === 0) {
    widgets.push({
      id: generateId(),
      type: 'kpi',
      title: 'Total Records',
      kpiColumn: columns[0]?.name,
      kpiStat: 'count',
      color: COLORS[0],
      gridSpan: 1
    });
  }

  // Adjust spans if there are less than 4 KPIs to fill rows nicely
  const kpiCount = widgets.filter(w => w.type === 'kpi').length;
  if (kpiCount > 0 && kpiCount < 4) {
    const span = Math.floor(4 / kpiCount) as 1 | 2 | 3 | 4;
    widgets.filter(w => w.type === 'kpi').forEach(w => {
      w.gridSpan = span;
    });
  }

  // --- 2. CHART WIDGETS ---
  
  // Rule A: Temporal / Time Series Trends
  // If date/time and numeric columns exist, make a line/area chart showing timeline trends
  if (temporalCols.length > 0 && numericCols.length > 0) {
    const dateCol = temporalCols[0];
    const valCol = numericCols[0]; // first numeric column (e.g., Sales, Visitors)
    
    widgets.push({
      id: generateId(),
      type: 'chart',
      title: `${valCol.name} Trend over Time`,
      chartType: 'area',
      xAxisKey: dateCol.name,
      yAxisKey: valCol.name,
      aggregation: 'sum',
      color: COLORS[0],
      gridSpan: 2 // 50% width
    });
  }

  // Rule B: Categorical Distributions / Comparisons
  // If categories and numeric values exist, create comparison bar charts
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const catCol = categoricalCols[0];
    // Find numeric column (prefer another numeric column if date was matched to the first one)
    const valCol = numericCols.length > 1 ? numericCols[1] : numericCols[0];

    widgets.push({
      id: generateId(),
      type: 'chart',
      title: `${valCol.name} by ${catCol.name}`,
      chartType: 'bar',
      xAxisKey: catCol.name,
      yAxisKey: valCol.name,
      aggregation: 'sum',
      color: COLORS[1],
      gridSpan: 2 // 50% width
    });
  }

  // Rule C: Part-to-Whole Ratio (Donut / Pie)
  // If we have a category column with very small cardinality (2 to 6 unique values)
  const lowCardCat = categoricalCols.find(c => c.stats.uniqueCount >= 2 && c.stats.uniqueCount <= 6);
  if (lowCardCat) {
    const measure = numericCols[0];
    const aggregation = measure ? 'sum' : 'count';
    const title = measure 
      ? `${measure.name} Share by ${lowCardCat.name}`
      : `Record Count Share by ${lowCardCat.name}`;

    widgets.push({
      id: generateId(),
      type: 'chart',
      title,
      chartType: 'donut',
      xAxisKey: lowCardCat.name,
      yAxisKey: measure ? measure.name : undefined,
      aggregation: aggregation as any,
      color: COLORS[2],
      gridSpan: 2 // 50% width
    });
  }

  // Rule D: Scatter Plots (Correlation)
  // If we have at least 2 distinct numeric columns, show their correlation
  if (numericCols.length >= 2) {
    const xCol = numericCols[0];
    const yCol = numericCols[1];

    widgets.push({
      id: generateId(),
      type: 'chart',
      title: `${yCol.name} vs. ${xCol.name} (Correlation)`,
      chartType: 'scatter',
      xAxisKey: xCol.name,
      yAxisKey: yCol.name,
      aggregation: 'none', // scatter uses raw row coordinates
      color: COLORS[3],
      gridSpan: 2 // 50% width
    });
  }

  // Rule E: Radar Chart
  // If we have a categorical column with medium cardinality (3 to 8 values) and a numeric column
  const midCardCat = categoricalCols.find(c => c.stats.uniqueCount >= 3 && c.stats.uniqueCount <= 8 && c !== lowCardCat);
  if (midCardCat && numericCols.length > 0) {
    const valCol = numericCols[0];
    widgets.push({
      id: generateId(),
      type: 'chart',
      title: `${valCol.name} Breakdown by ${midCardCat.name}`,
      chartType: 'radar',
      xAxisKey: midCardCat.name,
      yAxisKey: valCol.name,
      aggregation: 'avg',
      color: COLORS[4],
      gridSpan: 2
    });
  }

  // Clean widget spacing. If we have odd numbers of charts (which take span 2), let's span the first chart to 4 (100% width) or balance it out
  const chartWidgets = widgets.filter(w => w.type === 'chart');
  if (chartWidgets.length > 0 && chartWidgets.length % 2 !== 0) {
    // Make the first chart (e.g., the trend chart) occupy the full width row
    chartWidgets[0].gridSpan = 4;
  }

  return widgets;
};

// Aggregation helper for calculating dashboard state
export const aggregateData = (
  rows: any[],
  xAxisKey: string,
  yAxisKey: string | undefined,
  aggregation: string
): { x: string | number; y: number }[] => {
  if (!yAxisKey || aggregation === 'none') {
    // No numeric column or no aggregation, return raw rows mapping
    return rows.map((r, index) => {
      const xRaw = r[xAxisKey];
      let x: string | number = '';
      if (xRaw instanceof Date) {
        x = xRaw.toISOString().split('T')[0];
      } else {
        x = xRaw !== null && xRaw !== undefined ? String(xRaw) : `Record ${index + 1}`;
      }

      const yVal = yAxisKey ? Number(r[yAxisKey]) : 1;
      return { x, y: isNaN(yVal) ? 0 : yVal };
    });
  }

  // Aggregate rows by x-axis values
  const grouped: Record<string | number, number[]> = {};
  
  rows.forEach((row) => {
    const xRaw = row[xAxisKey];
    if (xRaw === null || xRaw === undefined) return;
    
    let groupKey: string | number;
    if (xRaw instanceof Date) {
      groupKey = xRaw.toISOString().split('T')[0];
    } else {
      groupKey = String(xRaw);
    }

    const yVal = Number(row[yAxisKey]);
    if (isNaN(yVal)) return;

    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(yVal);
  });

  const result = Object.entries(grouped).map(([x, values]) => {
    let y = 0;
    if (aggregation === 'sum') {
      y = values.reduce((sum, v) => sum + v, 0);
    } else if (aggregation === 'avg') {
      y = values.reduce((sum, v) => sum + v, 0) / values.length;
    } else if (aggregation === 'min') {
      y = Math.min(...values);
    } else if (aggregation === 'max') {
      y = Math.max(...values);
    } else if (aggregation === 'count') {
      y = values.length;
    }

    // Round to 2 decimal places
    y = parseFloat(y.toFixed(2));
    
    // Attempt to keep numbers as keys for x-axis sorting if they represent years or numbers
    const xNum = Number(x);
    const sortedKey = !isNaN(xNum) && /^\d+$/.test(x) ? xNum : x;

    return { x: sortedKey, y };
  });

  // Sort logically (by timeline or numeric size if x is numerical, or alphabetical if string)
  result.sort((a, b) => {
    if (typeof a.x === 'number' && typeof b.x === 'number') {
      return a.x - b.x;
    }
    // Attempt simple date matching if formatting fits "YYYY-MM-DD"
    const aStr = String(a.x);
    const bStr = String(b.x);
    return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
  });

  return result;
};
