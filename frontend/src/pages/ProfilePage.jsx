import React, { useEffect, useState } from 'react';
import { getProfile } from '../api/users';
import { Card } from '../components/common/Card';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role) => {
    return role === 'DEVELOPER' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const getRoleDisplayName = (role) => {
    return role === 'DEVELOPER' ? 'Developer' : 'Doctor';
  };

  const getRoleDescription = (role) => {
    return role === 'DEVELOPER'
      ? 'Can upload, manage, and use AI models'
      : 'Can use AI models for medical image analysis';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">View your account information</p>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
            <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.username}</h2>
              <div className="flex items-center mt-1 space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(profile.role)}`}>
                  {getRoleDisplayName(profile.role)}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Username</h3>
              <p className="text-lg text-gray-900">{profile.username}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Email Address</h3>
              <p className="text-lg text-gray-900">{profile.email}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Account Type</h3>
              <p className="text-lg text-gray-900">{getRoleDisplayName(profile.role)}</p>
              <p className="text-sm text-gray-600 mt-1">{getRoleDescription(profile.role)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Member Since</h3>
              <p className="text-lg text-gray-900">{formatDate(profile.created_at)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">User ID</h3>
              <p className="text-sm font-mono text-gray-600">{profile.id}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Capabilities */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Capabilities</h3>
        <div className="space-y-3">
          {profile.role === 'DEVELOPER' ? (
            <>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Upload AI Models</p>
                  <p className="text-sm text-gray-600">Create and upload custom model packages</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Manage Models</p>
                  <p className="text-sm text-gray-600">Edit, delete, and version your models</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Run Inference Jobs</p>
                  <p className="text-sm text-gray-600">Process medical images using AI models</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Use AI Models</p>
                  <p className="text-sm text-gray-600">Access available models for medical image analysis</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Run Inference Jobs</p>
                  <p className="text-sm text-gray-600">Process medical images and view results</p>
                </div>
              </div>
              <div className="flex items-start">
                <svg className="h-5 w-5 text-gray-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-gray-500">Upload Models</p>
                  <p className="text-sm text-gray-600">Upgrade to Developer account to upload custom models</p>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
