import React from 'react';
import { useAuth } from '../context/AuthContext';

function StudentDashboard() {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Student Dashboard</h1>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <h2>Welcome, {user?.name}!</h2>
          <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
            You are logged in as a <strong>Student</strong>
          </p>
          
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6', 
            borderRadius: '8px', 
            padding: '2rem', 
            marginBottom: '2rem' 
          }}>
            <h3 style={{ color: '#6c757d', marginBottom: '1rem' }}>Coming Soon!</h3>
            <p style={{ color: '#6c757d', lineHeight: '1.6' }}>
              Student features are currently under development. Soon you'll be able to:
            </p>
            <ul style={{ 
              textAlign: 'left', 
              color: '#6c757d', 
              maxWidth: '400px', 
              margin: '1rem auto',
              lineHeight: '1.8'
            }}>
              <li>View assigned learning units</li>
              <li>Track your progress</li>
              <li>Complete assignments</li>
              <li>View your grades and feedback</li>
              <li>Access course materials</li>
            </ul>
          </div>

          <p style={{ color: '#6c757d' }}>
            If you are a teacher and created this account by mistake, please contact your administrator 
            or create a new teacher account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;