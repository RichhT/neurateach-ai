import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';

function Welcome() {
  console.log('Welcome component rendering');
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (activeTab === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      
      const result = await register(formData.name, formData.email, formData.password, 'teacher');
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } else {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    }
    
    setLoading(false);
  };

  const welcomeStyles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    },
    header: {
      padding: '40px 0',
      textAlign: 'center',
      position: 'relative'
    },
    backHome: {
      position: 'absolute',
      left: '20px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'rgba(255,255,255,0.9)',
      textDecoration: 'none',
      fontWeight: '500'
    },
    title: {
      fontSize: '3rem',
      fontWeight: '700',
      marginBottom: '10px',
      textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
    },
    subtitle: {
      fontSize: '1.2rem',
      opacity: 0.9
    },
    content: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px'
    },
    hero: {
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      gap: '60px',
      alignItems: 'center',
      minHeight: '70vh'
    },
    heroText: {
      fontSize: '2.5rem',
      marginBottom: '30px',
      fontWeight: '600'
    },
    featureList: {
      listStyle: 'none',
      padding: 0
    },
    featureItem: {
      fontSize: '1.2rem',
      marginBottom: '15px',
      padding: '10px 0',
      opacity: 0.95
    },
    authSection: {
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
    },
    authTabs: {
      display: 'flex',
      marginBottom: '30px',
      background: '#f8f9fa',
      borderRadius: '10px',
      padding: '5px'
    },
    tab: {
      flex: 1,
      padding: '12px 20px',
      border: 'none',
      background: 'transparent',
      borderRadius: '8px',
      fontWeight: '600',
      color: '#6c757d',
      cursor: 'pointer'
    },
    tabActive: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 2px 10px rgba(102, 126, 234, 0.3)'
    },
    authForm: {
      color: '#333'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#495057'
    },
    input: {
      width: '100%',
      padding: '15px',
      border: '2px solid #e9ecef',
      borderRadius: '10px',
      fontSize: '16px'
    },
    authButton: {
      width: '100%',
      padding: '15px',
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '10px',
      border: 'none',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      cursor: 'pointer',
      boxShadow: '0 5px 15px rgba(102, 126, 234, 0.4)'
    },
    error: {
      background: '#f8d7da',
      color: '#721c24',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #f5c6cb'
    }
  };

  return (
    <div style={welcomeStyles.container}>
      <div style={welcomeStyles.header}>
        <Link to="/" style={welcomeStyles.backHome}>← Back to Home</Link>
        <h1 style={welcomeStyles.title}>Teacher Portal</h1>
        <p style={welcomeStyles.subtitle}>Empower your teaching with AI-driven curriculum tools</p>
      </div>

      <div style={welcomeStyles.content}>
        <div style={welcomeStyles.hero}>
          <div>
            <h2 style={welcomeStyles.heroText}>Transform Your Classroom</h2>
            <ul style={welcomeStyles.featureList}>
              <li style={welcomeStyles.featureItem}>📚 Upload and organize curriculum materials</li>
              <li style={welcomeStyles.featureItem}>🎯 Generate AI-powered learning objectives</li>
              <li style={welcomeStyles.featureItem}>📊 Track student progress and performance</li>
              <li style={welcomeStyles.featureItem}>🧩 Create adaptive assessments</li>
              <li style={welcomeStyles.featureItem}>📈 Get detailed analytics and insights</li>
            </ul>
          </div>
          
          <div style={welcomeStyles.authSection}>
            <div style={welcomeStyles.authTabs}>
              <button 
                style={{...welcomeStyles.tab, ...(activeTab === 'login' ? welcomeStyles.tabActive : {})}}
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button 
                style={{...welcomeStyles.tab, ...(activeTab === 'register' ? welcomeStyles.tabActive : {})}}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </div>

            <div style={welcomeStyles.authForm}>
              {error && <div style={welcomeStyles.error}>{error}</div>}
              
              <form onSubmit={handleSubmit}>
                {activeTab === 'register' && (
                  <div style={welcomeStyles.formGroup}>
                    <label htmlFor="name" style={welcomeStyles.label}>Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your full name"
                      style={welcomeStyles.input}
                    />
                  </div>
                )}
                
                <div style={welcomeStyles.formGroup}>
                  <label htmlFor="email" style={welcomeStyles.label}>Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                    style={welcomeStyles.input}
                  />
                </div>
                
                <div style={welcomeStyles.formGroup}>
                  <label htmlFor="password" style={welcomeStyles.label}>Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    style={welcomeStyles.input}
                  />
                </div>
                
                {activeTab === 'register' && (
                  <div style={welcomeStyles.formGroup}>
                    <label htmlFor="confirmPassword" style={welcomeStyles.label}>Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="Confirm your password"
                      style={welcomeStyles.input}
                    />
                  </div>
                )}
                
                <button 
                  type="submit" 
                  style={welcomeStyles.authButton}
                  disabled={loading}
                >
                  {loading ? 
                    (activeTab === 'login' ? 'Logging in...' : 'Creating account...') : 
                    (activeTab === 'login' ? 'Login to Dashboard' : 'Create Teacher Account')
                  }
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Welcome;