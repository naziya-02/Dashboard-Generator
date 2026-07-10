import React, { useState } from 'react';
import Chart from 'react-apexcharts';
import { Edit2, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { Widget, RowData } from '../types';
import { aggregateData } from '../utils/recommender';

interface ChartWidgetProps {
  widget: Widget;
  rows: RowData[];
  onEdit: (widget: Widget) => void;
  onDelete: (id: string) => void;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ widget, rows, onEdit, onDelete }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { title, chartType, xAxisKey, yAxisKey, aggregation, color, gridSpan } = widget;

  if (!xAxisKey) {
    return (
      <div className="glass-card chart-widget-card span-2" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ color: 'var(--color-muted)' }}>Widget is missing config.</p>
      </div>
    );
  }

  // Aggregate rows according to configurations
  const data = aggregateData(rows, xAxisKey, yAxisKey, aggregation || 'none');
  
  // Format details
  const seriesData = data.map(item => item.y);
  const categories = data.map(item => String(item.x));

  // Determine span class
  const spanClass = isFullscreen ? 'span-4' : `span-${gridSpan || 2}`;

  // Custom Chart Config
  const chartColor = color || 'var(--color-primary)';
  
  const options: ApexCharts.ApexOptions = {
    chart: {
      id: widget.id,
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: chartType === 'scatter' || chartType === 'line' || chartType === 'area',
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      foreColor: '#9ca3af', // var(--color-muted)
      fontFamily: 'var(--font-body)',
      background: 'transparent',
      dropShadow: {
        enabled: chartType === 'line' || chartType === 'area',
        top: 6,
        left: 0,
        blur: 8,
        color: chartColor,
        opacity: 0.25
      }
    },
    colors: [chartColor],
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.05)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    stroke: {
      curve: 'smooth',
      width: chartType === 'line' || chartType === 'area' ? 3 : 0
    },
    fill: {
      type: chartType === 'area' ? 'gradient' : 'solid',
      gradient: chartType === 'area' ? {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        inverseColors: false,
        opacityFrom: 0.5,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      } : undefined
    },
    markers: {
      size: chartType === 'scatter' ? 6 : chartType === 'line' || chartType === 'area' ? 4 : 0,
      colors: [chartColor],
      strokeColors: '#0b0f19',
      strokeWidth: 2,
      hover: { size: 6 }
    },
    xaxis: {
      categories: chartType === 'pie' || chartType === 'donut' ? undefined : categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: {
        rotate: -30,
        style: { fontSize: '11px' }
      }
    },
    yaxis: {
      labels: {
        formatter: (val) => {
          if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
          if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
          return Number.isInteger(val) ? val.toString() : val.toFixed(1);
        },
        style: { fontSize: '11px' }
      }
    },
    dataLabels: {
      enabled: false
    },
    tooltip: {
      theme: 'dark',
      x: { show: true },
      y: {
        formatter: (val) => {
          return `${val.toLocaleString()} (${aggregation !== 'none' ? aggregation : 'raw'})`;
        }
      },
      style: {
        fontSize: '12px'
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '55%',
        distributed: false
      },
      radar: {
        polygons: {
          strokeColors: 'rgba(255, 255, 255, 0.05)',
          connectorColors: 'rgba(255, 255, 255, 0.05)',
          fill: {
            colors: ['rgba(255, 255, 255, 0.01)', 'rgba(255, 255, 255, 0.02)']
          }
        }
      }
    },
    theme: {
      mode: 'dark'
    }
  };

  // Adjust options for Pie/Donut layout
  if (chartType === 'pie' || chartType === 'donut') {
    // Generate distinct slices colors based on main color theme shading
    const colors = [
      chartColor,
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#f43f5e', // Rose
      '#8b5cf6', // Violet
      '#ec4899', // Pink
    ];
    
    options.colors = colors;
    options.labels = categories;
    options.stroke = { show: true, width: 2, colors: ['#0b0f19'] };
    options.legend = {
      show: true,
      position: 'bottom',
      fontSize: '12px'
    };
    options.dataLabels = {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(0)}%`
    };
  }

  // Adjust options for Scatter Plot
  if (chartType === 'scatter') {
    options.xaxis = {
      type: 'numeric',
      title: { text: xAxisKey },
      axisBorder: { show: false },
      axisTicks: { show: false }
    };
    options.yaxis = {
      title: { text: yAxisKey }
    };
    options.tooltip = {
      theme: 'dark',
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const x = w.globals.seriesX[seriesIndex][dataPointIndex];
        const y = series[seriesIndex][dataPointIndex];
        return `
          <div style="padding: 10px; background: #111827; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;">
            <div><strong>${xAxisKey}</strong>: ${x.toLocaleString()}</div>
            <div><strong>${yAxisKey}</strong>: ${y.toLocaleString()}</div>
          </div>
        `;
      }
    };
  }

  // Series binding
  let series: any[] = [];
  if (chartType === 'pie' || chartType === 'donut') {
    series = seriesData;
  } else if (chartType === 'scatter') {
    // Scatter needs coordinate objects {x, y}
    const scatterCoords = data.map(item => [Number(item.x), Number(item.y)]);
    series = [{
      name: `${yAxisKey} correlation`,
      data: scatterCoords
    }];
  } else {
    // Line, Bar, Area, Radar
    series = [{
      name: yAxisKey || 'Count',
      data: seriesData
    }];
  }

  const height = isFullscreen ? 500 : 300;

  return (
    <div 
      className={`glass-card chart-widget-card ${spanClass}`} 
      style={isFullscreen ? {
        position: 'fixed',
        top: '10%',
        left: '10%',
        width: '80%',
        height: '80%',
        zIndex: 1100,
        boxShadow: '0 0 50px rgba(0,0,0,0.8)'
      } : undefined}
    >
      <div className="widget-header">
        <h4 className="widget-title">{title}</h4>
        <div className="widget-actions">
          <button className="widget-btn" onClick={() => setIsFullscreen(!isFullscreen)} title="Fullscreen Toggle">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className="widget-btn" onClick={() => onEdit(widget)} title="Edit Chart Settings">
            <Edit2 size={16} />
          </button>
          <button className="widget-btn widget-btn-danger" onClick={() => onDelete(widget.id)} title="Delete Chart">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="widget-body">
        {seriesData.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
            No data matched filters.
          </div>
        ) : (
          <Chart 
            options={options} 
            series={series} 
            type={chartType === 'radar' ? 'radar' : chartType === 'scatter' ? 'scatter' : chartType === 'bar' ? 'bar' : chartType === 'line' ? 'line' : chartType === 'area' ? 'area' : chartType === 'pie' ? 'pie' : 'donut'} 
            height={height} 
          />
        )}
      </div>
    </div>
  );
};
