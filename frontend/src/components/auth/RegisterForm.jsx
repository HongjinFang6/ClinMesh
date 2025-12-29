import React, { useState } from 'react';
import { register } from '../../api/users';
import { Button } from '../common/Button';

export const RegisterForm = ({ onRegisterSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'DOCTOR'
  });
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Update password strength indicators
    if (name === 'password') {
      setPasswordStrength({
        minLength: value.length >= 8,
        hasUpper: /[A-Z]/.test(value),
        hasLower: /[a-z]/.test(value),
        hasNumber: /[0-9]/.test(value)
      });
    }
  };

  const validatePassword = () => {
    const { password } = formData;
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password before submitting
    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);

    try {
      await register(formData);
      // Call parent component to switch to login tab
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="input"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="input"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
        <div className="space-y-2">
          <div className="flex items-start">
            <input
              type="radio"
              id="doctor"
              name="role"
              value="DOCTOR"
              checked={formData.role === 'DOCTOR'}
              onChange={handleChange}
              className="mt-1 mr-2"
            />
            <label htmlFor="doctor" className="flex-1 cursor-pointer">
              <div className="font-medium text-gray-900">Doctor</div>
              <div className="text-sm text-gray-600">Use AI models for medical image analysis</div>
            </label>
          </div>
          <div className="flex items-start">
            <input
              type="radio"
              id="developer"
              name="role"
              value="DEVELOPER"
              checked={formData.role === 'DEVELOPER'}
              onChange={handleChange}
              className="mt-1 mr-2"
            />
            <label htmlFor="developer" className="flex-1 cursor-pointer">
              <div className="font-medium text-gray-900">Developer</div>
              <div className="text-sm text-gray-600">Upload and manage AI models, plus use them for analysis</div>
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="input"
          required
        />

        {/* Password Strength Indicators */}
        {formData.password && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-medium text-gray-700">Password requirements:</p>
            <div className="space-y-1">
              <div className="flex items-center text-xs">
                {passwordStrength.minLength ? (
                  <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={passwordStrength.minLength ? 'text-green-700' : 'text-gray-500'}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center text-xs">
                {passwordStrength.hasUpper ? (
                  <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={passwordStrength.hasUpper ? 'text-green-700' : 'text-gray-500'}>
                  One uppercase letter
                </span>
              </div>
              <div className="flex items-center text-xs">
                {passwordStrength.hasLower ? (
                  <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={passwordStrength.hasLower ? 'text-green-700' : 'text-gray-500'}>
                  One lowercase letter
                </span>
              </div>
              <div className="flex items-center text-xs">
                {passwordStrength.hasNumber ? (
                  <svg className="h-4 w-4 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-gray-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className={passwordStrength.hasNumber ? 'text-green-700' : 'text-gray-500'}>
                  One number
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Registering...' : 'Register'}
      </Button>
    </form>
  );
};
