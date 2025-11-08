// API Configuration
// This file centralizes all API configuration

// Use environment variable if available, otherwise use localhost for development
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Export for easy access throughout the app
export const API_ENDPOINTS = {
    // Auth endpoints
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    ME: `${API_BASE_URL}/api/auth/me`,

    // Content endpoints
    CONTENT: `${API_BASE_URL}/api/content`,
    CONTENT_BY_ID: (id) => `${API_BASE_URL}/api/content/${id}`,

    // Search endpoint
    SEARCH: `${API_BASE_URL}/api/search`,
};

// You can also add other configuration here
export const APP_CONFIG = {
    TOKEN_KEY: 'synapse_token',
    DEFAULT_SEARCH_LIMIT: 50,
    DEFAULT_CONTENT_LIMIT: 100,
};

// Default export for convenience
const config = {
    API_BASE_URL,
    API_ENDPOINTS,
    APP_CONFIG,
};

export default config;