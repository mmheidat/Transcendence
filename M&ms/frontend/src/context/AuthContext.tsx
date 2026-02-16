import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth.service';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = async () => {
        try {
            const userData = await authService.fetchCurrentUser();
            setUser(userData);
        } catch (error) {
            // If fetch fails (e.g. invalid token), logout
            console.error("Failed to refresh user", error);
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Check for URL params (OAuth callback)
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        const urlError = urlParams.get('message'); // Backend sends error in 'message' param
        const requires2fa = urlParams.get('requires2fa');

        if (urlError) {
            console.error("Auth Error:", urlError);
            alert(`Authentication failed: ${urlError}`);
            window.history.replaceState({}, '', '/login'); // Clear URL
        }

        // If 2FA is required, don't auto-login — let Login.tsx handle it
        if (requires2fa === 'true') {
            setIsLoading(false);
            return;
        }

        if (urlToken) {
            authService.setToken(urlToken);
            window.history.replaceState({}, '', '/'); // Clear URL and go home
            refreshUser();
        } else {
            // Check for existing token on mount if not just logged in via OAuth
            const token = localStorage.getItem('auth_token');
            if (token) {
                refreshUser();
            } else {
                setIsLoading(false);
            }
        }
    }, []);

    const login = (token: string, newUser: User) => {
        authService.setToken(token);
        setUser(newUser);
    };

    const logout = () => {
        authService.clearToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            logout,
            refreshUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
