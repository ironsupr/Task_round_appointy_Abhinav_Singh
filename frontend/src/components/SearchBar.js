import React, { useState } from 'react';
import './SearchBar.css';

function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-bar">
        <div className="search-icon">🔍</div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your second brain... (e.g., 'AI articles from last week')"
          className="search-input"
        />
        {query && (
          <button type="button" onClick={handleClear} className="clear-btn">
            ✕
          </button>
        )}
        <button type="submit" className="search-btn">
          Search
        </button>
      </form>
    </div>
  );
}

export default SearchBar;
