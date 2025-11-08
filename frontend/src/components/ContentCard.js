import React from 'react';
import './ContentCard.css';

function ContentCard({ content, onDelete }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTypeIcon = (type) => {
    const icons = {
      article: '📄',
      product: '🛍️',
      video: '🎬',
      todo: '✅',
      note: '📝',
      quote: '💬',
      book: '📚'
    };
    return icons[type] || '📌';
  };

  const getTypeColor = (type) => {
    const colors = {
      article: '#3b82f6',
      product: '#10b981',
      video: '#ef4444',
      todo: '#f59e0b',
      note: '#8b5cf6',
      quote: '#ec4899',
      book: '#14b8a6'
    };
    return colors[type] || '#6b7280';
  };

  const renderContent = () => {
    switch (content.content_type) {
      case 'video':
        if (content.metadata?.embedUrl) {
          return (
            <div className="video-embed">
              <iframe
                src={content.metadata.embedUrl}
                title={content.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          );
        }
        break;

      case 'product':
        return (
          <div className="product-content">
            {content.metadata?.price && (
              <div className="price-tag">${content.metadata.price}</div>
            )}
          </div>
        );

      case 'todo':
        return (
          <div className="todo-content">
            <pre>{content.raw_data}</pre>
          </div>
        );

      case 'quote':
        return (
          <div className="quote-content">
            <blockquote>"{content.raw_data}"</blockquote>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="content-card" style={{ borderLeftColor: getTypeColor(content.content_type) }}>
      <div className="card-header">
        <span className="type-badge" style={{ background: getTypeColor(content.content_type) }}>
          {getTypeIcon(content.content_type)} {content.content_type}
        </span>
        <button onClick={() => onDelete(content.id)} className="delete-btn" title="Delete">
          🗑️
        </button>
      </div>

      <h3 className="card-title">{content.title}</h3>

      {renderContent()}

      <div className="card-preview">
        {content.raw_data.substring(0, 200)}
        {content.raw_data.length > 200 && '...'}
      </div>

      <div className="card-footer">
        <div className="card-date">
          📅 {formatDate(content.created_at)}
        </div>
        {content.source_url && (
          <a
            href={content.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-link"
            title="Open source"
          >
            🔗 Source
          </a>
        )}
      </div>

      {content.metadata?.domain && (
        <div className="card-domain">
          {content.metadata.domain}
        </div>
      )}
    </div>
  );
}

export default ContentCard;
