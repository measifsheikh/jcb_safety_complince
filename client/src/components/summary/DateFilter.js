import React, { useState, useEffect } from 'react';
import './DateFilter.css';

const DateFilter = ({ onFilterChange }) => {
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Call onFilterChange whenever filter changes
  useEffect(() => {
    handleFilterChange();
  }, [filterType, startDate, endDate]);

  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    
    const today = new Date();
    let start = null;
    let end = null;

    switch (type) {
      case 'day':
        start = today.toISOString().split('T')[0];
        end = start;
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = today.toISOString().split('T')[0];
        break;
      case 'all':
      default:
        start = null;
        end = null;
    }

    // Update state - this will trigger useEffect
    if (type !== 'custom') {
      setStartDate(start || '');
      setEndDate(end || '');
    }
  };

  const handleFilterChange = () => {
    // Always call onFilterChange with current state
    onFilterChange({
      type: filterType,
      startDate: startDate || null,
      endDate: endDate || null
    });
  };

  const handleStartDateChange = (value) => {
    setStartDate(value);
    // useEffect will handle calling onFilterChange
  };

  const handleEndDateChange = (value) => {
    setEndDate(value);
    // useEffect will handle calling onFilterChange
  };

  const handleCustomClick = () => {
    setFilterType('custom');
    // Don't change dates when switching to custom - keep existing values
    // useEffect will handle calling onFilterChange
  };

  return (
    <div className="date-filter">
      <div className="filter-buttons">
        <button 
          className={filterType === 'all' ? 'active' : ''}
          onClick={() => handleFilterTypeChange('all')}
        >
          All
        </button>
        <button 
          className={filterType === 'day' ? 'active' : ''}
          onClick={() => handleFilterTypeChange('day')}
        >
          Today
        </button>
        <button 
          className={filterType === 'week' ? 'active' : ''}
          onClick={() => handleFilterTypeChange('week')}
        >
          This Week
        </button>
        <button 
          className={filterType === 'month' ? 'active' : ''}
          onClick={() => handleFilterTypeChange('month')}
        >
          This Month
        </button>
        <button 
          className={filterType === 'year' ? 'active' : ''}
          onClick={() => handleFilterTypeChange('year')}
        >
          This Year
        </button>
        <button 
          className={filterType === 'custom' ? 'active' : ''}
          onClick={handleCustomClick}
        >
          Custom
        </button>
      </div>

      {filterType === 'custom' && (
        <div className="custom-date-inputs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
            placeholder="End Date"
          />
        </div>
      )}
    </div>
  );
};

export default DateFilter;