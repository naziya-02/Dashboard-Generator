import React from 'react';
import { RowData, Widget } from '../types';

interface MetricCardProps {
  widget: Widget;
  rows: RowData[];
}

export const formatKPIValue = (val: number, columnName: string, statType: string): string => {
  const colLower = columnName.toLowerCase();
  
  if (statType === 'count') {
    return val.toLocaleString();
  }
  
  if (statType === 'unique') {
    return val.toLocaleString();
  }

  // Detect currency columns
  const isCurrency = /revenue|sales|profit|cost|amount|price|spend|mrr|ltv/i.test(colLower);
  // Detect percentage columns
  const isPercentage = /rate|pct|percent|ratio|churn|bounce/i.test(colLower);

  if (isCurrency) {
    if (val >= 1_000_000_000) {
      return `$${(val / 1_000_000_000).toFixed(2)}B`;
    }
    if (val >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (val >= 10_000) {
      return `$${(val / 1_000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }

  if (isPercentage) {
    // If values are represented as fractions (e.g. 0.05 rather than 5.0)
    // we should format appropriately. But mock data typically uses whole percentages (e.g. 5.2)
    return `${val.toFixed(1)}%`;
  }

  // Standard numbers
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(1)}M`;
  }
  if (val >= 1_000) {
    return `${(val / 1_000).toFixed(1)}K`;
  }
  
  // Decimals check
  return Number.isInteger(val) ? val.toString() : val.toFixed(2);
};

export const MetricCard: React.FC<MetricCardProps> = ({ widget, rows }) => {
  const { kpiColumn, kpiStat, color, title } = widget;

  const calculateKPI = (): number => {
    if (!kpiColumn) return 0;

    // Filter out null/undefined values
    const values = rows
      .map(r => r[kpiColumn])
      .filter(v => v !== null && v !== undefined);

    if (values.length === 0) return 0;

    if (kpiStat === 'count') {
      return rows.length;
    }

    if (kpiStat === 'unique') {
      const uniqueVals = new Set(values);
      return uniqueVals.size;
    }

    // Standard math operations require numbers
    const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
    if (numValues.length === 0) return 0;

    switch (kpiStat) {
      case 'sum':
        return numValues.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return numValues.reduce((sum, v) => sum + v, 0) / numValues.length;
      case 'min':
        return Math.min(...numValues);
      case 'max':
        return Math.max(...numValues);
      default:
        return 0;
    }
  };

  const numericValue = calculateKPI();
  const formattedValue = formatKPIValue(numericValue, kpiColumn || '', kpiStat || 'sum');

  const getStatDescription = () => {
    if (kpiStat === 'count') return 'Total record count';
    if (kpiStat === 'unique') return `Unique values in ${kpiColumn}`;
    const statName = kpiStat ? kpiStat.toUpperCase() : 'SUM';
    return `${statName} of ${kpiColumn}`;
  };

  return (
    <div className="glass-card kpi-card span-1">
      <div className="kpi-glow-bar" style={{ backgroundColor: color || 'var(--color-primary)' }} />
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{formattedValue}</div>
      <div className="kpi-stat-desc">{getStatDescription()}</div>
    </div>
  );
};
