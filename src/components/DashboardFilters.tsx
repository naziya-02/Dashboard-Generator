import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { Dataset, FilterState } from '../types';

interface DashboardFiltersProps {
  dataset: Dataset;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  dataset,
  filters,
  onFilterChange,
  onReset
}) => {
  const { columns } = dataset;
  const temporalCols = columns.filter(c => c.type === 'temporal');
  const categoricalCols = columns.filter(c => c.type === 'categorical');
  const numericCols = columns.filter(c => c.type === 'numeric').slice(0, 2); // Limit to top 2 numeric filters to save space

  // Handler for categorical changes
  const handleCategoricalChange = (colName: string, value: string) => {
    const nextCatFilters = { ...filters.categoricalFilters };
    if (value === 'ALL') {
      delete nextCatFilters[colName];
    } else {
      nextCatFilters[colName] = [value];
    }
    onFilterChange({
      ...filters,
      categoricalFilters: nextCatFilters
    });
  };

  // Handler for Date changes
  const handleDateChange = (type: 'start' | 'end', dateStr: string) => {
    const dateVal = dateStr ? new Date(dateStr) : null;
    
    // Choose the first temporal column if none is active yet
    const activeDateCol = filters.dateRange.column || (temporalCols[0]?.name || null);

    onFilterChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        column: activeDateCol,
        start: type === 'start' ? dateVal : filters.dateRange.start,
        end: type === 'end' ? dateVal : filters.dateRange.end
      }
    });
  };

  // Handler for numeric slider adjustments
  const handleNumericChange = (colName: string, boundary: 'min' | 'max', value: number) => {
    const nextNumRanges = { ...filters.numericRanges };
    if (nextNumRanges[colName]) {
      if (boundary === 'min') {
        nextNumRanges[colName].currentMin = Math.min(value, nextNumRanges[colName].currentMax);
      } else {
        nextNumRanges[colName].currentMax = Math.max(value, nextNumRanges[colName].currentMin);
      }
    }
    onFilterChange({
      ...filters,
      numericRanges: nextNumRanges
    });
  };

  // Check if any filters are active
  const hasActiveFilters = 
    Object.keys(filters.categoricalFilters).length > 0 ||
    filters.dateRange.start !== null ||
    filters.dateRange.end !== null ||
    Object.values(filters.numericRanges).some(
      r => r.currentMin > r.min || r.currentMax < r.max
    );

  // Helper to extract unique categorical values from row data (since profile lists simple count stats)
  const getUniqueValues = (colName: string): string[] => {
    const vals = dataset.rows
      .map(r => r[colName])
      .filter((v): v is string => v !== null && v !== undefined && v !== '');
    return Array.from(new Set(vals)).sort();
  };

  return (
    <div className="glass-card filters-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Filter size={18} style={{ color: 'var(--color-secondary)' }} />
          <span>Dashboard Controls & Filters</span>
        </div>
        {hasActiveFilters && (
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={onReset}
          >
            <RotateCcw size={12} /> Reset Filters
          </button>
        )}
      </div>

      <div className="filters-grid">
        {/* Date Range filters */}
        {temporalCols.length > 0 && (
          <div className="filter-group">
            <label>Date Filter ({temporalCols[0].name})</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="date"
                className="text-input"
                value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                onChange={e => handleDateChange('start', e.target.value)}
              />
              <span style={{ alignSelf: 'center', color: 'var(--color-muted)' }}>to</span>
              <input
                type="date"
                className="text-input"
                value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                onChange={e => handleDateChange('end', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Categorical select boxes */}
        {categoricalCols.map(col => {
          const selectedList = filters.categoricalFilters[col.name] || [];
          const selectedVal = selectedList[0] || 'ALL';
          const uniqueVals = getUniqueValues(col.name);

          return (
            <div className="filter-group" key={col.name}>
              <label>{col.name}</label>
              <select
                className="select-input"
                value={selectedVal}
                onChange={e => handleCategoricalChange(col.name, e.target.value)}
              >
                <option value="ALL">All {col.name}s</option>
                {uniqueVals.map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          );
        })}

        {/* Numeric range sliders */}
        {numericCols.map(col => {
          const range = filters.numericRanges[col.name];
          if (!range) return null;

          return (
            <div className="filter-group" key={col.name}>
              <label>{col.name} Range</label>
              <div className="range-slider-container">
                <div className="range-readout">
                  <span>Min: {range.currentMin.toLocaleString()}</span>
                  <span>Max: {range.currentMax.toLocaleString()}</span>
                </div>
                <div className="range-inputs">
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    value={range.currentMin}
                    onChange={e => handleNumericChange(col.name, 'min', Number(e.target.value))}
                    style={{ accentColor: 'var(--color-secondary)', width: '50%' }}
                  />
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    value={range.currentMax}
                    onChange={e => handleNumericChange(col.name, 'max', Number(e.target.value))}
                    style={{ accentColor: 'var(--color-primary)', width: '50%' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
