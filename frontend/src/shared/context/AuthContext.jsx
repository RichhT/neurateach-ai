import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'LOGOUT':
      return { ...state, user: null, token: null, loading: false };
    default:
      return state;
  }
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: localStorage.getItem('token'),
    loading: true
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('AuthContext: Checking token', token ? 'found' : 'not found');
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      dispatch({ type: 'SET_TOKEN', payload: token });
      
      console.log('AuthContext: Verifying token with server');
      axios.get('/api/auth/me')
        .then(response => {
          const user = response.data;
          console.log('AuthContext: User verified', user);
          dispatch({ type: 'SET_USER', payload: user });
          
          // Check if user is on the wrong app and redirect
          const currentPath = window.location.pathname;
          const currentHost = window.location.origin;
          console.log('AuthContext: Current path', currentPath, 'User type', user.userType);
          
          if (user.userType === 'student' && currentPath.includes('teacher')) {
            console.log('AuthContext: Redirecting student to student dashboard');
            window.location.href = `${currentHost}/student/dashboard`;
          } else if (user.userType === 'teacher' && currentPath.includes('student')) {
            console.log('AuthContext: Redirecting teacher to teacher dashboard');
            window.location.href = `${currentHost}/teacher/dashboard`;
          }
        })
        .catch(error => {
          console.log('AuthContext: Token verification failed', error);
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          dispatch({ type: 'LOGOUT' });
        });
    } else {
      console.log('AuthContext: No token found, setting loading to false');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (email, password) => {
    try {
      console.log('AuthContext: Attempting login for', email);
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      console.log('AuthContext: Login successful', user);
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({ type: 'SET_TOKEN', payload: token });
      dispatch({ type: 'SET_USER', payload: user });
      
      // Redirect to appropriate app based on user type
      if (user.userType === 'student') {
        console.log('AuthContext: Redirecting to student dashboard');
        setTimeout(() => {
          window.location.href = `${window.location.origin}/student/dashboard`;
        }, 100);
      } else if (user.userType === 'teacher') {
        console.log('AuthContext: Redirecting to teacher dashboard');
        setTimeout(() => {
          window.location.href = `${window.location.origin}/teacher/dashboard`;
        }, 100);
      }
      
      return { success: true };
    } catch (error) {
      console.log('AuthContext: Login failed', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (name, email, password, userType = 'teacher') => {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password, userType });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      dispatch({ type: 'SET_TOKEN', payload: token });
      dispatch({ type: 'SET_USER', payload: user });
      
      // Redirect to appropriate app based on user type
      if (user.userType === 'student') {
        window.location.href = `${window.location.origin}/student/dashboard`;
      } else if (user.userType === 'teacher') {
        window.location.href = `${window.location.origin}/teacher/dashboard`;
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{
      user: state.user,
      token: state.token,
      loading: state.loading,
      login,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};