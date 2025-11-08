import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config';
import './Login.css';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isRegister
        ? API_ENDPOINTS.REGISTER
        : API_ENDPOINTS.LOGIN;

      const body = isRegister
        ? { email: formData.email, username: formData.username, password: formData.password }
        : { username: formData.username, password: formData.password };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data.access_token);
      } else {
        setError(data.detail || 'Authentication failed');
      }
    } catch (error) {
      setError('Connection error. Please make sure the backend is running on http://localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      <div className="login-card">
        <div className="login-header">
          <h1>Synapse</h1>
          <p>Your Second Brain</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>
          )}

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>

        <div className="toggle-auth">
          {isRegister ? (
            <p>Already have an account? <span onClick={() => setIsRegister(false)}>Login</span></p>
          ) : (
            <p>Don't have an account? <span onClick={() => setIsRegister(true)}>Register</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
