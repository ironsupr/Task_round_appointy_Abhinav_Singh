import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS, APP_CONFIG } from '../config';
import './ContentDetail.css';

function ContentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const response = await fetch(API_ENDPOINTS.CONTENT_BY_ID(id), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data);
        setEditedContent(data.raw_data);
      } else if (response.status === 404) {
        setError('Content not found');
      } else {
        setError('Failed to load content');
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const response = await fetch(API_ENDPOINTS.CONTENT_BY_ID(id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      setError('Failed to delete content');
    }
  };

  const getContentTypeColor = (type) => {
    const colors = {
      article: '#667eea',
      product: '#f59e0b',
      video: '#ef4444',
      todo: '#10b981',
      note: '#8b5cf6',
      quote: '#ec4899',
      book: '#06b6d4',
    };
    return colors[type] || '#667eea';
  };

  const getIcon = (type) => {
    const icons = {
      article: '📄',
      product: '🛍️',
      video: '🎥',
      todo: '✅',
      note: '📝',
      quote: '💬',
      book: '📚',
    };
    return icons[type] || '📄';
  };

  // Parse todo list format
  const parseTodoList = (rawText) => {
    if (!rawText) return [];
    const lines = rawText.split('\n');
    const todos = [];

    lines.forEach(line => {
      // Match checkbox format: - [ ] or - [x]
      const checkboxMatch = line.match(/^[\s]*[-*]?\s*\[([x ])\]\s*(.+)$/i);
      if (checkboxMatch) {
        todos.push({
          completed: checkboxMatch[1].toLowerCase() === 'x',
          text: checkboxMatch[2].trim()
        });
        return;
      }

      // Match simple list format: - item or * item
      const listMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
      if (listMatch) {
        todos.push({
          completed: false,
          text: listMatch[1].trim()
        });
        return;
      }

      // If it's not empty and looks like a todo item
      const trimmed = line.trim();
      if (trimmed && content?.content_type === 'todo') {
        todos.push({
          completed: false,
          text: trimmed
        });
      }
    });

    return todos;
  };

  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtu\.be\/([^?]+)/,
      /youtube\.com\/embed\/([^?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const renderContent = () => {
    if (!content) return null;

    switch (content.content_type) {
      case 'todo':
        const todos = parseTodoList(content.raw_data);
        return (
          <div className="todo-content">
            <h2 className="section-title">📋 Todo Items</h2>
            <div className="todo-list-detail">
              {todos.map((todo, index) => (
                <div key={index} className="todo-item-detail">
                  <div className={`todo-checkbox ${todo.completed ? 'completed' : ''}`}>
                    {todo.completed && (
                      <svg className="checkmark" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                    {todo.text}
                  </span>
                </div>
              ))}
              {todos.length === 0 && (
                <p className="empty-todos">No todo items found</p>
              )}
            </div>
            {/* Show completion stats */}
            {todos.length > 0 && (
              <div className="todo-stats">
                <div className="stat-item">
                  <span className="stat-label">Completed:</span>
                  <span className="stat-value completed">{todos.filter(t => t.completed).length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pending:</span>
                  <span className="stat-value pending">{todos.filter(t => !t.completed).length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Progress:</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(todos.filter(t => t.completed).length / todos.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'quote':
        return (
          <div className="quote-content-detail">
            <div className="quote-card-detail">
              <div className="quote-mark-top">"</div>
              <blockquote className="quote-text-detail">
                {content.raw_data}
              </blockquote>
              {content.metadata?.author && (
                <footer className="quote-author-detail">
                  — {content.metadata.author}
                </footer>
              )}
              <div className="quote-mark-bottom">"</div>
            </div>
          </div>
        );

      case 'product':
        return (
          <div className="product-content-detail">
            {content.metadata?.image && (
              <div className="product-image-container">
                <img
                  src={content.metadata.image}
                  alt={content.title}
                  className="product-image-detail"
                />
              </div>
            )}
            <div className="product-info-detail">
              {content.metadata?.price && (
                <div className="product-price-detail">
                  <span className="price-label">Price:</span>
                  <span className="price-value-large">${content.metadata.price}</span>
                </div>
              )}
              {content.metadata?.rating && (
                <div className="product-rating-detail">
                  <span className="rating-stars">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < Math.round(content.metadata.rating) ? 'star filled' : 'star'}>
                        ★
                      </span>
                    ))}
                  </span>
                  <span className="rating-value">{content.metadata.rating}</span>
                  {content.metadata?.reviews && (
                    <span className="reviews-count">({content.metadata.reviews} reviews)</span>
                  )}
                </div>
              )}
              {content.metadata?.seller && (
                <div className="product-seller">
                  <strong>Sold by:</strong> {content.metadata.seller}
                </div>
              )}
              <div className="product-description">
                <h3>Product Description</h3>
                <div className="formatted-text">
                  {content.raw_data.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
              {content.source_url && (
                <a
                  href={content.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-product-button"
                >
                  View on Original Site →
                </a>
              )}
            </div>
          </div>
        );

      case 'book':
        return (
          <div className="book-content-detail">
            <div className="book-header">
              {content.metadata?.cover && (
                <img
                  src={content.metadata.cover}
                  alt={content.title}
                  className="book-cover-detail"
                />
              )}
              <div className="book-info">
                <h1 className="book-title-large">{content.title}</h1>
                {content.metadata?.author && (
                  <p className="book-author-large">by {content.metadata.author}</p>
                )}
                {content.metadata?.rating && (
                  <div className="book-rating">
                    <span className="rating-stars">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.round(content.metadata.rating) ? 'star filled' : 'star'}>
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="rating-text">{content.metadata.rating}/5</span>
                  </div>
                )}
                {content.metadata?.isbn && (
                  <p className="book-isbn">ISBN: {content.metadata.isbn}</p>
                )}
                {content.metadata?.publisher && (
                  <p className="book-publisher">Publisher: {content.metadata.publisher}</p>
                )}
                {content.metadata?.publishedDate && (
                  <p className="book-date">Published: {content.metadata.publishedDate}</p>
                )}
                {content.metadata?.pageCount && (
                  <p className="book-pages">{content.metadata.pageCount} pages</p>
                )}
              </div>
            </div>
            <div className="book-description">
              <h3>About this book</h3>
              <div className="formatted-text">
                {content.raw_data.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
            {content.metadata?.categories && content.metadata.categories.length > 0 && (
              <div className="book-categories">
                <h4>Categories</h4>
                <div className="category-tags">
                  {content.metadata.categories.map((cat, idx) => (
                    <span key={idx} className="category-tag">{cat}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'video':
        const videoId = getYouTubeVideoId(content.source_url);
        return (
          <div className="video-content-detail">
            {videoId ? (
              <div className="video-embed-container">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={content.title}
                ></iframe>
              </div>
            ) : content.source_url ? (
              <video controls className="video-player">
                <source src={content.source_url} />
                Your browser does not support the video tag.
              </video>
            ) : null}

            <div className="video-info">
              {content.metadata?.duration && (
                <div className="video-duration">
                  <span className="duration-icon">⏱️</span>
                  Duration: {content.metadata.duration}
                </div>
              )}
              <div className="video-description">
                <h3>Video Description</h3>
                <div className="formatted-text">
                  {content.raw_data.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'note':
        return (
          <div className="note-content-detail">
            <div className="note-paper">
              <div className="note-header">
                <span className="note-icon">📝</span>
                <span className="note-date">
                  {new Date(content.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="note-body">
                <div className="formatted-text note-text">
                  {content.raw_data.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default: // article and others
        return (
          <div className="article-content-detail">
            <article className="article-body">
              <div className="formatted-text">
                {content.raw_data.split('\n').map((paragraph, idx) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;

                  // Check for headers (lines that are all caps or start with #)
                  if (trimmed.match(/^#{1,6}\s/)) {
                    const level = trimmed.match(/^(#{1,6})/)[1].length;
                    const text = trimmed.replace(/^#{1,6}\s/, '');
                    return React.createElement(`h${Math.min(level + 1, 6)}`, { key: idx }, text);
                  }

                  // Check for bullet points
                  if (trimmed.match(/^[-*•]\s/)) {
                    return (
                      <li key={idx} className="article-list-item">
                        {trimmed.replace(/^[-*•]\s/, '')}
                      </li>
                    );
                  }

                  // Regular paragraph
                  return <p key={idx}>{paragraph}</p>;
                })}
              </div>
            </article>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="content-detail">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="content-detail">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>{error || 'Content not found'}</h2>
          <p>The content you're looking for doesn't exist or has been deleted.</p>
          <button onClick={() => navigate('/')} className="btn-back">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const contentColor = getContentTypeColor(content.content_type);

  return (
    <div className="content-detail">
      <div className="detail-header">
        <button onClick={() => navigate('/')} className="btn-back-simple">
          ← Back to Dashboard
        </button>
        <div className="header-actions">
          <button onClick={handleDelete} className="btn-delete-simple">
            🗑️ Delete
          </button>
        </div>
      </div>

      <div className="detail-container">
        {/* Content Type Badge */}
        <div className="detail-badge" style={{ backgroundColor: contentColor }}>
          <span className="detail-icon">{getIcon(content.content_type)}</span>
          <span>{content.content_type.toUpperCase()}</span>
        </div>

        {/* Title (except for books which have their own title display) */}
        {content.content_type !== 'book' && (
          <h1 className="detail-title">{content.title}</h1>
        )}

        {/* Meta Information */}
        <div className="detail-meta">
          <span className="meta-item">
            📅 Created {new Date(content.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {content.metadata?.source === 'image_ocr' && (
            <span className="meta-item">
              📷 Extracted from image
            </span>
          )}
          {content.metadata?.word_count && (
            <span className="meta-item">
              📝 {content.metadata.word_count} words
            </span>
          )}
        </div>

        {/* Source URL (if not product or video, as they have custom displays) */}
        {content.source_url && !['product', 'video'].includes(content.content_type) && (
          <div className="detail-source">
            <strong>🔗 Source:</strong>{' '}
            <a href={content.source_url} target="_blank" rel="noopener noreferrer">
              {new URL(content.source_url).hostname}
            </a>
          </div>
        )}

        {/* Main Content Area */}
        <div className="detail-content">
          {renderContent()}
        </div>

        {/* Additional Metadata */}
        {content.metadata && Object.keys(content.metadata).length > 0 && (
          <div className="detail-metadata">
            <h3>📊 Additional Information</h3>
            <div className="metadata-grid">
              {Object.entries(content.metadata)
                .filter(([key]) => !['price', 'duration', 'completed', 'image', 'cover', 'author',
                                   'rating', 'reviews', 'seller', 'isbn', 'publisher',
                                   'publishedDate', 'pageCount', 'categories', 'source',
                                   'word_count', 'line_count', 'original_filename'].includes(key))
                .map(([key, value]) => (
                  <div key={key} className="metadata-item">
                    <strong>{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:</strong>
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentDetail;