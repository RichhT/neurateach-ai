import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      background: '#fff',
      padding: '1rem 0',
      borderBottom: '1px solid #ddd',
      marginBottom: '2rem'
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to="/" style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#007bff',
          textDecoration: 'none'
        }}>
          Neurateach
        </Link>
        
        <div>
          {user ? (
            <>
              <Link to="/dashboard" style={{ marginRight: '1rem', textDecoration: 'none' }}>
                Dashboard
              </Link>
              {user.userType === 'teacher' && (
                <Link to="/upload" style={{ marginRight: '1rem', textDecoration: 'none' }}>
                  Upload
                </Link>
              )}
              <span style={{ marginRight: '1rem' }}>
                Hello, {user.name} {user.userType === 'student' && '(Student)'}
              </span>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ marginRight: '1rem', textDecoration: 'none' }}>
                Login
              </Link>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;