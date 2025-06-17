import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle } from 'lucide-react';
import SummaryTable from './SummaryTable';
import DateFilter from './DateFilter';
import PrintButton from './PrintButton';
import ExportOptions from './ExportOptions';
import './SummaryPage.css';

const SummaryPage = () => {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState({
    type: 'all', // 'day', 'week', 'month', 'year', 'all'
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    fetchRecords();
  }, [token]);

  useEffect(() => {
    filterRecords();
  }, [records, dateFilter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      const response = await fetch('/api/safety', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setRecords(data);
      } else if (data && Array.isArray(data.records)) {
        // Handle case where API returns { records: [...] }
        setRecords(data.records);
      } else if (data && Array.isArray(data.data)) {
        // Handle case where API returns { data: [...] }
        setRecords(data.data);
      } else {
        // If data is not in expected format, set empty array
        console.warn('API response is not in expected format:', data);
        setRecords([]);
      }
    } catch (err) {
      console.error('Error fetching records:', err);
      setError(err.message);
      setRecords([]); // Ensure records is always an array even on error
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    // Ensure records is always an array before filtering
    if (!Array.isArray(records)) {
      console.warn('Records is not an array:', records);
      setFilteredRecords([]);
      return;
    }

    let filtered = [...records];

    // Apply date filtering
    if (dateFilter.type !== 'all' && dateFilter.startDate) {
      const startDate = new Date(dateFilter.startDate);
      startDate.setHours(0, 0, 0, 0); // Start of day
      
      let endDate;
      if (dateFilter.endDate) {
        endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
      } else {
        // If no end date, use start date as end date
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      }

      console.log('Filtering records:', {
        type: dateFilter.type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalRecords: records.length
      });

      filtered = filtered.filter(record => {
        if (!record.date) return false; // Skip records without dates
        
        const recordDate = new Date(record.date);
        const isInRange = recordDate >= startDate && recordDate <= endDate;
        
        return isInRange;
      });

      console.log('Filtered records count:', filtered.length);
    }

    setFilteredRecords(filtered);
  };

  const handleDateFilterChange = (filterConfig) => {
    console.log('Date filter changed:', filterConfig);
    setDateFilter(filterConfig);
  };

  // Add retry functionality
  const handleRetry = () => {
    fetchRecords();
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-content">
          <div className="dashboard-loading-spinner"></div>
          <p className="dashboard-loading-text">Loading Safety Records</p>
          <p className="dashboard-loading-subtext">Please wait while we fetch your compliance data</p>
          <div className="dashboard-loading-dots"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="dashboard-error-content">
          <AlertTriangle className="dashboard-error-icon" size={48} />
          <p className="dashboard-error-message">{error}</p>
          <button
            onClick={handleRetry}
            className="dashboard-retry-btn"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-page">
      <div className="summary-header">
        <h1>Safety Compliance Summary</h1>
        <div className="summary-actions">
          <DateFilter onFilterChange={handleDateFilterChange} />
          <ExportOptions data={filteredRecords} />
          <PrintButton data={filteredRecords} />
        </div>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <h3>Total Records</h3>
          <span className="stat-number">{filteredRecords.length}</span>
        </div>
        <div className="stat-card">
          <h3>Defaulters</h3>
          <span className="stat-number error">
            {filteredRecords.filter(r => r.isDefaulter).length}
          </span>
        </div>
        <div className="stat-card">
          <h3>Compliance Rate</h3>
          <span className="stat-number success">
            {filteredRecords.length ? 
              ((filteredRecords.filter(r => !r.isDefaulter).length / filteredRecords.length) * 100).toFixed(1) + '%' 
              : '0%'
            }
          </span>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="no-records">
          <h3>No Records Found</h3>
          <p>No safety compliance records match the current filter criteria.</p>
        </div>
      ) : (
        <SummaryTable data={filteredRecords} />
      )}
    </div>
  );
};

export default SummaryPage;