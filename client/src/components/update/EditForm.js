import React, { useState, useEffect } from 'react';
import { AREAS } from '../../utils/constants';
import './EditForm.css';

const EditForm = ({ record, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    area: '',
    date: '',
    safetyShoes: false,
    safetyGlasses: false,
    safetyJacket: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (record) {
      setFormData({
        name: record.name || '',
        department: record.department || '',
        area: record.area || '',
        date: record.date ? record.date.split('T')[0] : '',
        safetyShoes: record.safetyShoes || false,
        safetyGlasses: record.safetyGlasses || false,
        safetyJacket: record.safetyJacket || false
      });
      setErrors({});
    }
  }, [record]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (!formData.area) {
      newErrors.area = 'Area is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Validate that we have a record ID
    const recordId = record?.id || record?._id;
    if (!recordId) {
      setErrors({ general: 'Record ID not found. Please select a record again.' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const updatedRecord = {
        ...record,
        ...formData,
        // Preserve both id formats if they exist
        id: record.id,
        _id: record._id,
        isDefaulter: !formData.safetyShoes || !formData.safetyGlasses || !formData.safetyJacket,
        strength: 120 // Fixed value as per requirements
      };

      console.log('Submitting updated record:', updatedRecord);
      await onUpdate(updatedRecord);
    } catch (error) {
      console.error('Error updating record:', error);
      setErrors({ general: 'Failed to update record. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    const recordId = record?.id || record?._id;
    if (!recordId) {
      setErrors({ general: 'Record ID not found. Please select a record again.' });
      return;
    }
    onDelete(recordId);
  };

  if (!record) {
    return null;
  }

  // Get display ID for the header
  const displayId = record.id || record._id || 'Unknown';

  return (
    <div className="edit-form">
      <div className="form-header">
        <h3>Edit Record</h3>
        <span className="record-id">ID: {displayId}</span>
      </div>

      {errors.general && (
        <div className="error-message general-error">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={errors.name ? 'error' : ''}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="department">Department *</label>
          <input
            type="text"
            id="department"
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            className={errors.department ? 'error' : ''}
          />
          {errors.department && <span className="error-text">{errors.department}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="area">Area *</label>
          <select
            id="area"
            name="area"
            value={formData.area}
            onChange={handleInputChange}
            className={errors.area ? 'error' : ''}
          >
            <option value="">Select Area</option>
            {AREAS.map(area => (
              <option key={area} value={area}>
                {area.replace('_', ' ')}
              </option>
            ))}
          </select>
          {errors.area && <span className="error-text">{errors.area}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className={errors.date ? 'error' : ''}
          />
          {errors.date && <span className="error-text">{errors.date}</span>}
        </div>

        <div className="safety-equipment">
          <h4>Safety Equipment</h4>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="safetyShoes"
                checked={formData.safetyShoes}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              Safety Shoes
            </label>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="safetyGlasses"
                checked={formData.safetyGlasses}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              Safety Glasses
            </label>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="safetyJacket"
                checked={formData.safetyJacket}
                onChange={handleInputChange}
              />
              <span className="checkmark"></span>
              Safety Jacket
            </label>
          </div>
        </div>

        <div className="compliance-status">
          <span className={`status-indicator ${(!formData.safetyShoes || !formData.safetyGlasses || !formData.safetyJacket) ? 'non-compliant' : 'compliant'}`}>
            Status: {(!formData.safetyShoes || !formData.safetyGlasses || !formData.safetyJacket) ? 'Non-Compliant' : 'Compliant'}
          </span>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="save-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          
          <button
            type="button"
            className="delete-button"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            Delete Record
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditForm;