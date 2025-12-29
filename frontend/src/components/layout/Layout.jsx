import React from 'react';
import { Navbar } from './Navbar';
import { DoctorNavbar } from './DoctorNavbar';
import { useAuth } from '../../hooks/useAuth';

export const Layout = ({ children }) => {
  const { user } = useAuth();

  const isDoctor = user?.role === 'DOCTOR';

  return (
    <div className="min-h-screen bg-gray-50">
      {isDoctor ? <DoctorNavbar /> : <Navbar />}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
