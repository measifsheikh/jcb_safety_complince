import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Users, AlertTriangle, Shield, Filter } from 'lucide-react';
import './GraphPage.css';

const DashboardPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('month');
  
  // Fixed capacity per area
  const AREA_CAPACITY = 120;
  
  // Cache for API responses
  const [cache, setCache] = useState(new Map());
  
  // Ref to track current request and enable cancellation
  const abortControllerRef = useRef(null);
  
  // Debounce timer ref
  const debounceTimerRef = useRef(null);
  
  const [dashboardData, setDashboardData] = useState({
    overview: null,
    areaDefaulters: [],
    monthlyTrend: [],
    equipmentBreakdown: [],
    departmentAnalytics: [],
    dailyTrend: []
  });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Memoized headers to prevent recreation
  const headers = useMemo(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }), [token]);

  // Helper function to get date range parameters
  const getDateRangeParams = useCallback((range) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'day':
        return {
          startDate: today.toISOString(),
          endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
        };
      case 'week':
        // Fixed week calculation - get Monday to Sunday
        const currentDay = today.getDay();
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday (0), go back 6 days to Monday
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return {
          startDate: weekStart.toISOString(),
          endDate: weekEnd.toISOString()
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return {
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString()
        };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        yearStart.setHours(0, 0, 0, 0);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        yearEnd.setHours(23, 59, 59, 999);
        return {
          startDate: yearStart.toISOString(),
          endDate: yearEnd.toISOString(),
          year: today.getFullYear()
        };
      default:
        return {};
    }
  }, []);

  // Process area data to include capacity-based calculations
  const processAreaData = useCallback((areaData) => {
    return areaData.map(area => {
      const defaulters = area.defaulters || 0;
      const nonDefaulters = AREA_CAPACITY - defaulters;
      const complianceRate = ((nonDefaulters / AREA_CAPACITY) * 100).toFixed(1);
      const nonComplianceRate = ((defaulters / AREA_CAPACITY) * 100).toFixed(1);
      
      return {
        ...area,
        totalPersons: AREA_CAPACITY,
        defaulters: defaulters,
        nonDefaulters: nonDefaulters,
        complianceRate: parseFloat(complianceRate),
        nonComplianceRate: parseFloat(nonComplianceRate)
      };
    });
  }, []);

  // Process overview data with capacity calculations
  const processOverviewData = useCallback((overview, areaData) => {
    if (!overview) return null;
    
    const totalAreas = areaData.length;
    const totalCapacity = totalAreas * AREA_CAPACITY;
    const totalDefaulters = areaData.reduce((sum, area) => sum + (area.defaulters || 0), 0);
    const totalNonDefaulters = totalCapacity - totalDefaulters;
    const complianceRate = totalCapacity > 0 ? ((totalNonDefaulters / totalCapacity) * 100).toFixed(1) : 0;
    const nonCompliantRate = totalCapacity > 0 ? ((totalDefaulters / totalCapacity) * 100).toFixed(1) : 0;

    return {
      totalRecords: totalCapacity,
      totalDefaulters: totalDefaulters,
      totalNonDefaulters: totalNonDefaulters,
      complianceRate: parseFloat(complianceRate),
      nonCompliantRate: parseFloat(nonCompliantRate),
      totalAreas: totalAreas
    };
  }, []);

  // Debounced fetch function
  const debouncedFetch = useCallback((range) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      fetchDashboardData(range);
    }, 300); // 300ms debounce
  }, []);

  // Check if data is in cache
  const getCachedData = useCallback((range) => {
    return cache.get(range);
  }, [cache]);

  // Add data to cache
  const setCachedData = useCallback((range, data) => {
    setCache(prevCache => {
      const newCache = new Map(prevCache);
      newCache.set(range, {
        data,
        timestamp: Date.now()
      });
      // Keep only last 5 cache entries to prevent memory issues
      if (newCache.size > 5) {
        const firstKey = newCache.keys().next().value;
        newCache.delete(firstKey);
      }
      return newCache;
    });
  }, []);

  // Check if cached data is still valid (5 minutes)
  const isCacheValid = useCallback((cacheEntry) => {
    if (!cacheEntry) return false;
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - cacheEntry.timestamp) < fiveMinutes;
  }, []);

  const fetchDashboardData = async (range = dateRange) => {
    // Check cache first
    const cachedEntry = getCachedData(range);
    if (cachedEntry && isCacheValid(cachedEntry)) {
      setDashboardData(cachedEntry.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      // Get date range parameters
      const dateParams = getDateRangeParams(range);
      console.log(`Fetching data for ${range}:`, dateParams); // Debug log
      
      // Build query parameters for different endpoints
      const buildQueryParams = (endpoint) => {
        const params = new URLSearchParams();
        
        switch (endpoint) {
          case 'dashboard':
          case 'area-defaulters':
          case 'equipment-breakdown':
          case 'department-analytics':
            if (dateParams.startDate) params.append('startDate', dateParams.startDate);
            if (dateParams.endDate) params.append('endDate', dateParams.endDate);
            break;
          case 'monthly-trend':
            if (dateParams.year) {
              params.append('year', dateParams.year);
            } else if (dateParams.startDate && dateParams.endDate) {
              // Fallback for monthly trend with date range
              params.append('startDate', dateParams.startDate);
              params.append('endDate', dateParams.endDate);
            }
            break;
          case 'daily-trend':
            // Daily trend requires both startDate and endDate
            if (dateParams.startDate && dateParams.endDate) {
              params.append('startDate', dateParams.startDate);
              params.append('endDate', dateParams.endDate);
            }
            break;
        }
        
        return params.toString();
      };

      // Fetch data sequentially instead of simultaneously to reduce server load
      const endpoints = [
        'area-defaulters', // Fetch this first as we need it for overview calculation
        'equipment-breakdown',
        'department-analytics'
      ];

      // Add trend endpoints based on range
      if (range === 'year') {
        endpoints.push('monthly-trend');
      }
      
      if (range === 'day' || range === 'week' || range === 'month') {
        endpoints.push('daily-trend');
      }

      const results = {};
      
      // Fetch with rate limiting (small delay between requests)
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        
        try {
          const queryParams = buildQueryParams(endpoint);
          const url = `${API_BASE_URL}/api/analytics/${endpoint}${queryParams ? `?${queryParams}` : ''}`;
          
          console.log(`Fetching ${endpoint}:`, url); // Debug log
          
          const response = await fetch(url, { headers, signal });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${endpoint}`);
          }
          
          const data = await response.json();
          results[endpoint] = data;
          
          console.log(`${endpoint} data:`, data); // Debug log
          
          // Small delay between requests to prevent server overload
          if (i < endpoints.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('Request cancelled');
            return;
          }
          console.error(`Error fetching ${endpoint}:`, err);
          // Continue with other requests even if one fails
          results[endpoint] = [];
        }
      }

      // Process the area defaulters data first
      const processedAreaData = processAreaData(results['area-defaulters'] || []);
      
      // Calculate overview based on processed area data
      const processedOverview = processOverviewData(null, processedAreaData);

      const dashboardResult = {
        overview: processedOverview,
        areaDefaulters: processedAreaData,
        monthlyTrend: results['monthly-trend'] || [],
        equipmentBreakdown: results['equipment-breakdown'] || [],
        departmentAnalytics: results['department-analytics'] || [],
        dailyTrend: results['daily-trend'] || []
      };

      console.log('Final dashboard result:', dashboardResult); // Debug log

      setDashboardData(dashboardResult);
      
      // Cache the result
      setCachedData(range, dashboardResult);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Dashboard data fetch error:', error);
        setError(`Failed to load dashboard data: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Effect with debouncing
  useEffect(() => {
    debouncedFetch(dateRange);
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [dateRange, debouncedFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Retry with cache clearing
  const handleRetry = useCallback(() => {
    // Clear cache for current range
    setCache(prevCache => {
      const newCache = new Map(prevCache);
      newCache.delete(dateRange);
      return newCache;
    });
    fetchDashboardData();
  }, [dateRange]);

  // Memoized colors to prevent recreation
  const COLORS = useMemo(() => [
    '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'
  ], []);

  // Loading state
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-content">
          <div className="dashboard-loading-spinner"></div>
          <p className="dashboard-loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
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
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-title-section">
              <h1>
                <TrendingUp className="dashboard-title-icon" size={32} />
                Safety Analytics Dashboard
              </h1>
              <p className="dashboard-subtitle">Monitor safety compliance across all areas (Capacity: {AREA_CAPACITY} per area)</p>
            </div>
            
            {/* Date Range Filter */}
            <div className="dashboard-filter-section">
              <Filter className="dashboard-filter-icon" size={20} />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="dashboard-date-select"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        {dashboardData.overview && (
          <div className="dashboard-stats-grid">
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-content">
                <Users className="dashboard-stat-icon" size={32} style={{color: '#667eea'}} />
                <div className="dashboard-stat-details">
                  <p className="dashboard-stat-label">Total Capacity</p>
                  <p className="dashboard-stat-value">{dashboardData.overview.totalRecords}</p>
                  <p className="dashboard-stat-sublabel">({dashboardData.overview.totalAreas} areas × {AREA_CAPACITY})</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-content">
                <AlertTriangle className="dashboard-stat-icon" size={32} style={{color: '#ef4444'}} />
                <div className="dashboard-stat-details">
                  <p className="dashboard-stat-label">Total Defaulters</p>
                  <p className="dashboard-stat-value">{dashboardData.overview.totalDefaulters}</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-content">
                <Shield className="dashboard-stat-icon" size={32} style={{color: '#10b981'}} />
                <div className="dashboard-stat-details">
                  <p className="dashboard-stat-label">Non-Defaulters</p>
                  <p className="dashboard-stat-value">{dashboardData.overview.totalNonDefaulters}</p>
                  <p className="dashboard-stat-sublabel">{dashboardData.overview.complianceRate}% compliant</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-stat-card">
              <div className="dashboard-stat-content">
                <Calendar className="dashboard-stat-icon" size={32} style={{color: '#8b5cf6'}} />
                <div className="dashboard-stat-details">
                  <p className="dashboard-stat-label">Non-Compliance Rate</p>
                  <p className="dashboard-stat-value">{dashboardData.overview.nonCompliantRate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="dashboard-charts-grid">
          {/* Area vs Defaulters Chart */}
          <div className="dashboard-chart-card">
            <h3 className="dashboard-chart-title">Area Compliance Status (Capacity: {AREA_CAPACITY} each)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.areaDefaulters}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(102, 126, 234, 0.2)" />
                <XAxis 
                  dataKey="area" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name) => {
                    if (name === 'Non-Defaulters') {
                      return [`${value} (${((value / AREA_CAPACITY) * 100).toFixed(1)}%)`, name];
                    }
                    if (name === 'Defaulters') {
                      return [`${value} (${((value / AREA_CAPACITY) * 100).toFixed(1)}%)`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="nonDefaulters" fill="#10b981" name="Non-Defaulters" radius={[4, 4, 0, 0]} />
                <Bar dataKey="defaulters" fill="#ef4444" name="Defaulters" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Equipment Compliance Breakdown */}
          <div className="dashboard-chart-card">
            <h3 className="dashboard-chart-title">Equipment Compliance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboardData.equipmentBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ equipment, complianceRate }) => `${equipment}: ${complianceRate}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="compliant"
                >
                  {dashboardData.equipmentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Charts */}
        <div className="dashboard-trends-grid">
          {/* Monthly Trend */}
          <div className="dashboard-chart-card">
            <h3 className="dashboard-chart-title">Monthly Compliance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(102, 126, 234, 0.2)" />
                <XAxis 
                  dataKey="month" 
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="complianceRate" 
                  stroke="#10b981" 
                  name="Compliance Rate %" 
                  strokeWidth={3}
                  dot={{fill: '#10b981', strokeWidth: 2, r: 6}}
                />
                <Line 
                  type="monotone" 
                  dataKey="defaulters" 
                  stroke="#ef4444" 
                  name="Defaulters" 
                  strokeWidth={3}
                  dot={{fill: '#ef4444', strokeWidth: 2, r: 6}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Department Analytics */}
          <div className="dashboard-chart-card">
            <h3 className="dashboard-chart-title">Department Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.departmentAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(102, 126, 234, 0.2)" />
                <XAxis 
                  dataKey="department" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{fill: '#64748b', fontSize: 12}}
                />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="complianceRate" 
                  fill="#10b981" 
                  name="Compliance Rate %" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Trend */}
        {dashboardData.dailyTrend.length > 0 && (
          <div className="dashboard-daily-trend">
            <div className="dashboard-chart-card">
              <h3 className="dashboard-chart-title">Daily Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(102, 126, 234, 0.2)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{fill: '#64748b', fontSize: 12}}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(102, 126, 234, 0.2)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="totalRecords" 
                    stroke="#667eea" 
                    name="Total Records" 
                    strokeWidth={3}
                    dot={{fill: '#667eea', strokeWidth: 2, r: 6}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="defaulters" 
                    stroke="#ef4444" 
                    name="Defaulters" 
                    strokeWidth={3}
                    dot={{fill: '#ef4444', strokeWidth: 2, r: 6}}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="complianceRate" 
                    stroke="#10b981" 
                    name="Compliance Rate %" 
                    strokeWidth={3}
                    dot={{fill: '#10b981', strokeWidth: 2, r: 6}}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;