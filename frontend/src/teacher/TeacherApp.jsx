import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../shared/context/AuthContext';
import Navbar from '../shared/components/Navbar';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import UnitDetails from './pages/UnitDetails';

function TeacherRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading" style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="" />;
  }
  
  if (user.userType !== 'teacher') {
    window.location.href = '/student';
    return null;
  }
  
  return children;
}

function WelcomeRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading" style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;
  }
  
  if (user && user.userType === 'teacher') {
    return <Navigate to="dashboard" />;
  }
  
  if (user && user.userType !== 'teacher') {
    window.location.href = '/student';
    return null;
  }
  
  return children;
}

function TeacherApp() {
  return (
    <AuthProvider>
      <Router basename="/teacher">
        <div className="App">
          <Routes>
            <Route path="/" element={
              <WelcomeRoute>
                <Welcome />
              </WelcomeRoute>
            } />
            <Route path="/dashboard" element={
              <TeacherRoute>
                <>
                  <Navbar />
                  <main className="container">
                    <Dashboard />
                  </main>
                </>
              </TeacherRoute>
            } />
            <Route path="/upload" element={
              <TeacherRoute>
                <>
                  <Navbar />
                  <main className="container">
                    <Upload />
                  </main>
                </>
              </TeacherRoute>
            } />
            <Route path="/units/:id" element={
              <TeacherRoute>
                <>
                  <Navbar />
                  <main className="container">
                    <UnitDetails />
                  </main>
                </>
              </TeacherRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default TeacherApp;