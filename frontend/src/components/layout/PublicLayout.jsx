import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

export const PublicLayout = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // Check if user is a doctor
  const isDoctor = user?.role === 'DOCTOR';

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  const handleUploadModelClick = () => {
    if (isAuthenticated) {
      navigate('/models');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-primary-500">
                ClinMesh
              </Link>
              <div className="ml-10 flex space-x-4">
                <Link to="/" className="text-gray-700 hover:text-primary-500 px-3 py-2 font-medium">
                  Home
                </Link>
                <Link to="/public-models" className="text-gray-700 hover:text-primary-500 px-3 py-2 font-medium">
                  Public Models
                </Link>
                {isAuthenticated && (
                  <>
                    {!isDoctor && (
                      <Link to="/models" className="text-gray-700 hover:text-primary-500 px-3 py-2 font-medium">
                        My Models
                      </Link>
                    )}
                    <Link to="/favorites" className="text-gray-700 hover:text-primary-500 px-3 py-2 font-medium">
                      My Favorites
                    </Link>
                    <Link to="/jobs" className="text-gray-700 hover:text-primary-500 px-3 py-2 font-medium">
                      My Jobs
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Developer Upload Model Button - Only show for non-doctors */}
              {!isDoctor && (
                <Button
                  onClick={handleUploadModelClick}
                  variant="primary"
                  className="bg-secondary-500 hover:bg-secondary-600"
                >
                  <svg className="h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Model
                </Button>
              )}

              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="text-gray-700 hover:text-primary-500 px-3 py-2">
                    Profile
                  </Link>
                  <Button onClick={logout} variant="secondary">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleLoginClick} variant="secondary">
                    Login
                  </Button>
                  <Button onClick={handleRegisterClick} variant="primary">
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
