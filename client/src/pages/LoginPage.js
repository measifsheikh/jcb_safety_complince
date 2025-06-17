import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import './LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    secretId: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!formData.secretId || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(formData.secretId, formData.password);
      
      if (result.success) {
        // Login successful - parent component should handle redirect
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Header */}
        <div className="login-header">
          <div className="logo-container">
            <Shield className="logo-icon" />
          </div>
          <h2 className="login-title">
            Safety Compliance Tracker
          </h2>
          <p className="login-subtitle">
            Sign in to access the safety monitoring system
          </p>
        </div>

        {/* Login Form */}
        <div className="login-form-card">
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="error-message">
                <AlertCircle className="error-icon" />
                <span>{error}</span>
              </div>
            )}

            {/* Secret ID Field */}
            <div className="form-group">
              <label htmlFor="secretId" className="form-label">
                Secret ID
              </label>
              <div>
                <input
                  id="secretId"
                  name="secretId"
                  type="text"
                  required
                  value={formData.secretId}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your secret ID"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-container">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="password-toggle-icon" />
                  ) : (
                    <Eye className="password-toggle-icon" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="submit-button"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="footer-text">
            Secure access to safety compliance monitoring system
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;