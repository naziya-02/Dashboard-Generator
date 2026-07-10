import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Widget, ColumnInfo, ChartType, AggregationType } from '../types';

interface ChartEditorProps {
  columns: ColumnInfo[];
  widget: Widget | null; // Null if adding a new widget
  onSave: (widget: Widget) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Indigo Glow', hex: '#6366f1' },
  { name: 'Cyber Cyan', hex: '#06b6d4' },
  { name: 'Emerald Forest', hex: '#10b981' },
  { name: 'Neon Amber', hex: '#f59e0b' },
  { name: 'Crimson Rose', hex: '#f43f5e' },
  { name: 'Royal Violet', hex: '#8b5cf6' }
];

export const ChartEditor: React.FC<ChartEditorProps> = ({ columns, widget, onSave, onClose }) => {
  const [type, setType] = useState<'kpi' | 'chart'>('chart');
  const [title, setTitle] = useState('');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisKey, setXAxisKey] = useState('');
  const [yAxisKey, setYAxisKey] = useState('');
  const [aggregation, setAggregation] = useState<AggregationType>('sum');
  const [kpiColumn, setKpiColumn] = useState('');
  const [kpiStat, setKpiStat] = useState<'sum' | 'avg' | 'min' | 'max' | 'count' | 'unique'>('sum');
  const [color, setColor] = useState('#6366f1');
  const [gridSpan, setGridSpan] = useState<1 | 2 | 3 | 4>(2);

  useEffect(() => {
    if (widget) {
      setType(widget.type);
      setTitle(widget.title);
      setChartType(widget.chartType || 'bar');
      setXAxisKey(widget.xAxisKey || '');
      setYAxisKey(widget.yAxisKey || '');
      setAggregation(widget.aggregation || 'sum');
      setKpiColumn(widget.kpiColumn || '');
      setKpiStat(widget.kpiStat || 'sum');
      setColor(widget.color || '#6366f1');
      setGridSpan(widget.gridSpan || 2);
    } else {
      // Defaults for new widget
      setType('chart');
      setTitle('');
      setChartType('bar');
      const firstCat = columns.find(c => c.type === 'categorical' || c.type === 'temporal');
      const firstNum = columns.find(c => c.type === 'numeric');
      setXAxisKey(firstCat ? firstCat.name : columns[0]?.name || '');
      setYAxisKey(firstNum ? firstNum.name : columns[0]?.name || '');
      setAggregation('sum');
      setKpiColumn(firstNum ? firstNum.name : columns[0]?.name || '');
      setKpiStat('sum');
      setColor('#6366f1');
      setGridSpan(2);
    }
  }, [widget, columns]);

  // Sync title automatically on axis / stat select if title is empty
  const handleAutoTitle = () => {
    if (title.trim()) return; // Don't overwrite manual title
    
    if (type === 'kpi') {
      if (kpiColumn) {
        setTitle(`${kpiStat.toUpperCase()} of ${kpiColumn}`);
      }
    } else {
      if (xAxisKey && yAxisKey) {
        if (aggregation === 'none') {
          setTitle(`${yAxisKey} by ${xAxisKey}`);
        } else {
          setTitle(`${aggregation.toUpperCase()} ${yAxisKey} by ${xAxisKey}`);
        }
      }
    }
  };

  const handleSave = () => {
    const finalTitle = title.trim() || (type === 'kpi' 
      ? `${kpiStat.toUpperCase()} of ${kpiColumn}` 
      : `${aggregation !== 'none' ? aggregation.toUpperCase() + ' ' : ''}${yAxisKey} by ${xAxisKey}`);

    const savedWidget: Widget = {
      id: widget?.id || Math.random().toString(36).substring(2, 9),
      type,
      title: finalTitle,
      color,
      gridSpan,
      ...(type === 'kpi' ? {
        kpiColumn,
        kpiStat
      } : {
        chartType,
        xAxisKey,
        yAxisKey,
        aggregation
      })
    };

    onSave(savedWidget);
  };

  const numericColumns = columns.filter(c => c.type === 'numeric');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{widget ? 'Edit Dashboard Widget' : 'Add Custom Widget'}</h3>
          <button className="widget-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Widget Type Selector */}
          <div className="form-group">
            <label>Widget Type</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`btn ${type === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setType('chart')}
              >
                Data Visualization Chart
              </button>
              <button 
                className={`btn ${type === 'kpi' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setType('kpi')}
              >
                Key Metric Card (KPI)
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="form-group">
            <label>Widget Title (Optional)</label>
            <input 
              type="text" 
              className="text-input" 
              placeholder="Leave blank for auto-generated title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleAutoTitle}
            />
          </div>

          {/* Conditional KPI Settings */}
          {type === 'kpi' && (
            <>
              <div className="form-group">
                <label>Target Column</label>
                <select 
                  className="select-input"
                  value={kpiColumn}
                  onChange={e => setKpiColumn(e.target.value)}
                >
                  {columns.map(col => (
                    <option key={col.name} value={col.name}>{col.name} ({col.type})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Statistical Metric</label>
                <select 
                  className="select-input"
                  value={kpiStat}
                  onChange={e => setKpiStat(e.target.value as any)}
                >
                  <option value="sum">SUM (Total)</option>
                  <option value="avg">AVERAGE (Mean)</option>
                  <option value="min">MINIMUM</option>
                  <option value="max">MAXIMUM</option>
                  <option value="count">COUNT (Rows Count)</option>
                  <option value="unique">UNIQUE VALUES COUNT</option>
                </select>
              </div>
            </>
          )}

          {/* Conditional Chart Settings */}
          {type === 'chart' && (
            <>
              <div className="form-group">
                <label>Chart Style</label>
                <select 
                  className="select-input"
                  value={chartType}
                  onChange={e => {
                    const nextVal = e.target.value as ChartType;
                    setChartType(nextVal);
                    if (nextVal === 'scatter') setAggregation('none');
                    if (nextVal === 'donut' || nextVal === 'pie') setGridSpan(2);
                  }}
                >
                  <option value="bar">Bar Chart</option>
                  <option value="area">Area Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="donut">Donut Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="scatter">Scatter Plot</option>
                  <option value="radar">Radar Web</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>X-Axis (Dimension)</label>
                  <select 
                    className="select-input"
                    value={xAxisKey}
                    onChange={e => setXAxisKey(e.target.value)}
                  >
                    {columns.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Y-Axis (Measure)</label>
                  <select 
                    className="select-input"
                    value={yAxisKey}
                    onChange={e => setYAxisKey(e.target.value)}
                  >
                    <option value="">None (Count Records)</option>
                    {numericColumns.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Aggregation Rules</label>
                <select 
                  className="select-input"
                  value={aggregation}
                  disabled={chartType === 'scatter'}
                  onChange={e => setAggregation(e.target.value as AggregationType)}
                >
                  <option value="sum">SUM</option>
                  <option value="avg">AVERAGE</option>
                  <option value="min">MIN</option>
                  <option value="max">MAX</option>
                  <option value="count">COUNT OF RECORDS</option>
                  <option value="none">NONE (Raw rows)</option>
                </select>
              </div>
            </>
          )}

          {/* Accent Color picker */}
          <div className="form-group">
            <label>Visual Accent Accent</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: c.hex,
                    border: color === c.hex ? '3px solid white' : '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    boxShadow: color === c.hex ? `0 0 10px ${c.hex}` : 'none'
                  }}
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Grid Layout width */}
          <div className="form-group">
            <label>Grid Column Span (Width)</label>
            <select 
              className="select-input"
              value={gridSpan}
              onChange={e => setGridSpan(Number(e.target.value) as any)}
            >
              <option value={1}>25% Width (Metric Card size)</option>
              <option value={2}>50% Width (Standard Chart size)</option>
              <option value={3}>75% Width</option>
              <option value={4}>100% Width (Full Row size)</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Widget
          </button>
        </div>
      </div>
    </div>
  );
};
