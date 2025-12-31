import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicLayout } from './components/layout/PublicLayout';

import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { ModelsPage } from './pages/ModelsPage';
import { PublicModelsPage } from './pages/PublicModelsPage';
import { ModelDetailPage } from './pages/ModelDetailPage';
import { InferencePage } from './pages/InferencePage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { FavoritedModelsPage } from './pages/FavoritedModelsPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public homepage */}
          <Route path="/" element={
            <PublicLayout>
              <HomePage />
            </PublicLayout>
          } />

          {/* Login page */}
          <Route path="/login" element={<LandingPage />} />

          {/* Register page */}
          <Route path="/register" element={<LandingPage />} />

          {/* Legacy dashboard route - redirect to home */}
          <Route
            path="/dashboard"
            element={<Navigate to="/" replace />}
          />

          {/* Profile - requires auth */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <ProfilePage />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* Favorites - requires auth */}
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <FavoritedModelsPage />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* Developer: My Models - requires auth */}
          <Route
            path="/models"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <ModelsPage />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* Public models - accessible without auth */}
          <Route
            path="/public-models"
            element={
              <PublicLayout>
                <PublicModelsPage />
              </PublicLayout>
            }
          />

          {/* Model detail - public, no auth required */}
          <Route
            path="/models/:modelId"
            element={
              <PublicLayout>
                <ModelDetailPage />
              </PublicLayout>
            }
          />

          <Route
            path="/models/:modelId/versions/:versionId"
            element={
              <PublicLayout>
                <ModelDetailPage />
              </PublicLayout>
            }
          />

          {/* Inference - accessible without auth but with reminder */}
          <Route
            path="/inference"
            element={
              <PublicLayout>
                <InferencePage />
              </PublicLayout>
            }
          />

          {/* Jobs - requires auth */}
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <JobsPage />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs/:jobId"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <JobDetailPage />
                </PublicLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
