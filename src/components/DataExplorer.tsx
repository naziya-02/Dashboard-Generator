import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Dataset, RowData } from '../types';

interface DataExplorerProps {
  dataset: Dataset;
  filteredRows: RowData[]; // RowData that passed filters
}

export const DataExplorer: React.FC<DataExplorerProps> = ({ dataset, filteredRows }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Sorting Handler
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page
  };

  // Search filter
  const searchedRows = useMemo(() => {
    if (!searchTerm.trim()) return filteredRows;
    const lowerSearch = searchTerm.toLowerCase();

    return filteredRows.filter(row => {
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        if (val instanceof Date) {
          return val.toISOString().toLowerCase().includes(lowerSearch) ||
                 val.toLocaleDateString().toLowerCase().includes(lowerSearch);
        }
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [filteredRows, searchTerm]);

  // Sort application
  const sortedRows = useMemo(() => {
    const sortableItems = [...searchedRows];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bValue === null || bValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;

        if (aValue instanceof Date && bValue instanceof Date) {
          return sortConfig.direction === 'asc' 
            ? aValue.getTime() - bValue.getTime() 
            : bValue.getTime() - aValue.getTime();
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        return sortConfig.direction === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }
    return sortableItems;
  }, [searchedRows, sortConfig]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));
  
  // Guard current page boundaries
  const activePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const startIndex = (activePage - 1) * rowsPerPage;
    return sortedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRows, activePage, rowsPerPage]);

  const renderCellValue = (val: any, type: string) => {
    if (val === null || val === undefined) return <span style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>null</span>;
    if (val instanceof Date) return val.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    
    if (type === 'numeric') {
      return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
    }
    
    return String(val);
  };

  return (
    <div className="explorer-section">
      <div className="explorer-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h3>Data Explorer</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
            Showing {sortedRows.length} of {filteredRows.length} rows (sorted & filtered)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Rows Per Page dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-muted)' }}>
            <span>Rows:</span>
            <select
              className="select-input"
              style={{ width: '70px', padding: '6px 8px' }}
              value={rowsPerPage}
              onChange={e => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Table search bar */}
          <div className="search-container">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search table rows..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {dataset.columns.map(col => {
                const isSorted = sortConfig?.key === col.name;
                const isAsc = sortConfig?.direction === 'asc';

                return (
                  <th key={col.name} onClick={() => requestSort(col.name)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: col.type === 'numeric' ? 'flex-end' : 'flex-start' }}>
                      <span>{col.name}</span>
                      {isSorted ? (
                        isAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={dataset.columns.length} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-muted)' }}>
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {dataset.columns.map(col => (
                    <td 
                      key={col.name}
                      style={{ textAlign: col.type === 'numeric' ? 'right' : 'left' }}
                    >
                      {renderCellValue(row[col.name], col.type)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="pagination">
        <div>
          Showing page {activePage} of {totalPages}
        </div>
        <div className="pagination-buttons">
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px' }}
            disabled={activePage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Prev
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px' }}
            disabled={activePage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
