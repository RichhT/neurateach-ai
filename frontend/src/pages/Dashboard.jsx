import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await axios.get('/api/units');
      setUnits(response.data);
    } catch (error) {
      setError('Failed to fetch units');
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUnit = async (unitId) => {
    if (!window.confirm('Are you sure you want to delete this unit?')) {
      return;
    }

    try {
      await axios.delete(`/api/units/${unitId}`);
      setUnits(units.filter(unit => unit.id !== unitId));
    } catch (error) {
      setError('Failed to delete unit');
      console.error('Error deleting unit:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading your units...</div>;
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1>Your Learning Units</h1>
        <Link to="/upload" className="btn btn-primary">
          Upload New Curriculum
        </Link>
      </div>

      {error && <div className="error">{error}</div>}

      {units.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No units yet</h3>
          <p>Upload your first curriculum document to get started!</p>
          <Link to="/upload" className="btn btn-primary">
            Upload Curriculum
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {units.map(unit => (
            <div key={unit.id} className="card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <h3>{unit.name}</h3>
                  {unit.description && (
                    <p style={{ color: '#666', margin: '0.5rem 0' }}>
                      {unit.description}
                    </p>
                  )}
                  <p style={{ color: '#888', fontSize: '0.9rem' }}>
                    {unit.objectives.length} learning objectives
                  </p>
                </div>
                <div>
                  <Link 
                    to={`/units/${unit.id}`} 
                    className="btn btn-primary"
                    style={{ marginRight: '0.5rem' }}
                  >
                    View Details
                  </Link>
                  <button 
                    onClick={() => deleteUnit(unit.id)}
                    className="btn btn-secondary"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {unit.objectives.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Recent Objectives:
                  </h4>
                  <ul style={{ paddingLeft: '1.5rem' }}>
                    {unit.objectives.slice(0, 3).map(objective => (
                      <li key={objective.id} style={{ marginBottom: '0.25rem' }}>
                        {objective.objective_text}
                      </li>
                    ))}
                    {unit.objectives.length > 3 && (
                      <li style={{ color: '#666', fontStyle: 'italic' }}>
                        ... and {unit.objectives.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;