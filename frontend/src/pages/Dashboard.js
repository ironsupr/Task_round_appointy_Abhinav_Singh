import React, { useState, useEffect, useCallback } from 'react';
import { HoverEffect } from '../components/ui/card-hover-effect';
import { API_ENDPOINTS, APP_CONFIG } from '../config';
import './Dashboard.css';

// Predefined search suggestions
const SUGGESTED_SEARCHES = [
  "articles about AI from last month",
  "products under $100",
  "my todos from yesterday",
  "videos about programming",
  "books I saved last week",
  "quotes about success",
  "notes from today",
  "articles from this week",
  "products I saved",
  "todos for today"
];

const contentTypes = [
  { value: 'all', label: 'All', icon: '🌐' },
  { value: 'article', label: 'Articles', icon: '📄' },
  { value: 'product', label: 'Products', icon: '🛍️' },
  { value: 'video', label: 'Videos', icon: '🎥' },
  { value: 'todo', label: 'Todos', icon: '✅' },
  { value: 'note', label: 'Notes', icon: '📝' },
  { value: 'book', label: 'Books', icon: '📚' },
  { value: 'quote', label: 'Quotes', icon: '💬' }
];

// Skeleton loading component
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-icon"></div>
        <div className="skeleton-type"></div>
      </div>
      <div className="skeleton-title"></div>
      <div className="skeleton-line"></div>
      <div className="skeleton-line short"></div>
    </div>
  );
}

function Dashboard({ onLogout }) {
  const [contents, setContents] = useState([]);
  const [filteredContents, setFilteredContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStats, setSearchStats] = useState({ count: 0, time: 0 });
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [selectedFilters, setSelectedFilters] = useState({
    type: 'all',
    timeRange: 'all',
    priceRange: { min: null, max: null }
  });
  const [sortBy, setSortBy] = useState('relevance');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showProductReminder, setShowProductReminder] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchContents();

    // Load search history from localStorage
    const history = localStorage.getItem('synapseSearchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history).slice(0, 10));
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e) {
      // Focus search on "/"
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.focus();
      }
      
      // Clear search on "Escape"
      if (e.key === 'Escape') {
        setSearchQuery('');
        setShowSuggestions(false);
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.blur();
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Update search suggestions as user types
  useEffect(() => {
    if (searchQuery.length > 0) {
      const suggestions = [];

      // Add matching history items first
      const matchingHistory = searchHistory.filter(h =>
        h.toLowerCase().includes(searchQuery.toLowerCase())
      );
      matchingHistory.forEach(h => {
        suggestions.push({ text: h, type: 'history' });
      });

      // Add matching suggested searches
      const matchingSuggested = SUGGESTED_SEARCHES.filter(s =>
        s.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !matchingHistory.includes(s)
      );
      matchingSuggested.forEach(s => {
        suggestions.push({ text: s, type: 'suggestion' });
      });

      // Add content-based suggestions
      const uniqueTitles = [...new Set(contents.map(c => c.title))]
        .filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 3);
      uniqueTitles.forEach(t => {
        if (!suggestions.find(s => s.text === t)) {
          suggestions.push({ text: t, type: 'content' });
        }
      });

      setSearchSuggestions(suggestions.slice(0, 8));
      setShowSuggestions(suggestions.length > 0);
      setSelectedSuggestionIndex(-1);
    } else if (searchQuery.length === 0 && searchHistory.length > 0) {
      // Show recent searches when input is focused but empty
      const recentSuggestions = searchHistory.slice(0, 5).map(h => ({
        text: h,
        type: 'history'
      }));
      setSearchSuggestions(recentSuggestions);
      setShowSuggestions(false); // Will be shown on focus
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

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
      setSearchStats({ count: contents.length, time: 0 });
      return;
    }

    // Save to search history
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem('synapseSearchHistory', JSON.stringify(newHistory));

    setLoading(true);
    setSearchMode(true);
    setShowSuggestions(false);

    const startTime = Date.now();

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
        const endTime = Date.now();
        
        const searchResults = results.map(r => ({
          ...r.content,
          similarity_score: r.similarity_score || 0
        }));
        
        setFilteredContents(searchResults);
        setSearchStats({
          count: searchResults.length,
          time: ((endTime - startTime) / 1000).toFixed(2)
        });
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchStats({ count: 0, time: 0 });
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

  // Apply filters and sorting
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...filteredContents];

    // Filter by content type
    if (selectedFilters.type !== 'all') {
      filtered = filtered.filter(c => c.content_type === selectedFilters.type);
    }

    // Sort
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'relevance':
          return (b.similarity_score || 0) - (a.similarity_score || 0);
        case 'date-new':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'date-old':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [filteredContents, selectedFilters, sortBy]);

  const displayedContents = applyFiltersAndSort();

  // Handle setting reminder for a product
  const handleSetProductReminder = (product) => {
    setSelectedProduct(product);
    setShowProductReminder(true);
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">
            <h1>🧠 Synapse</h1>
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
          <div className="search-wrapper">
            <div className="search-input-container">
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow clicking on suggestions
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (selectedSuggestionIndex >= 0 && showSuggestions) {
                      const suggestion = searchSuggestions[selectedSuggestionIndex];
                      setSearchQuery(suggestion.text);
                      handleSearch(suggestion.text);
                      setShowSuggestions(false);
                    } else {
                      handleSearch(searchQuery);
                    }
                  } else if (e.key === 'ArrowDown' && showSuggestions) {
                    e.preventDefault();
                    setSelectedSuggestionIndex(prev =>
                      prev < searchSuggestions.length - 1 ? prev + 1 : 0
                    );
                  } else if (e.key === 'ArrowUp' && showSuggestions) {
                    e.preventDefault();
                    setSelectedSuggestionIndex(prev =>
                      prev > 0 ? prev - 1 : searchSuggestions.length - 1
                    );
                  } else if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    setSelectedSuggestionIndex(-1);
                  }
                }}
                placeholder="Search your memories... (Press / to focus)"
                className="search-input"
              />
              <button 
                onClick={() => handleSearch(searchQuery)}
                className="search-button"
              >
                🔍 Search
              </button>
              
              {/* Search suggestions dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="search-suggestions">
                  {searchSuggestions.map((suggestion, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setSearchQuery(suggestion.text);
                        handleSearch(suggestion.text);
                        setShowSuggestions(false);
                      }}
                      onMouseEnter={() => setSelectedSuggestionIndex(i)}
                      className={`suggestion-item ${selectedSuggestionIndex === i ? 'selected' : ''}`}
                    >
                      <span className="suggestion-icon">
                        {suggestion.type === 'history' ? '🕐' :
                         suggestion.type === 'content' ? '📄' : '🔍'}
                      </span>
                      <span className="suggestion-text">{suggestion.text}</span>
                      {suggestion.type === 'history' && (
                        <button
                          className="remove-history"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newHistory = searchHistory.filter(h => h !== suggestion.text);
                            setSearchHistory(newHistory);
                            localStorage.setItem('synapseSearchHistory', JSON.stringify(newHistory));
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="search-hint">
              Try: "articles about AI", "products under $100" | 
              Press <kbd>/</kbd> to search, <kbd>Esc</kbd> to clear
            </div>
          </div>

          {/* Filter chips */}
          <div className="filter-section">
            <div className="filter-chips">
              {contentTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedFilters({...selectedFilters, type: type.value})}
                  className={`filter-chip ${selectedFilters.type === type.value ? 'active' : ''}`}
                >
                  <span className="filter-icon">{type.icon}</span>
                  <span className="filter-label">{type.label}</span>
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="sort-section">
              <label htmlFor="sort-select" className="sort-label">Sort by:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="relevance">Most Relevant</option>
                <option value="date-new">Newest First</option>
                <option value="date-old">Oldest First</option>
                <option value="title">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Search stats */}
          {searchMode && searchStats.count > 0 && (
            <div className="search-stats">
              Found <strong>{searchStats.count}</strong> result{searchStats.count !== 1 ? 's' : ''} in {searchStats.time}s
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">
            <div className="skeleton-grid">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : displayedContents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {searchMode ? '🔍' : '🧠'}
            </div>
            <h2>{searchMode ? 'No results found' : 'Your brain is empty'}</h2>
            <p className="empty-description">
              {searchMode
                ? `We couldn't find anything matching "${searchQuery}"`
                : 'Start capturing content using the browser extension!'}
            </p>
            
            {searchMode && (
              <div className="no-results-help">
                <p className="help-title">💡 Try:</p>
                <ul className="help-list">
                  <li>✓ Using different keywords</li>
                  <li>✓ Checking your spelling</li>
                  <li>✓ Using more general terms</li>
                  <li>✓ "articles from last week"</li>
                  <li>✓ "products under $100"</li>
                </ul>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    handleSearch('');
                  }}
                  className="btn-clear-search"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        ) : (
          <HoverEffect
            items={displayedContents}
            onDelete={handleDelete}
            searchQuery={searchQuery}
            onSetReminder={handleSetProductReminder}
          />
        )}
      </div>

      {/* Product Reminder Modal */}
      {showProductReminder && selectedProduct && (
        <ProductReminderModal
          product={selectedProduct}
          onClose={() => {
            setShowProductReminder(false);
            setSelectedProduct(null);
          }}
          onSave={(reminderData) => {
            console.log('Reminder set for product:', selectedProduct.id, reminderData);
            // Save reminder to localStorage or backend
            const reminders = JSON.parse(localStorage.getItem('productReminders') || '[]');
            reminders.push({
              productId: selectedProduct.id,
              productTitle: selectedProduct.title,
              currentPrice: selectedProduct.metadata?.price,
              ...reminderData,
              createdAt: new Date().toISOString()
            });
            localStorage.setItem('productReminders', JSON.stringify(reminders));

            alert(`Price alert set! We'll notify you when ${selectedProduct.title} reaches your target price.`);
            setShowProductReminder(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}

// Product Reminder Modal Component
function ProductReminderModal({ product, onClose, onSave }) {
  const [reminderType, setReminderType] = useState('price_drop');
  const [targetPrice, setTargetPrice] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [notes, setNotes] = useState('');

  const currentPrice = product.metadata?.price || 0;

  const handleSave = () => {
    if (reminderType === 'price_drop' && !targetPrice) {
      alert('Please enter a target price');
      return;
    }
    if (reminderType === 'restock' && !reminderDate) {
      alert('Please select a reminder date');
      return;
    }

    onSave({
      type: reminderType,
      targetPrice: reminderType === 'price_drop' ? parseFloat(targetPrice) : null,
      reminderDate: reminderType === 'restock' ? reminderDate : null,
      notes
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="product-reminder-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔔 Set Product Reminder</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Product Info */}
          <div className="product-info-section">
            <div className="product-reminder-header">
              {product.metadata?.image && (
                <img
                  src={product.metadata.image}
                  alt={product.title}
                  className="product-reminder-image"
                />
              )}
              <div className="product-reminder-details">
                <h3>{product.title}</h3>
                {currentPrice > 0 && (
                  <div className="current-price">
                    Current Price: <span className="price-value">${currentPrice}</span>
                  </div>
                )}
                {product.metadata?.seller && (
                  <div className="seller-info">Sold by: {product.metadata.seller}</div>
                )}
              </div>
            </div>
          </div>

          {/* Reminder Type Selection */}
          <div className="reminder-type-section">
            <label className="reminder-type-label">Reminder Type:</label>
            <div className="reminder-type-options">
              <label className="reminder-type-option">
                <input
                  type="radio"
                  name="reminderType"
                  value="price_drop"
                  checked={reminderType === 'price_drop'}
                  onChange={(e) => setReminderType(e.target.value)}
                />
                <span className="option-icon">💰</span>
                <div>
                  <div className="option-title">Price Drop Alert</div>
                  <div className="option-description">Notify when price drops to target</div>
                </div>
              </label>

              <label className="reminder-type-option">
                <input
                  type="radio"
                  name="reminderType"
                  value="restock"
                  checked={reminderType === 'restock'}
                  onChange={(e) => setReminderType(e.target.value)}
                />
                <span className="option-icon">📦</span>
                <div>
                  <div className="option-title">Restock Reminder</div>
                  <div className="option-description">Remind to check availability</div>
                </div>
              </label>

              <label className="reminder-type-option">
                <input
                  type="radio"
                  name="reminderType"
                  value="review"
                  checked={reminderType === 'review'}
                  onChange={(e) => setReminderType(e.target.value)}
                />
                <span className="option-icon">⭐</span>
                <div>
                  <div className="option-title">Review Reminder</div>
                  <div className="option-description">Remind to leave a review</div>
                </div>
              </label>
            </div>
          </div>

          {/* Dynamic Fields Based on Type */}
          {reminderType === 'price_drop' && (
            <div className="target-price-section">
              <label>
                Target Price:
                <div className="price-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="Enter target price"
                    className="price-input"
                  />
                  {currentPrice > 0 && targetPrice && (
                    <span className="price-savings">
                      Save ${(currentPrice - parseFloat(targetPrice)).toFixed(2)} ({((1 - parseFloat(targetPrice)/currentPrice) * 100).toFixed(0)}% off)
                    </span>
                  )}
                </div>
              </label>
            </div>
          )}

          {reminderType === 'restock' && (
            <div className="reminder-date-section">
              <label>
                Remind me on:
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="date-input"
                />
              </label>
            </div>
          )}

          {reminderType === 'review' && (
            <div className="review-reminder-section">
              <label>
                Remind me after:
                <select
                  className="review-period-select"
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    const date = new Date();
                    date.setDate(date.getDate() + days);
                    setReminderDate(date.toISOString().split('T')[0]);
                  }}
                >
                  <option value="7">1 week</option>
                  <option value="14">2 weeks</option>
                  <option value="30">1 month</option>
                </select>
              </label>
            </div>
          )}

          {/* Notes */}
          <div className="notes-section">
            <label>
              Notes (optional):
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this reminder..."
                className="reminder-notes"
                rows="3"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave}>
              <span>🔔</span> Set Reminder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
