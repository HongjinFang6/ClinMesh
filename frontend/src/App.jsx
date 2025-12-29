import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';

import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { ModelsPage } from './pages/ModelsPage';
import { PublicModelsPage } from './pages/PublicModelsPage';
import { ModelDetailPage } from './pages/ModelDetailPage';
import { InferencePage } from './pages/InferencePage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { FavoritedModelsPage } from './pages/FavoritedModelsPage';
import { useAuth } from './hooks/useAuth';

const DashboardRouter = () => {
  const { user } = useAuth();
  return user?.role === 'DOCTOR' ? <DoctorDashboard /> : <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardRouter />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <Layout>
                  <FavoritedModelsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/models"
            element={
              <ProtectedRoute>
                <Layout>
                  <ModelsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/public-models"
            element={
              <ProtectedRoute>
                <Layout>
                  <PublicModelsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/models/:modelId"
            element={
              <ProtectedRoute>
                <Layout>
                  <ModelDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/models/:modelId/versions/:versionId"
            element={
              <ProtectedRoute>
                <Layout>
                  <ModelDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/inference"
            element={
              <ProtectedRoute>
                <Layout>
                  <InferencePage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <Layout>
                  <JobsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs/:jobId"
            element={
              <ProtectedRoute>
                <Layout>
                  <JobDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
