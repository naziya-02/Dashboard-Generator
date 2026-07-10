import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, Download, RefreshCw, AlertCircle, FileSpreadsheet, FileCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { Dataset, Widget, FilterState } from './types';
import { recommendDashboard } from './utils/recommender';
import { UploadZone } from './components/UploadZone';
import { DashboardFilters } from './components/DashboardFilters';
import { MetricCard } from './components/MetricCard';
import { ChartWidget } from './components/ChartWidget';
import { ChartEditor } from './components/ChartEditor';
import { DataExplorer } from './components/DataExplorer';

export const App: React.FC = () => {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [filters, setFilters] = useState<FilterState | null>(null);
  const [editorWidget, setEditorWidget] = useState<Widget | null>(null);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize filters when dataset is loaded
  const initializeFilters = (data: Dataset): FilterState => {
    const tempCol = data.columns.find(c => c.type === 'temporal');
    const numericCols = data.columns.filter(c => c.type === 'numeric');

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (tempCol) {
      const dates = data.rows
        .map(r => r[tempCol.name] as Date)
        .filter(d => d !== null && d !== undefined);
      if (dates.length > 0) {
        startDate = new Date(Math.min(...dates.map(d => d.getTime())));
        endDate = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    const numRanges: Record<string, { min: number; max: number; currentMin: number; currentMax: number }> = {};
    numericCols.forEach(col => {
      const min = col.stats.min !== undefined ? col.stats.min : 0;
      const max = col.stats.max !== undefined ? col.stats.max : 100;
      numRanges[col.name] = {
        min,
        max,
        currentMin: min,
        currentMax: max
      };
    });

    return {
      searchQuery: '',
      categoricalFilters: {},
      dateRange: {
        start: startDate,
        end: endDate,
        column: tempCol ? tempCol.name : null
      },
      numericRanges: numRanges
    };
  };

  const handleDatasetLoaded = (newDataset: Dataset) => {
    setDataset(newDataset);
    setErrorMsg(null);
    
    // Auto-generate widgets
    const autoWidgets = recommendDashboard(newDataset);
    setWidgets(autoWidgets);

    // Auto-initialize filters
    setFilters(initializeFilters(newDataset));

    // Success fireworks confetti
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#06b6d4', '#10b981']
    });
  };

  const handleResetFilters = () => {
    if (!dataset) return;
    setFilters(initializeFilters(dataset));
  };

  const handleSaveWidget = (savedWidget: Widget) => {
    if (isAddingWidget) {
      setWidgets(prev => [...prev, savedWidget]);
      setIsAddingWidget(false);
    } else {
      setWidgets(prev => prev.map(w => w.id === savedWidget.id ? savedWidget : w));
      setEditorWidget(null);
    }
  };

  const handleDeleteWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  // Run dynamic row filtering
  const filteredRows = useMemo(() => {
    if (!dataset || !filters) return [];

    return dataset.rows.filter(row => {
      // 1. Categorical Filter Check
      for (const [colName, selectedValues] of Object.entries(filters.categoricalFilters)) {
        if (selectedValues.length === 0) continue;
        const cellValue = String(row[colName]);
        if (!selectedValues.includes(cellValue)) return false;
      }

      // 2. Date Range Check
      if (filters.dateRange.column && (filters.dateRange.start || filters.dateRange.end)) {
        const cellDate = row[filters.dateRange.column] as Date | null;
        if (cellDate) {
          if (filters.dateRange.start && cellDate < filters.dateRange.start) return false;
          if (filters.dateRange.end && cellDate > filters.dateRange.end) return false;
        }
      }

      // 3. Numeric Slider range check
      for (const [colName, range] of Object.entries(filters.numericRanges)) {
        const cellNum = Number(row[colName]);
        if (!isNaN(cellNum)) {
          if (cellNum < range.currentMin || cellNum > range.currentMax) return false;
        }
      }

      return true;
    });
  }, [dataset, filters]);

  // Export visual dashboard as PDF
  const handleExportPDF = async () => {
    const element = document.getElementById('dashboard-capture');
    if (!element) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0b0f19'
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${dataset?.name || 'nexusboard'}-dashboard.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export filtered dataset to CSV
  const handleExportCSV = () => {
    if (!dataset || filteredRows.length === 0) return;
    
    const headers = dataset.columns.map(c => c.name);
    const csvContent = [
      headers.join(','),
      ...filteredRows.map(row => 
        headers.map(header => {
          const val = row[header];
          if (val instanceof Date) return val.toISOString();
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val === null || val === undefined ? '' : String(val);
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataset.name}-filtered.csv`);
    link.click();
  };

  // Export filtered dataset to JSON
  const handleExportJSON = () => {
    if (!dataset || filteredRows.length === 0) return;
    
    const jsonContent = JSON.stringify(filteredRows, (_, val) => {
      if (val instanceof Date) return val.toISOString();
      return val;
    }, 2);

    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${dataset.name}-filtered.json`);
    link.click();
  };

  // Separation of Widget categories
  const kpiWidgets = widgets.filter(w => w.type === 'kpi');
  const chartWidgets = widgets.filter(w => w.type === 'chart');

  return (
    <div className="container">
      {/* Universal Page Header */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">
            <Sparkles size={22} fill="white" />
          </div>
          <div className="app-title-container">
            <h1 className="app-title text-gradient">NexusBoard</h1>
            <span className="app-subtitle">Automated Data Visualizer</span>
          </div>
        </div>
        
        {dataset && (
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={() => setDataset(null)}>
              <RefreshCw size={14} /> Upload New Model
            </button>
            <button className="btn btn-secondary" onClick={handleExportCSV} title="Export CSV data">
              <FileSpreadsheet size={14} /> Export CSV
            </button>
            <button className="btn btn-secondary" onClick={handleExportJSON} title="Export JSON data">
              <FileCode size={14} /> Export JSON
            </button>
            <button className="btn btn-outline" onClick={() => setIsAddingWidget(true)}>
              <Plus size={14} /> Add Custom Chart
            </button>
            <button className="btn btn-primary" onClick={handleExportPDF} disabled={isExporting}>
              <Download size={14} /> {isExporting ? 'Generating PDF...' : 'Download PDF Dashboard'}
            </button>
          </div>
        )}
      </header>

      {/* Error alert toast */}
      {errorMsg && (
        <div className="glass-card" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px', marginBottom: '24px', borderColor: 'var(--color-danger)', background: 'rgba(244, 63, 94, 0.05)' }}>
          <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
          <div style={{ flex: 1 }}>
            <h5 style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Processing Error</h5>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{errorMsg}</p>
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setErrorMsg(null)}>Dismiss</button>
        </div>
      )}

      {/* Main Body Switcher */}
      {!dataset ? (
        <UploadZone 
          onDatasetLoaded={handleDatasetLoaded} 
          onError={setErrorMsg} 
        />
      ) : (
        <>
          {/* Dynamic Filters panel */}
          {filters && (
            <DashboardFilters
              dataset={dataset}
              filters={filters}
              onFilterChange={setFilters}
              onReset={handleResetFilters}
            />
          )}

          {/* Interactive Capture Frame */}
          <div id="dashboard-capture" style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Metadata Title (Visible only when exporting/printing) */}
            <div className="print-only-title" style={{ display: 'none' }}>
              <h2>{dataset.name} - Executive Summary</h2>
              <p style={{ color: 'gray', fontSize: '12px' }}>Generated by NexusBoard on {new Date().toLocaleDateString()}</p>
            </div>

            {/* KPI metrics cards row */}
            {kpiWidgets.length > 0 && (
              <div className="dashboard-grid">
                {kpiWidgets.map(w => (
                  <MetricCard 
                    key={w.id} 
                    widget={w} 
                    rows={filteredRows} 
                  />
                ))}
              </div>
            )}

            {/* Interactive Charts grid layout */}
            {chartWidgets.length > 0 && (
              <div className="dashboard-grid">
                {chartWidgets.map(w => (
                  <ChartWidget
                    key={w.id}
                    widget={w}
                    rows={filteredRows}
                    onEdit={setEditorWidget}
                    onDelete={handleDeleteWidget}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tabular Data Explorer */}
          <DataExplorer 
            dataset={dataset} 
            filteredRows={filteredRows} 
          />

          {/* Chart Editing overlay modal */}
          {(isAddingWidget || editorWidget) && (
            <ChartEditor
              columns={dataset.columns}
              widget={editorWidget}
              onSave={handleSaveWidget}
              onClose={() => {
                setIsAddingWidget(false);
                setEditorWidget(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
