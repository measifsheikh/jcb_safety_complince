import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import RecordSelector from './RecordSelector';
import EditForm from './EditForm';
import RecordsList from './RecordsList';
import './UpdatePage.css';

const UpdatePage = () => {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  
  // Track if initial fetch has been completed
  const hasInitiallyFetchedRef = useRef(false);

  // Stable fetch function using useCallback
  const fetchRecords = useCallback(async (searchParams = {}) => {
    try {
      if (!token) {
        console.warn('No token available for API request');
        setError('Authentication token not found');
        setLoading(false);
        setSearchLoading(false);
        return;
      }

      const isSearch = Object.keys(searchParams).length > 0;
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }

      // Build query string from search parameters
      const queryParams = new URLSearchParams();
      
      // Handle search term - search in name and department
      if (searchParams.search && searchParams.search.trim()) {
        queryParams.append('search', searchParams.search.trim());
      }
      
      if (searchParams.date) {
        queryParams.append('startDate', searchParams.date);
        queryParams.append('endDate', searchParams.date);
      }
      
      if (searchParams.area) {
        queryParams.append('area', searchParams.area);
      }
      
      // Set default limit for better performance
      queryParams.append('limit', searchParams.limit || '50');
      queryParams.append('page', searchParams.page || '1');
      queryParams.append('sortBy', 'date');
      queryParams.append('sortOrder', 'desc');

      const queryString = queryParams.toString();
      const url = `/api/safety?${queryString}`;

      console.log('Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
          console.error('API Error Response:', errorData);
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
          console.error('Failed to parse error response:', parseError);
        }

        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view records.';
        } else if (response.status === 404) {
          errorMessage = 'API endpoint not found. Please check your server configuration.';
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      
      // Handle the correct API response format
      if (data && data.records && Array.isArray(data.records)) {
        console.log(`Fetched ${data.records.length} records`);
        setRecords(data.records);
        setPagination(data.pagination || {});
        setError(null);
      } else if (Array.isArray(data)) {
        // Fallback if API returns array directly
        console.log(`Fetched ${data.length} records (direct array)`);
        setRecords(data);
        setError(null);
      } else {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch records');
      setRecords([]);
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, [token]);

  // Manual reload function
  const handleReload = useCallback(() => {
    setError(null);
    setSuccess(null);
    fetchRecords();
  }, [fetchRecords]);

  // Handle search with manual trigger
  const handleSearch = useCallback((searchParams) => {
    setError(null);
    setSuccess(null);
    fetchRecords(searchParams);
  }, [fetchRecords]);

  // Initial fetch effect - only run once when token is available
  useEffect(() => {
    if (token && !hasInitiallyFetchedRef.current) {
      console.log('Performing initial fetch');
      hasInitiallyFetchedRef.current = true;
      fetchRecords();
    } else if (!token) {
      console.warn('No token available, skipping initial fetch');
      setLoading(false);
    }
  }, [token, fetchRecords]);

  const handleRecordSelect = (record) => {
    setSelectedRecord(record);
    setError(null);
    setSuccess(null);
  };

  const handleRecordUpdate = async (updatedRecord) => {
    try {
      // Get the record ID - handle both _id and id
      const recordId = updatedRecord.id || updatedRecord._id;
      
      if (!recordId) {
        throw new Error('Record ID not found');
      }

      console.log('Updating record with ID:', recordId);

      const response = await fetch(`/api/safety/${recordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedRecord)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update record');
      }

      const updated = await response.json();
      
      // Update the record in local state - handle both id formats
      setRecords(prev => prev.map(record => {
        const currentRecordId = record.id || record._id;
        const updatedRecordId = updated.id || updated._id;
        return currentRecordId === updatedRecordId ? updated : record;
      }));
      
      setSelectedRecord(updated);
      setSuccess('Record updated successfully!');
      setError(null);
    } catch (err) {
      console.error('Update error:', err);
      setError(err.message);
      setSuccess(null);
    }
  };

  const handleRecordDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      // Handle both _id and id formats
      const actualRecordId = recordId || selectedRecord?.id || selectedRecord?._id;
      
      if (!actualRecordId) {
        throw new Error('Record ID not found');
      }

      console.log('Deleting record with ID:', actualRecordId);

      const response = await fetch(`/api/safety/${actualRecordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete record');
      }

      // Remove the record from local state - handle both id formats
      setRecords(prev => prev.filter(record => {
        const currentRecordId = record.id || record._id;
        return currentRecordId !== actualRecordId;
      }));
      
      setSelectedRecord(null);
      setSuccess('Record deleted successfully!');
      setError(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message);
      setSuccess(null);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading) return <div className="loading-spinner">Loading records...</div>;

  return (
    <div className="update-page">
      <div className="update-header">
        <div className="header-top">
          <h1>Update Safety Records</h1>
          <button 
            onClick={handleReload} 
            className="reload-button"
            disabled={loading || searchLoading}
          >
            {loading || searchLoading ? 'Loading...' : 'Reload Records'}
          </button>
        </div>
        {error && (
          <div className="error-message">
            {error}
            <button onClick={clearMessages} className="close-btn">×</button>
          </div>
        )}
        {success && (
          <div className="success-message">
            {success}
            <button onClick={clearMessages} className="close-btn">×</button>
          </div>
        )}
      </div>

      <div className="update-content">
        <div className="records-section">
          <RecordSelector 
            records={records} 
            onRecordSelect={handleRecordSelect}
            selectedRecord={selectedRecord}
            onSearch={handleSearch}
            searchLoading={searchLoading}
          />
          <RecordsList 
            records={records.slice(0, 10)} 
            onRecordSelect={handleRecordSelect}
            selectedRecord={selectedRecord}
          />
        </div>

        <div className="edit-section">
          {selectedRecord ? (
            <EditForm
              record={selectedRecord}
              onUpdate={handleRecordUpdate}
              onDelete={handleRecordDelete}
            />
          ) : (
            <div className="no-selection">
              <p>Select a record to edit</p>
              {records.length === 0 && !loading && (
                <p className="no-records-hint">
                  No records found. Try adjusting your search criteria or click "Reload Records".
                </p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdatePage;