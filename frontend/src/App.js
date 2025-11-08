import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContentDetail from './pages/ContentDetail';
import { API_ENDPOINTS, APP_CONFIG } from './config';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
    if (token) {
      try {
        const response = await fetch(API_ENDPOINTS.ME, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const handleLogin = (token) => {
    localStorage.setItem('synapse_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('synapse_token');
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ?
            <Navigate to="/" replace /> :
            <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ?
            <Dashboard onLogout={handleLogout} /> :
            <Navigate to="/login" replace />
          }
        />
        <Route
          path="/content/:id"
          element={
            isAuthenticated ?
            <ContentDetail /> :
            <Navigate to="/login" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
