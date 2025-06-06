import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../shared/context/AuthContext';
import Navbar from '../shared/components/Navbar';
import Login from '../shared/pages/Login';
import Register from '../shared/pages/Register';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import UnitDetails from './pages/UnitDetails';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return !user ? children : <Navigate to="/dashboard" />;
}

function TeacherRoute({ children }) {
  const { user, loading } = useAuth();
  
  console.log('TeacherRoute check - loading:', loading, 'user:', user);
  
  if (loading) {
    return <div className="loading" style={{ padding: '50px', textAlign: 'center', backgroundColor: 'white' }}>Loading teacher dashboard...</div>;
  }
  
  if (!user) {
    console.log('TeacherRoute: No user, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  if (user.userType !== 'teacher') {
    console.log('TeacherRoute: User is not teacher, redirecting to student');
    window.location.href = '/student.html';
    return null;
  }
  
  console.log('TeacherRoute: Access granted to teacher dashboard');
  return children;
}

function TeacherApp() {
  console.log('TeacherApp rendering, current URL:', window.location.href);
  
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="container">
            <Routes>
              <Route path="/" element={
                <div>
                  <p>Teacher App Root - Redirecting to dashboard...</p>
                  <Navigate to="/dashboard" />
                </div>
              } />
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />
              <Route path="/dashboard" element={
                <TeacherRoute>
                  <Dashboard />
                </TeacherRoute>
              } />
              <Route path="/upload" element={
                <TeacherRoute>
                  <Upload />
                </TeacherRoute>
              } />
              <Route path="/units/:id" element={
                <TeacherRoute>
                  <UnitDetails />
                </TeacherRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default TeacherApp;