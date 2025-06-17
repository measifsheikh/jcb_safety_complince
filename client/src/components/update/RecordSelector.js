import React, { useState, useEffect } from 'react';
import './RecordSelector.css';

const RecordSelector = ({ records, onRecordSelect, selectedRecord, onSearch, searchLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');

  // Local filtering for immediate feedback (client-side filtering)
  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchTerm || 
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || 
      record.date.startsWith(dateFilter);
    
    const matchesArea = !areaFilter || 
      record.area === areaFilter;
    
    return matchesSearch && matchesDate && matchesArea;
  });

  const uniqueAreas = [...new Set(records.map(record => record.area))];

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDateChange = (e) => {
    setDateFilter(e.target.value);
  };

  const handleAreaChange = (e) => {
    setAreaFilter(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setAreaFilter('');
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Manual search function - triggers server-side search
  const handleManualSearch = () => {
    if (!onSearch) return;

    const searchParams = {};
    
    if (searchTerm.trim()) {
      searchParams.search = searchTerm.trim();
    }
    
    if (dateFilter) {
      searchParams.date = dateFilter;
    }
    
    if (areaFilter) {
      searchParams.area = areaFilter;
    }

    onSearch(searchParams);
  };

  // Reset search - fetch all records
  const handleResetSearch = () => {
    clearFilters();
    if (onSearch) {
      onSearch({});
    }
  };

  return (
    <div className="record-selector">
      <div className="selector-header">
        <h3>Filter Records</h3>
        {searchLoading && (
          <div className="search-loading">Searching...</div>
        )}
      </div>
      
      <div className="search-filters">
        <div className="search-input-container">
          <input
            type="text"
            placeholder="Search by name or department..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleManualSearch();
              }
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-search"
              onClick={clearSearch}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="filter-container">
          <input
            type="date"
            value={dateFilter}
            onChange={handleDateChange}
            className="date-filter"
            title="Filter by date"
          />
          
          <select
            value={areaFilter}
            onChange={handleAreaChange}
            className="area-filter"
            title="Filter by area"
          >
            <option value="">All Areas</option>
            {uniqueAreas.map(area => (
              <option key={area} value={area}>
                {area.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="search-buttons">
          <button
            type="button"
            className="search-button"
            onClick={handleManualSearch}
            disabled={searchLoading}
          >
            {searchLoading ? 'Searching...' : 'Search Server'}
          </button>
          
          {(searchTerm || dateFilter || areaFilter) && (
            <button
              type="button"
              className="clear-all-filters"
              onClick={handleResetSearch}
              disabled={searchLoading}
            >
              Reset & Reload All
            </button>
          )}
        </div>
      </div>

      <div className="search-results">
        {filteredRecords.length === 0 ? (
          <div className="no-results">
            {searchLoading ? (
              <p>Searching...</p>
            ) : (
              <div>
                <p>No records found</p>
                {(searchTerm || dateFilter || areaFilter) && (
                  <p className="filter-hint">
                    Current filters are applied. Try "Reset & Reload All" to see all records.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="results-list">
            <div className="results-header">
              <span className="results-count">
                {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
                {(searchTerm || dateFilter || areaFilter) && (
                  <span className="filter-indicator"> (filtered)</span>
                )}
              </span>
            </div>
            
            {filteredRecords.slice(0, 50).map(record => (
              <div
                key={record.id || record._id}
                className={`result-item ${selectedRecord?.id === record.id || selectedRecord?._id === record._id ? 'selected' : ''}`}
                onClick={() => onRecordSelect(record)}
              >
                <div className="result-header">
                  <span className="result-name">{record.name}</span>
                  <span className="result-date">
                    {new Date(record.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="result-details">
                  <span className="result-department">{record.department}</span>
                  <span className="result-area">{record.area.replace(/_/g, ' ')}</span>
                  <span className={`result-status ${record.isDefaulter ? 'defaulter' : 'compliant'}`}>
                    {record.isDefaulter ? 'Non-Compliant' : 'Compliant'}
                  </span>
                </div>
              </div>
            ))}
            
            {filteredRecords.length > 50 && (
              <div className="results-overflow">
                Showing first 50 results. Use filters to narrow down your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordSelector;