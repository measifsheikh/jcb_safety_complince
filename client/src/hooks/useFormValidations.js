import { useState, useCallback } from 'react';

export const useFormValidation = (validationRules) => {
  const [errors, setErrors] = useState({});

  const validate = useCallback((data) => {
    const newErrors = {};

    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = data[field];

      if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        newErrors[field] = rules.required;
      } else if (value && rules.minLength && value.length < rules.minLength) {
        newErrors[field] = `Must be at least ${rules.minLength} characters`;
      } else if (value && rules.maxLength && value.length > rules.maxLength) {
        newErrors[field] = `Must be no more than ${rules.maxLength} characters`;
      } else if (value && rules.pattern && !rules.pattern.test(value)) {
        newErrors[field] = rules.patternMessage || 'Invalid format';
      } else if (rules.custom) {
        const customError = rules.custom(value, data);
        if (customError) {
          newErrors[field] = customError;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validationRules]);

  const clearError = useCallback((field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validate, clearError, clearAllErrors };
};
