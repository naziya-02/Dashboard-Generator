import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Database, Sparkles } from 'lucide-react';
import { parseCSV, parseExcel, parseJSON } from '../utils/parser';
import { Dataset } from '../types';

interface UploadZoneProps {
  onDatasetLoaded: (dataset: Dataset) => void;
  onError: (msg: string) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onDatasetLoaded, onError }) => {
  const [dragActive, setDragActive] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let dataset: Dataset;

      if (ext === 'csv') {
        const text = await file.text();
        dataset = await parseCSV(text, file.name);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        dataset = parseExcel(buffer, file.name);
      } else if (ext === 'json') {
        const text = await file.text();
        dataset = parseJSON(text, file.name);
      } else {
        throw new Error('Unsupported file extension. Please upload CSV, XLSX, or JSON.');
      }

      onDatasetLoaded(dataset);
    } catch (err: any) {
      onError(err.message || 'Error parsing file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) {
      onError('Please paste some CSV or JSON data first.');
      return;
    }

    setIsLoading(true);
    try {
      let dataset: Dataset;
      const trimmed = pasteContent.trim();
      
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // Assume JSON
        dataset = parseJSON(trimmed, 'Pasted JSON Data');
      } else {
        // Assume CSV
        dataset = await parseCSV(trimmed, 'Pasted CSV Data');
      }
      onDatasetLoaded(dataset);
    } catch (err: any) {
      onError(err.message || 'Failed to parse pasted data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to generate sample mock datasets
  const loadSampleDataset = (type: 'sales' | 'saas' | 'web' | 'tickets') => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        let rows: any[] = [];
        let name = '';

        if (type === 'sales') {
          name = 'Global Retail Sales 2026';
          const categories = ['Electronics', 'Apparel', 'Home & Living', 'Office Supplies', 'Fitness'];
          const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
          const startDate = new Date('2026-06-01');

          for (let i = 0; i < 90; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            // Generate multiple transactions per day
            const dailyTransactions = 2 + Math.floor(Math.random() * 4);
            for (let t = 0; t < dailyTransactions; t++) {
              const cat = categories[Math.floor(Math.random() * categories.length)];
              const reg = regions[Math.floor(Math.random() * regions.length)];
              const units = 1 + Math.floor(Math.random() * 45);
              const unitPrice = cat === 'Electronics' ? 120 + Math.random() * 500
                              : cat === 'Apparel' ? 15 + Math.random() * 60
                              : cat === 'Fitness' ? 40 + Math.random() * 150
                              : 8 + Math.random() * 40;
              const revenue = parseFloat((units * unitPrice).toFixed(2));
              const margin = 0.18 + Math.random() * 0.25;
              const profit = parseFloat((revenue * margin).toFixed(2));

              rows.push({
                Date: currentDate,
                Category: cat,
                Region: reg,
                'Units Sold': units,
                Revenue: revenue,
                Profit: profit
              });
            }
          }
        } else if (type === 'saas') {
          name = 'SaaS Subscription Metrics';
          const plans = ['Starter ($29/mo)', 'Professional ($99/mo)', 'Enterprise ($499/mo)'];
          const baseUsers = [1200, 450, 48];
          
          for (let month = 0; month < 12; month++) {
            const date = new Date(2025, 6 + month, 1);
            const dateStr = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            
            plans.forEach((plan, pIdx) => {
              // Upward user growth with variation
              const growth = 1.03 + (Math.random() * 0.05) - (pIdx * 0.01);
              const currentUsers = Math.round(baseUsers[pIdx] * Math.pow(growth, month));
              const price = pIdx === 0 ? 29 : pIdx === 1 ? 99 : 499;
              const mrr = currentUsers * price;
              const churn = parseFloat((2.1 + (Math.random() * 1.8) - (pIdx * 0.3)).toFixed(2)); // Enterprise has lower churn
              const supportTickets = Math.round(currentUsers * (0.05 + Math.random() * 0.04));

              rows.push({
                Month: dateStr,
                Plan: plan.split(' ')[0],
                'Active Subscribers': currentUsers,
                MRR: mrr,
                'Churn Rate (%)': churn,
                'Support Tickets': supportTickets
              });
            });
          }
        } else if (type === 'web') {
          name = 'Website Engagement & Traffic';
          const channels = ['Organic Search', 'Paid Search', 'Direct Traffic', 'Social Media', 'Referrals'];
          const startDate = new Date('2026-05-01');

          for (let w = 0; w < 12; w++) {
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + (w * 7));
            const weekLabel = `Week ${w + 1} (${weekDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})})`;

            channels.forEach(channel => {
              let pageviews = 0;
              if (channel === 'Organic Search') pageviews = 24000 + Math.round(Math.random() * 12000 + (w * 800));
              else if (channel === 'Paid Search') pageviews = 8000 + Math.round(Math.random() * 6000);
              else if (channel === 'Social Media') pageviews = 4000 + Math.round(Math.random() * 8000);
              else pageviews = 3000 + Math.round(Math.random() * 3000);

              const bounceRate = parseFloat((channel === 'Direct Traffic' ? 42 + Math.random() * 10 : 35 + Math.random() * 25).toFixed(2));
              const convRate = channel === 'Paid Search' ? 3.8 + Math.random() * 2.5 : 1.2 + Math.random() * 1.5;
              const conversions = Math.round(pageviews * (convRate / 100));

              rows.push({
                Period: weekLabel,
                Source: channel,
                Pageviews: pageviews,
                'Bounce Rate (%)': bounceRate,
                Conversions: conversions
              });
            });
          }
        } else {
          name = 'Customer Support Incidents';
          const priorities = ['High', 'Medium', 'Low'];
          const categories = ['Billing & Invoicing', 'Bug Report', 'Feature Request', 'Account Access', 'Integrations'];
          const assignees = ['Sarah Jenkins', 'Alex Rivera', 'Emily Chen', 'David Kim'];
          const startDate = new Date('2026-06-15');

          for (let i = 0; i < 180; i++) {
            const ticketDate = new Date(startDate);
            ticketDate.setMinutes(startDate.getMinutes() + (i * 110) + Math.random() * 200);

            const prio = priorities[Math.random() < 0.15 ? 0 : Math.random() < 0.45 ? 1 : 2];
            const cat = categories[Math.floor(Math.random() * categories.length)];
            const rep = assignees[Math.floor(Math.random() * assignees.length)];
            
            // Resolution times in hours
            let resTime = parseFloat((1.5 + Math.random() * 24).toFixed(1));
            if (prio === 'High') resTime = parseFloat((0.5 + Math.random() * 4).toFixed(1));
            if (prio === 'Low') resTime = parseFloat((8 + Math.random() * 48).toFixed(1));

            const csat = Math.random() < 0.08 ? 1 : Math.random() < 0.12 ? 2 : Math.random() < 0.18 ? 3 : Math.random() < 0.45 ? 4 : 5;

            rows.push({
              Created: ticketDate,
              Priority: prio,
              Category: cat,
              Agent: rep,
              'Resolution Time (Hrs)': resTime,
              'CSAT Score': csat
            });
          }
        }

        // Import the generated data
        const parser = require('../utils/parser');
        const dataset = parser.profileData(rows, name);
        onDatasetLoaded(dataset);
      } catch (err: any) {
        onError('Failed to generate sample dataset: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="upload-container">
      {isLoading ? (
        <div className="glass-card upload-dropzone shimmer" style={{ minHeight: '300px' }}>
          <div className="upload-icon">
            <Sparkles className="animate-pulse" size={32} />
          </div>
          <div className="upload-text">
            <h3>Analyzing Dataset Profile...</h3>
            <p>Scanning data columns, detecting types, and computing metrics.</p>
          </div>
        </div>
      ) : (
        <>
          <div 
            className={`glass-card upload-dropzone ${dragActive ? 'dragover' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={pasteMode ? undefined : triggerFileInput}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              style={{ display: 'none' }} 
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileInputChange}
            />
            
            {pasteMode ? (
              <div className="paste-container" style={{ width: '100%' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontWeight: 600 }}>Paste Raw Data (CSV or JSON Array)</h4>
                  <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setPasteMode(false)}>
                    Cancel
                  </button>
                </div>
                <textarea
                  className="textarea-input"
                  placeholder='Name,Age,Country&#10;Alice,24,USA&#10;Bob,30,UK&#10;&#10;...or raw JSON array:&#10;[{"Name": "Alice", "Age": 24}, {"Name": "Bob", "Age": 30}]'
                  value={pasteContent}
                  onChange={e => setPasteContent(e.target.value)}
                />
                <button 
                  className="btn btn-primary" 
                  style={{ alignSelf: 'flex-end', marginTop: '8px' }}
                  onClick={handlePasteSubmit}
                >
                  <Sparkles size={16} /> Process & Generate Dashboard
                </button>
              </div>
            ) : (
              <>
                <div className="upload-icon">
                  <UploadCloud size={32} />
                </div>
                <div className="upload-text">
                  <h3>Drop your file here, or click to browse</h3>
                  <p>Supports Excel (.xlsx, .xls), CSV (.csv), or JSON (.json) up to 25MB</p>
                </div>
                <div className="upload-divider" style={{ width: '100%' }}>or</div>
                <button 
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPasteMode(true);
                  }}
                >
                  <FileText size={16} /> Paste Raw Data
                </button>
              </>
            )}
          </div>

          <div className="samples-section">
            <h4>Or, explore our pre-built sample models</h4>
            <div className="samples-grid">
              <button className="glass-card sample-card" onClick={() => loadSampleDataset('sales')}>
                <Database className="sample-card-icon" size={20} />
                <div>
                  <h5>Global Retail Sales</h5>
                  <p>Daily store sales, profit margins, and categories.</p>
                </div>
              </button>

              <button className="glass-card sample-card" onClick={() => loadSampleDataset('saas')}>
                <Database className="sample-card-icon" size={20} />
                <div>
                  <h5>SaaS Subscription</h5>
                  <p>Monthly recurring revenue, churn, and active users.</p>
                </div>
              </button>

              <button className="glass-card sample-card" onClick={() => loadSampleDataset('web')}>
                <Database className="sample-card-icon" size={20} />
                <div>
                  <h5>Web Analytics</h5>
                  <p>Weekly pageview counts, bounce rates, and conversions.</p>
                </div>
              </button>

              <button className="glass-card sample-card" onClick={() => loadSampleDataset('tickets')}>
                <Database className="sample-card-icon" size={20} />
                <div>
                  <h5>Support Tickets</h5>
                  <p>Helpdesk logs, incident resolution times, and CSAT scores.</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
