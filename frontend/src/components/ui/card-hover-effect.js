import { useState } from "react";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

export const HoverEffect = ({ items, className, onDelete }) => {
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
            <Card item={item} onDelete={onDelete} />
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

const Card = ({ item, onDelete }) => {
  const navigate = useNavigate();

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

      {/* Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
        {item.title}
      </h3>

      {/* Content Preview */}
      <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-grow">
        {item.raw_data}
      </p>

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
