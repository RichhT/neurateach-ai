import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../shared/context/AuthContext';
import Navbar from '../shared/components/Navbar';
import Welcome from './pages/Welcome';
import StudentDashboard from './pages/StudentDashboard';
import StudyMode from './pages/StudyMode';
import QuizMode from './pages/QuizMode';

function StudentRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading" style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/" />;
  }
  
  if (user.userType !== 'student') {
    window.location.href = '/teacher';
    return null;
  }
  
  return children;
}

function WelcomeRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading" style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;
  }
  
  if (user && user.userType === 'student') {
    return <Navigate to="/dashboard" />;
  }
  
  if (user && user.userType !== 'student') {
    window.location.href = '/teacher';
    return null;
  }
  
  return children;
}

function StudentApp() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={
              <WelcomeRoute>
                <Welcome />
              </WelcomeRoute>
            } />
            <Route path="/dashboard" element={
              <StudentRoute>
                <>
                  <Navbar />
                  <main className="container">
                    <StudentDashboard />
                  </main>
                </>
              </StudentRoute>
            } />
            <Route path="/course/:enrollmentId/study" element={
              <StudentRoute>
                <>
                  <Navbar />
                  <main className="container">
                    <StudyMode />
                  </main>
                </>
              </StudentRoute>
            } />
            <Route path="/course/:enrollmentId/study/:objectiveId" element={
              <StudentRoute>
                <>
                  <Navbar />
                  <main className="container">
                    <StudyMode />
                  </main>
                </>
              </StudentRoute>
            } />
            <Route path="/course/:enrollmentId/quiz" element={
              <StudentRoute>
                <>
                  <Navbar />
                  <main className="container">
                    <QuizMode />
                  </main>
                </>
              </StudentRoute>
            } />
            <Route path="/course/:enrollmentId/quiz/:objectiveId" element={
              <StudentRoute>
                <>
                  <Navbar />
                  <main className="container">
                    <QuizMode />
                  </main>
                </>
              </StudentRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default StudentApp;