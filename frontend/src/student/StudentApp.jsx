import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../shared/context/AuthContext';
import Navbar from '../shared/components/Navbar';
import Login from '../shared/pages/Login';
import Register from '../shared/pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import StudyMode from './pages/StudyMode';
import QuizMode from './pages/QuizMode';

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

function StudentRoute({ children }) {
  const { user, loading } = useAuth();
  
  console.log('StudentRoute check - loading:', loading, 'user:', user);
  
  if (loading) {
    return <div className="loading" style={{ padding: '50px', textAlign: 'center', backgroundColor: 'white' }}>Loading student dashboard...</div>;
  }
  
  if (!user) {
    console.log('StudentRoute: No user, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  if (user.userType !== 'student') {
    console.log('StudentRoute: User is not student, redirecting to teacher');
    window.location.href = '/teacher.html';
    return null;
  }
  
  console.log('StudentRoute: Access granted to student dashboard');
  return children;
}

function StudentApp() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="container">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
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
                <StudentRoute>
                  <StudentDashboard />
                </StudentRoute>
              } />
              <Route path="/course/:enrollmentId/study" element={
                <StudentRoute>
                  <StudyMode />
                </StudentRoute>
              } />
              <Route path="/course/:enrollmentId/study/:objectiveId" element={
                <StudentRoute>
                  <StudyMode />
                </StudentRoute>
              } />
              <Route path="/course/:enrollmentId/quiz" element={
                <StudentRoute>
                  <QuizMode />
                </StudentRoute>
              } />
              <Route path="/course/:enrollmentId/quiz/:objectiveId" element={
                <StudentRoute>
                  <QuizMode />
                </StudentRoute>
              } />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default StudentApp;