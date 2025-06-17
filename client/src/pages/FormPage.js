import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Save, User, MapPin, Calendar, Shield, CheckCircle, XCircle, AlertTriangle, Building2 } from 'lucide-react';
import './Formpage.css';

const SafetyFormPage = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const submitTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Area options - matches backend enum
  const AREAS = [
    { value: 'PRODUCTION_FLOOR', label: 'Production Floor' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'OFFICE', label: 'Office' },
    { value: 'LOADING_DOCK', label: 'Loading Dock' },
    { value: 'QUALITY_CONTROL', label: 'Quality Control' }
  ];

  // Department options for manufacturing company like JCB
  const DEPARTMENTS = [
    { value: 'PRODUCTION', label: 'Production' },
    { value: 'ASSEMBLY', label: 'Assembly' },
    { value: 'WELDING', label: 'Welding' },
    { value: 'MACHINING', label: 'Machining' },
    { value: 'FABRICATION', label: 'Fabrication' },
    { value: 'QUALITY_ASSURANCE', label: 'Quality Assurance' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'LOGISTICS', label: 'Logistics & Supply Chain' },
    { value: 'ENGINEERING', label: 'Engineering' },
    { value: 'PAINT_SHOP', label: 'Paint Shop' }
  ];

  const [formData, setFormData] = useState({
    area: '',
    name: '',
    department: '',
    date: new Date().toISOString().split('T')[0],
    safetyShoes: false,
    safetyGlasses: false,
    safetyJacket: false,
    strength: 120
  });

  // Debounced input change handler
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear message when user starts typing
    if (message.text) setMessage({ type: '', text: '' });
  };

  const validateForm = () => {
    if (!formData.area) return 'Please select an area';
    if (!formData.name.trim()) return 'Please enter name';
    if (!formData.department.trim()) return 'Please select department';
    if (!formData.date) return 'Please select date';
    return null;
  };

  // Enhanced submit with request management
  const handleSubmit = async () => {
    // Prevent multiple simultaneous submissions
    if (isLoading) {
      setMessage({ type: 'error', text: 'Please wait for the current submission to complete' });
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setMessage({ type: '', text: '' });

    // Clear any existing timeout
    if (submitTimeoutRef.current) {
      clearTimeout(submitTimeoutRef.current);
    }

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // Set a timeout for the request
      const timeoutPromise = new Promise((_, reject) => {
        submitTimeoutRef.current = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, 30000); // 30 second timeout
      });

      const fetchPromise = fetch(`${API_BASE_URL}/api/safety`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        signal: abortControllerRef.current.signal
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Clear timeout if request completes
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setMessage({ type: 'success', text: 'Safety record submitted successfully!' });
      
      // Reset form after successful submission
      setFormData({
        area: '',
        name: '',
        department: '',
        date: new Date().toISOString().split('T')[0],
        safetyShoes: false,
        safetyGlasses: false,
        safetyJacket: false,
        strength: 120
      });

    } catch (error) {
      console.error('Submit error:', error);
      
      if (error.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request was cancelled' });
      } else if (error.message === 'Request timeout') {
        setMessage({ type: 'error', text: 'Request timed out. Please try again.' });
      } else if (error.message.includes('Failed to fetch')) {
        setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to submit record. Please try again.' });
      }
    } finally {
      setIsLoading(false);
      
      // Clean up timeout
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    }
  };

  // Cleanup on component unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // Calculate if person is defaulter
  const isDefaulter = !formData.safetyShoes || !formData.safetyGlasses || !formData.safetyJacket;

  return (
    <div className="form-page-container min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="form-header">
          <div className="form-icon-container">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="form-title">Safety Compliance Form</h1>
          <p className="form-subtitle">Record safety equipment compliance for personnel</p>
        </div>

        {/* Form Card */}
        <div className="form-card">
          {/* Message Display */}
          {message.text && (
            <div className={`form-message ${message.type}`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Area Selection */}
          <div className="form-field">
            <label className="form-label">
              <MapPin className="h-4 w-4" />
              Area *
            </label>
            <select
              name="area"
              value={formData.area}
              onChange={handleInputChange}
              className="form-select"
              disabled={isLoading}
            >
              <option value="">Select Area</option>
              {AREAS.map(area => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </div>

          {/* Personal Details Grid */}
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">
                <User className="h-4 w-4" />
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter full name"
                disabled={isLoading}
              />
            </div>

            <div className="form-field">
              <label className="form-label">
                <Building2 className="h-4 w-4" />
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="form-select"
                disabled={isLoading}
              >
                <option value="">Select Department</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div className="form-field">
            <label className="form-label">
              <Calendar className="h-4 w-4" />
              Date *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="form-input"
              disabled={isLoading}
            />
          </div>

          {/* Safety Equipment Section */}
          <div className="safety-equipment-section">
            <h3 className="safety-equipment-title">
              <Shield className="h-5 w-5 mr-2" />
              Safety Equipment Compliance
            </h3>
            <div className="space-y-3">
              {[
                { name: 'safetyShoes', label: 'Safety Shoes', emoji: '👟' },
                { name: 'safetyGlasses', label: 'Safety Glasses', emoji: '🥽' },
                { name: 'safetyJacket', label: 'Safety Jacket', emoji: '🦺' }
              ].map(item => (
                <div key={item.name} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={item.name}
                    name={item.name}
                    checked={formData[item.name]}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                  <label htmlFor={item.name} className="checkbox-label">
                    <span className="checkbox-emoji">{item.emoji}</span>
                    {item.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Strength Display */}
          <div className="form-field">
            <label className="form-label">
              Strength
            </label>
            <div className="strength-display">
              {formData.strength}
            </div>
          </div>

          {/* Compliance Status */}
          <div className={`compliance-status ${isDefaulter ? 'non-compliant' : 'compliant'}`}>
            <div className="flex items-center">
              {isDefaulter ? (
                <AlertTriangle className="h-5 w-5 compliance-icon" />
              ) : (
                <CheckCircle className="h-5 w-5 compliance-icon" />
              )}
              <div>
                <div className="compliance-text">
                  {isDefaulter ? 'Non-Compliant (Defaulter)' : 'Fully Compliant'}
                </div>
                {isDefaulter && (
                  <div className="compliance-description">
                    Missing required safety equipment
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="submit-button"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Submit Safety Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyFormPage;