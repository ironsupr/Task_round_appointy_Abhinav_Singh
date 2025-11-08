import { useState } from "react";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

// Helper function to highlight keywords
function highlightKeywords(text, query) {
  if (!text || !query) return text;
  
  // Extract keywords from query (remove common words)
  const stopWords = ['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'show', 'find', 'get', 'from', 'about', 'my'];
  const keywords = query.toLowerCase()
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  let highlighted = text;
  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark style="background-color: #fef08a; padding: 0 0.125rem; border-radius: 2px;">$1</mark>');
  });
  
  return highlighted;
}

export const HoverEffect = ({ items, className, onDelete, searchQuery = '', onSetReminder }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-10",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="relative group block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimateContainer
            hoveredIndex={hoveredIndex}
            idx={idx}
          >
            <Card
              item={item}
              onDelete={onDelete}
              searchQuery={searchQuery}
              onSetReminder={onSetReminder}
            />
          </AnimateContainer>
        </div>
      ))}
    </div>
  );
};

const AnimateContainer = ({ children, hoveredIndex, idx }) => {
  return (
    <div
      className={cn(
        "relative h-full w-full rounded-2xl overflow-hidden bg-white border border-transparent transition-all duration-300",
        hoveredIndex === idx && "border-slate-300 shadow-xl"
      )}
    >
      {hoveredIndex === idx && (
        <span className="absolute inset-0 h-full w-full bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10 block rounded-2xl" />
      )}
      {children}
    </div>
  );
};

const Card = ({ item, onDelete, searchQuery = '', onSetReminder }) => {
  const navigate = useNavigate();

  // Parse todo list format
  const parseTodoList = (rawText) => {
    if (!rawText) return [];
    const lines = rawText.split('\n');
    const todos = [];

    lines.forEach(line => {
      // Match checkbox format: - [ ] or - [x]
      const checkboxMatch = line.match(/^\s*[-*]\s*\[([x ])\]\s*(.+)$/i);
      if (checkboxMatch) {
        todos.push({
          completed: checkboxMatch[1].toLowerCase() === 'x',
          text: checkboxMatch[2].trim()
        });
        return;
      }

      // Match simple list format: - item or * item
      const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
      if (listMatch) {
        todos.push({
          completed: false,
          text: listMatch[1].trim()
        });
        return;
      }

      // If it's not empty and looks like a todo item
      const trimmed = line.trim();
      if (trimmed && item.content_type === 'todo') {
        todos.push({
          completed: false,
          text: trimmed
        });
      }
    });

    return todos;
  };

  const getContentTypeColor = (type) => {
    const colors = {
      article: { border: "#667eea", bg: "#667eea", light: "#f0f3ff" },
      product: { border: "#f59e0b", bg: "#f59e0b", light: "#fff8e6" },
      video: { border: "#ef4444", bg: "#ef4444", light: "#ffecec" },
      todo: { border: "#10b981", bg: "#10b981", light: "#e6fff5" },
      note: { border: "#8b5cf6", bg: "#8b5cf6", light: "#f5f0ff" },
      quote: { border: "#ec4899", bg: "#ec4899", light: "#fff0f8" },
      book: { border: "#06b6d4", bg: "#06b6d4", light: "#e6feff" },
    };
    return colors[type] || colors.article;
  };

  const getIcon = (type) => {
    const icons = {
      article: "📄",
      product: "🛍️",
      video: "🎥",
      todo: "✅",
      note: "📝",
      quote: "💬",
      book: "📚",
    };
    return icons[type] || "📄";
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

  const colors = getContentTypeColor(item.content_type);

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this item?")) {
      onDelete(item.id);
    }
  };

  return (
    <div
      className="relative z-10 h-full p-6 cursor-pointer flex flex-col"
      onClick={() => navigate(`/content/${item.id}`)}
    >
      {/* Header with icon and type badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getIcon(item.content_type)}</span>
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: colors.bg }}
          >
            {item.content_type.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {item.content_type === 'product' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetReminder(item);
              }}
              className="text-gray-400 hover:text-yellow-500 transition-colors duration-200"
              aria-label="Set Reminder"
              title="Set price alert or reminder"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 transition-colors duration-200"
            aria-label="Delete"
          >
            <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 
        className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors"
        dangerouslySetInnerHTML={{
          __html: highlightKeywords(item.title, searchQuery)
        }}
      />

      {/* Relevance Score */}
      {item.similarity_score !== undefined && item.similarity_score > 0 && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <div className="text-xs text-gray-500">Relevance:</div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <span 
                key={i} 
                className={i < Math.round(item.similarity_score * 5) ? 'text-yellow-400' : 'text-gray-300'}
                style={{ fontSize: '0.875rem' }}
              >
                ⭐
              </span>
            ))}
            <span className="text-xs text-gray-600 ml-1">
              ({(item.similarity_score * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      {/* Book Display with Cover */}
      {item.content_type === "book" ? (
        <div className="flex gap-4 mb-4">
          {item.metadata?.cover && (
            <div className="flex-shrink-0">
              <img
                src={item.metadata.cover}
                alt={item.title}
                className="w-20 h-28 object-cover rounded shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex-1 flex flex-col">
            {item.metadata?.author && (
              <p className="text-sm text-gray-500 mb-1">
                by <span className="font-medium text-gray-700">{item.metadata.author}</span>
              </p>
            )}
            <p 
              className="text-gray-600 text-sm line-clamp-3 flex-grow"
              dangerouslySetInnerHTML={{
                __html: highlightKeywords(item.raw_data, searchQuery)
              }}
            />
            {item.metadata?.rating && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-yellow-500">★</span>
                <span className="text-sm font-medium">{item.metadata.rating}/5</span>
              </div>
            )}
          </div>
        </div>
      ) : item.content_type === "video" && item.source_url && getYouTubeVideoId(item.source_url) ? (
        <div className="mb-4" onClick={(e) => e.stopPropagation()}>
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src={`https://www.youtube.com/embed/${getYouTubeVideoId(item.source_url)}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={item.title}
            ></iframe>
          </div>
        </div>
      ) : item.content_type === "todo" ? (
        <div className="todo-list mb-4">
          {parseTodoList(item.raw_data).map((todo, index) => (
            <div key={index} className="flex items-start gap-2 mb-2">
              <div
                className={cn(
                  "w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0",
                  todo.completed
                    ? "bg-green-500 border-green-500"
                    : "border-gray-300"
                )}
              >
                {todo.completed && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <span
                className={cn(
                  "text-sm",
                  todo.completed ? "line-through text-gray-400" : "text-gray-700"
                )}
                dangerouslySetInnerHTML={{
                  __html: highlightKeywords(todo.text, searchQuery)
                }}
              />
            </div>
          ))}
          {parseTodoList(item.raw_data).length === 0 && (
            <p
              className="text-gray-600 text-sm"
              dangerouslySetInnerHTML={{
                __html: highlightKeywords(item.raw_data, searchQuery)
              }}
            />
          )}
        </div>
      ) : item.content_type === "quote" ? (
        <div className="quote-container mb-4 relative">
          <div
            className="quote-card p-6 rounded-lg relative"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            <div className="absolute text-6xl text-white opacity-20 -top-2 left-2">"</div>
            <blockquote className="relative z-10">
              <p className="text-white text-lg italic font-light leading-relaxed mb-4">
                {item.raw_data}
              </p>
              {item.metadata?.author && (
                <footer className="text-white text-sm font-semibold text-right">
                  — {item.metadata.author}
                </footer>
              )}
            </blockquote>
            <div className="absolute text-6xl text-white opacity-20 -bottom-8 right-2 rotate-180">"</div>
          </div>
        </div>
      ) : item.content_type === "product" ? (
        <div className="flex gap-4 mb-4">
          {item.metadata?.image && (
            <div className="flex-shrink-0">
              <img
                src={item.metadata.image}
                alt={item.title}
                className="w-24 h-24 object-cover rounded-lg shadow-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="flex-1 flex flex-col">
            <p
              className="text-gray-600 text-sm line-clamp-3 flex-grow"
              dangerouslySetInnerHTML={{
                __html: highlightKeywords(item.raw_data, searchQuery)
              }}
            />
            {item.metadata?.seller && (
              <p className="text-xs text-gray-500 mt-2">
                Sold by <span className="font-medium">{item.metadata.seller}</span>
              </p>
            )}
            {item.metadata?.rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm font-medium">{item.metadata.rating}</span>
                {item.metadata?.reviews && (
                  <span className="text-xs text-gray-500">({item.metadata.reviews} reviews)</span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p
          className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow"
          dangerouslySetInnerHTML={{
            __html: highlightKeywords(item.raw_data, searchQuery)
          }}
        />
      )}

      {/* Metadata based on content type */}
      {item.content_type === "product" && item.metadata?.price && (
        <div className="mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-gray-900">
              ${item.metadata.price}
            </span>
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 text-sm font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                View Product →
              </a>
            )}
          </div>
        </div>
      )}

      {item.content_type === "video" && item.metadata?.duration && (
        <div className="mt-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{item.metadata.duration}</span>
          </div>
        </div>
      )}

      {item.content_type === "todo" && item.metadata?.completed !== undefined && (
        <div className="mt-auto">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center",
                item.metadata.completed
                  ? "bg-green-500 border-green-500"
                  : "border-gray-300"
              )}
            >
              {item.metadata.completed && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                item.metadata.completed ? "text-green-600" : "text-gray-500"
              )}
            >
              {item.metadata.completed ? "Completed" : "Pending"}
            </span>
          </div>
        </div>
      )}

      {/* Source URL for other types */}
      {item.source_url &&
        !["product", "video", "todo"].includes(item.content_type) && (
          <div className="mt-auto pt-4">
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:text-primary-600 text-xs font-medium flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View Source</span>
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}

      {/* Timestamp */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {new Date(item.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
};
