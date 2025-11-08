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
          ← Back
        </button>
        <button onClick={handleDelete} className="btn-delete-simple">
          Delete
        </button>
      </div>

      <div className="detail-container">
        <div className="detail-badge" style={{ backgroundColor: contentColor }}>
          <span className="detail-icon">{getIcon(content.content_type)}</span>
          <span>{content.content_type.toUpperCase()}</span>
        </div>

        <h1 className="detail-title">{content.title}</h1>

        <div className="detail-meta">
          <span className="meta-item">
            📅 {new Date(content.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {content.source_url && (
          <div className="detail-source">
            <strong>Source:</strong>{' '}
            <a href={content.source_url} target="_blank" rel="noopener noreferrer">
              {content.source_url}
            </a>
          </div>
        )}

        <div className="detail-content">
          {content.content_type === 'video' && content.source_url && (
            <div className="video-container">
              {content.source_url.includes('youtube.com') || content.source_url.includes('youtu.be') ? (
                <iframe
                  src={getYouTubeEmbedUrl(content.source_url)}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={content.title}
                ></iframe>
              ) : (
                <video controls src={content.source_url}>
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}

          <div className="detail-text">
            {content.raw_data.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {content.metadata && Object.keys(content.metadata).length > 0 && (
          <div className="detail-metadata">
            <h3>Additional Information</h3>
            <div className="metadata-grid">
              {content.content_type === 'product' && content.metadata.price && (
                <div className="metadata-item">
                  <strong>Price:</strong>
                  <span className="price-badge">${content.metadata.price}</span>
                </div>
              )}

              {content.content_type === 'video' && content.metadata.duration && (
                <div className="metadata-item">
                  <strong>Duration:</strong>
                  <span>{content.metadata.duration}</span>
                </div>
              )}

              {content.content_type === 'todo' && content.metadata.completed !== undefined && (
                <div className="metadata-item">
                  <strong>Status:</strong>
                  <span className={content.metadata.completed ? 'status-completed' : 'status-pending'}>
                    {content.metadata.completed ? '✅ Completed' : '⏳ Pending'}
                  </span>
                </div>
              )}

              {Object.entries(content.metadata).map(([key, value]) => {
                if (['price', 'duration', 'completed'].includes(key)) return null;
                return (
                  <div key={key} className="metadata-item">
                    <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                    <span>{String(value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getYouTubeEmbedUrl(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

export default ContentDetail;
