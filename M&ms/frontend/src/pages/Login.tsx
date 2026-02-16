import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';


const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [show2FA, setShow2FA] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Handle Google OAuth 2FA redirect: ?requires2fa=true&token=<partial>
    // Token is already stored by AuthContext, just show the 2FA form
    useEffect(() => {
        const requires2fa = searchParams.get('requires2fa');
        if (requires2fa === 'true') {
            setShow2FA(true);
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const response = await authService.login(email, password);
            if (response.requires2fa) {
                authService.setToken(response.token); // Store partial token
                setShow2FA(true);
            } else {
                login(response.token, response.user);
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        }
    };

    const handle2FASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            const response = await authService.verify2fa(twoFactorCode);
            login(response.token, response.user);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Invalid 2FA code');
        }
    };

    const handleGoogleLogin = () => {
        authService.googleSignIn();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-rose-950 to-slate-900">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full">
                <h1 className="text-4xl font-bold text-center text-white mb-2">
                    {show2FA ? 'Two-Factor Auth' : 'Welcome to Pong'}
                </h1>
                <p className="text-gray-400 text-center mb-8">
                    {show2FA ? 'Enter the code from your app' : 'Sign in to start playing'}
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded mb-4">
                        {error}
                    </div>
                )}

                {!show2FA ? (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                placeholder="Enter your email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105">
                            Sign In
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handle2FASubmit} className="space-y-6">
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-300 mb-2">Authentication Code</label>
                            <input
                                type="text"
                                id="code"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                required
                                maxLength={6}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-center text-2xl tracking-widest"
                                placeholder="000000"
                            />
                        </div>

                        <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105">
                            Verify Code
                        </button>

                        <button
                            type="button"
                            onClick={() => { setShow2FA(false); setTwoFactorCode(''); setError(null); authService.clearToken(); }}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-2 px-4 rounded-lg transition duration-300"
                        >
                            Back to Login
                        </button>
                    </form>
                )}

                {!show2FA && (
                    <>
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                            </div>
                        </div>

                        <button onClick={handleGoogleLogin} className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center space-x-2">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span>Sign in with Google</span>
                        </button>

                        <div className="mt-6 text-center text-gray-400 text-sm">
                            <p>Don't have an account? <Link to="/register" className="text-rose-400 hover:text-rose-300 font-semibold">Create Account</Link></p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Login;
