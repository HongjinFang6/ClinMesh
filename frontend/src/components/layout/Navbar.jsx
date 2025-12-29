import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

export const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-2xl font-bold text-primary-500">
              ClinAI
            </Link>
            {isAuthenticated && (
              <div className="ml-10 flex space-x-4">
                <Link to="/dashboard" className="text-gray-700 hover:text-primary-500 px-3 py-2">
                  Dashboard
                </Link>
                <Link to="/models" className="text-gray-700 hover:text-primary-500 px-3 py-2">
                  My Models
                </Link>
                <Link to="/public-models" className="text-gray-700 hover:text-primary-500 px-3 py-2">
                  Public Models
                </Link>
                <Link to="/inference" className="text-gray-700 hover:text-primary-500 px-3 py-2">
                  Inference
                </Link>
                <Link to="/jobs" className="text-gray-700 hover:text-primary-500 px-3 py-2">
                  Jobs
                </Link>
              </div>
            )}
          </div>
          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              <Link to="/profile" className="text-gray-700 hover:text-primary-500 px-3 py-2">
                Profile
              </Link>
              <Button onClick={logout} variant="secondary">
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
