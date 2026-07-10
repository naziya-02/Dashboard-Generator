export type DataType = 'numeric' | 'temporal' | 'categorical' | 'text';

export interface ColumnStats {
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  count: number;
  uniqueCount: number;
  mostFrequent?: { value: string | number; count: number };
}

export interface ColumnInfo {
  name: string;
  type: DataType;
  stats: ColumnStats;
}

export type RowData = Record<string, string | number | Date | null | undefined>;

export interface Dataset {
  name: string;
  columns: ColumnInfo[];
  rows: RowData[];
}

export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'scatter' | 'radar';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

export interface Widget {
  id: string;
  type: 'kpi' | 'chart';
  title: string;
  // Chart configurations
  chartType?: ChartType;
  xAxisKey?: string;
  yAxisKey?: string;
  aggregation?: AggregationType;
  // KPI configurations
  kpiColumn?: string;
  kpiStat?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'unique';
  color?: string;
  gridSpan?: 1 | 2 | 3 | 4; // 1 = 25%, 2 = 50%, 3 = 75%, 4 = 100% in our grid
}

export interface FilterState {
  searchQuery: string;
  categoricalFilters: Record<string, string[]>; // column name -> selected values
  dateRange: {
    start: Date | null;
    end: Date | null;
    column: string | null;
  };
  numericRanges: Record<string, { min: number; max: number; currentMin: number; currentMax: number }>;
}
