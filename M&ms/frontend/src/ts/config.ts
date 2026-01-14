// Centralized configuration for API endpoints
// Uses relative URLs so it works in any environment (dev, staging, production)

// API base URL - relative path works with nginx proxy
export const API_BASE_URL = '/api';

// WebSocket URL - dynamically builds based on current page protocol/host
export const getWebSocketUrl = (path: string = '/chat/ws'): string => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api${path}`;
};

// For backwards compatibility
export const WS_URL = getWebSocketUrl('/chat/ws');
