import React, { useState, useEffect } from 'react';
import { HoverEffect } from '../components/ui/card-hover-effect';
import SearchBar from '../components/SearchBar';
import { API_ENDPOINTS, APP_CONFIG } from '../config';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const [contents, setContents] = useState([]);
  const [filteredContents, setFilteredContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchContents();
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const response = await fetch(API_ENDPOINTS.ME, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchContents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const response = await fetch(`${API_ENDPOINTS.CONTENT}?limit=${APP_CONFIG.DEFAULT_CONTENT_LIMIT}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContents(data);
        setFilteredContents(data);
      }
    } catch (error) {
      console.error('Error fetching contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setFilteredContents(contents);
      setSearchMode(false);
      return;
    }

    setLoading(true);
    setSearchMode(true);

    try {
      const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const response = await fetch(API_ENDPOINTS.SEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, limit: APP_CONFIG.DEFAULT_SEARCH_LIMIT })
      });

      if (response.ok) {
        const results = await response.json();
        const searchResults = results.map(r => r.content);
        setFilteredContents(searchResults);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contentId) => {
    try {
      const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const response = await fetch(API_ENDPOINTS.CONTENT_BY_ID(contentId), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setContents(contents.filter(c => c.id !== contentId));
        setFilteredContents(filteredContents.filter(c => c.id !== contentId));
      }
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <h1>Synapse</h1>
            <span className="badge">{contents.length} items</span>
          </div>
          <div className="navbar-user">
            {user && <span>Hello, {user.username}</span>}
            <button onClick={onLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </nav>

      <div className="dashboard-container">
        <div className="search-section">
          <SearchBar onSearch={handleSearch} />
          <p className="search-hint">
            Try: "articles about AI", "products under $100", "my todos from yesterday"
          </p>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading your brain...</p>
          </div>
        ) : filteredContents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧠</div>
            <h2>{searchMode ? 'No results found' : 'Your brain is empty'}</h2>
            <p>
              {searchMode
                ? 'Try a different search query'
                : 'Start capturing content using the browser extension!'}
            </p>
          </div>
        ) : (
          <HoverEffect
            items={filteredContents}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
