import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';
import axios from 'axios';

function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-courses');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [enrollmentsRes, unitsRes] = await Promise.all([
        axios.get('/api/enrollments/my-enrollments'),
        axios.get('/api/enrollments/available-units')
      ]);
      // console.log('Enrollments data:', enrollmentsRes.data);
      // console.log('Available units data:', unitsRes.data);
      setEnrollments(enrollmentsRes.data);
      setAvailableUnits(unitsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (unitId) => {
    try {
      await axios.post('/api/enrollments', { unitId });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to enroll:', error);
      alert('Failed to enroll in unit');
    }
  };

  const getLevelColor = (level) => {
    if (level >= 8) return '#gold';
    if (level >= 5) return '#silver';
    return '#bronze';
  };

  const getMasteryColor = (mastery) => {
    if (mastery >= 80) return '#28a745';
    if (mastery >= 60) return '#ffc107';
    return '#dc3545';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <div>Loading your learning dashboard...</div>
      </div>
    );
  }

  console.log('Student Dashboard rendering');
  console.log('Enrollments:', enrollments.length);
  console.log('Available units:', availableUnits.length);

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>Welcome back, {user?.name}! 🎓</h1>
            <p style={{ color: '#666', margin: 0 }}>Ready to continue your learning journey?</p>
          </div>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ borderBottom: '1px solid #dee2e6', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setActiveTab('my-courses')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'my-courses' ? '2px solid #007bff' : '2px solid transparent',
                color: activeTab === 'my-courses' ? '#007bff' : '#666',
                cursor: 'pointer'
              }}
            >
              My Courses ({enrollments.length})
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'browse' ? '2px solid #007bff' : '2px solid transparent',
                color: activeTab === 'browse' ? '#007bff' : '#666',
                cursor: 'pointer'
              }}
            >
              Browse Courses
            </button>
          </div>
        </div>

        {/* My Courses Tab */}
        {activeTab === 'my-courses' && (
          <div>
            {enrollments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <h3>No courses enrolled yet</h3>
                <p style={{ color: '#666', marginBottom: '2rem' }}>
                  Start your learning journey by enrolling in a course!
                </p>
                <button 
                  onClick={() => setActiveTab('browse')}
                  className="btn btn-primary"
                >
                  Browse Available Courses
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {enrollments.map(enrollment => (
                  <div key={enrollment.enrollment_id} className="card" style={{ border: '1px solid #dee2e6' }}>
                    <div style={{ padding: '1.5rem' }}>
                      <h3 style={{ marginBottom: '0.5rem' }}>{enrollment.unit_name}</h3>
                      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        by {enrollment.teacher_name}
                      </p>
                      
                      {/* Dual Score Display */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold', 
                            color: getLevelColor(enrollment.current_level) 
                          }}>
                            🔥 Level {enrollment.current_level}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            {enrollment.total_xp || 0} XP
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold', 
                            color: getMasteryColor(enrollment.avg_mastery) 
                          }}>
                            🧠 {enrollment.avg_mastery}%
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            Mastery
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          fontSize: '0.8rem', 
                          marginBottom: '0.25rem' 
                        }}>
                          <span>Progress</span>
                          <span>{enrollment.total_objectives} objectives</span>
                        </div>
                        <div style={{ 
                          height: '8px', 
                          backgroundColor: '#e9ecef', 
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            height: '100%', 
                            backgroundColor: '#28a745', 
                            width: `${(enrollment.completion_percentage || 0)}%`,
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ flex: 1 }}
                          onClick={() => navigate(`/course/${enrollment.enrollment_id}/study`)}
                        >
                          📚 Study
                        </button>
                        <button 
                          className="btn btn-outline-primary" 
                          style={{ flex: 1 }}
                          onClick={() => navigate(`/course/${enrollment.enrollment_id}/quiz`)}
                        >
                          🎯 Quiz
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Browse Courses Tab */}
        {activeTab === 'browse' && (
          <div>
            <h3>Available Courses</h3>
            {availableUnits.filter(unit => !unit.is_enrolled).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: '#666' }}>
                  No new courses available. You're enrolled in all available courses!
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {availableUnits.filter(unit => !unit.is_enrolled).map(unit => (
                  <div key={unit.id} className="card" style={{ border: '1px solid #dee2e6' }}>
                    <div style={{ padding: '1.5rem' }}>
                      <h4 style={{ marginBottom: '0.5rem' }}>{unit.name}</h4>
                      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        by {unit.teacher_name}
                      </p>
                      <p style={{ 
                        fontSize: '0.9rem', 
                        marginBottom: '1rem', 
                        color: '#333' 
                      }}>
                        {unit.description || 'No description available'}
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '1rem',
                        fontSize: '0.8rem',
                        color: '#666'
                      }}>
                        <span>📝 {unit.objectives_count} objectives</span>
                        <span>📅 {new Date(unit.created_at).toLocaleDateString()}</span>
                      </div>
                      <button 
                        onClick={() => handleEnroll(unit.id)}
                        className="btn btn-success"
                        style={{ width: '100%' }}
                      >
                        Enroll Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;