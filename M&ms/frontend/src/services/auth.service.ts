import { API_BASE_URL } from '../config';

export interface User {
    id: number;
    username: string;
    email: string;
    display_name: string;
    avatar_url?: string;
    is_online: number;
    oauth_provider?: string;
    created_at?: string;
}

export interface AuthResponse {
    message: string;
    token: string;
    user: User;
    requires2fa?: boolean;
}

class AuthService {
    private token: string | null = localStorage.getItem('auth_token');

    private getHeaders(): HeadersInit {
        const headers: any = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    setToken(token: string) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    getToken(): string | null {
        return this.token;
    }

    // Login
    async login(email: string, password: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }
        return await response.json();
    }

    // Register
    async register(username: string, email: string, password: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }
        return await response.json();
    }

    // Fetch Current User
    async fetchCurrentUser(): Promise<User> {
        if (!this.token) throw new Error('No token');

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: this.getHeaders()
        });

        if (!response.ok) throw new Error('Failed to fetch user');
        return await response.json();
    }

    // Logout
    async logout(): Promise<void> {
        if (this.token) {
            try {
                // Disconnect WebSocket
                const { wsClient } = await import('../services/socket.service');
                wsClient.disconnect();

                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: this.getHeaders()
                });
            } catch (e) {
                console.error(e);
            }
        }
        this.clearToken();
    }
    // Google Sign-in redirect
    googleSignIn(): void {
        window.location.href = `${API_BASE_URL}/auth/google`;
    }

    // 2FA Methods
    async generate2faSecret(): Promise<{ secret: string; qrCode: string }> {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/generate`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({})
        });
        if (!response.ok) throw new Error('Failed to generate 2FA secret');
        return await response.json();
    }

    async enable2fa(code: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/turn-on`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ code })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to enable 2FA');
        }
    }

    async disable2fa(): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/turn-off`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({})
        });
        if (!response.ok) throw new Error('Failed to disable 2FA');
    }

    async get2faStatus(): Promise<{ enabled: boolean }> {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/status`, {
            headers: this.getHeaders()
        });
        if (!response.ok) return { enabled: false };
        return await response.json();
    }

    async verify2fa(code: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/auth/2fa/authenticate`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Invalid 2FA code');
        }
        return await response.json();
    }
}

export const authService = new AuthService();
