// Authentication controller for login, logout, OAuth, 2FA, and registration

import { AuthService } from '../services/AuthService.js';

export class AuthController {
    private authService: AuthService;
    private temp2FAToken: string | null = null;
    private onAuthSuccess: (() => void) | null = null;
    private onShowLogin: (() => void) | null = null;

    // DOM elements
    private loginCard: HTMLElement | null;
    private loginForm: HTMLFormElement | null;
    private registerCard: HTMLElement | null;
    private registerForm: HTMLFormElement | null;
    private registerError: HTMLElement | null;
    private googleLoginBtn: HTMLButtonElement | null;
    private googleRegisterBtn: HTMLButtonElement | null;
    private authCallback: HTMLElement | null;
    private loginTwoFactorCard: HTMLElement | null;
    private loginTwoFactorForm: HTMLFormElement | null;
    private loginTwoFactorError: HTMLElement | null;
    private cancelTwoFactorLogin: HTMLButtonElement | null;

    constructor() {
        this.authService = AuthService.getInstance();

        this.loginCard = document.getElementById('loginCard');
        this.loginForm = document.getElementById('loginForm') as HTMLFormElement;
        this.registerCard = document.getElementById('registerCard');
        this.registerForm = document.getElementById('registerForm') as HTMLFormElement;
        this.registerError = document.getElementById('registerError');
        this.googleLoginBtn = document.getElementById('googleLogin') as HTMLButtonElement;
        this.googleRegisterBtn = document.getElementById('googleRegister') as HTMLButtonElement;
        this.authCallback = document.getElementById('authCallback');
        this.loginTwoFactorCard = document.getElementById('loginTwoFactorCard');
        this.loginTwoFactorForm = document.getElementById('loginTwoFactorForm') as HTMLFormElement;
        this.loginTwoFactorError = document.getElementById('loginTwoFactorError');
        this.cancelTwoFactorLogin = document.getElementById('cancelTwoFactorLogin') as HTMLButtonElement;
    }

    setCallbacks(onAuthSuccess: () => void, onShowLogin: () => void): void {
        this.onAuthSuccess = onAuthSuccess;
        this.onShowLogin = onShowLogin;
    }

    getAuthService(): AuthService {
        return this.authService;
    }

    setupEventListeners(): void {
        // Google Sign-in
        this.googleLoginBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Starting Google OAuth flow...');
            this.authService.googleSignIn();
        });

        // Traditional login
        this.loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(this.loginForm!);
            const email = formData.get('email') as string || formData.get('username') as string;
            const password = formData.get('password') as string;

            try {
                const response = await this.authService.login(email, password);
                if (response.requires2fa) {
                    this.temp2FAToken = response.token;
                    this.loginCard?.classList.add('hidden');
                    this.loginTwoFactorCard?.classList.remove('hidden');
                } else {
                    this.onAuthSuccess?.();
                }
            } catch (error) {
                alert(error instanceof Error ? error.message : 'Login failed');
            }
        });

        // 2FA verification
        this.loginTwoFactorForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.loginTwoFactorError?.classList.add('hidden');
            const input = document.getElementById('twoFactorCode') as HTMLInputElement;
            const codeValue = input?.value;

            if (!this.temp2FAToken) {
                this.loginTwoFactorCard?.classList.add('hidden');
                this.loginCard?.classList.remove('hidden');
                return;
            }

            try {
                await this.authService.verify2fa(this.temp2FAToken, codeValue);
                this.loginTwoFactorCard?.classList.add('hidden');
                this.onAuthSuccess?.();
            } catch (error) {
                if (this.loginTwoFactorError) {
                    this.loginTwoFactorError.textContent = 'Invalid code';
                    this.loginTwoFactorError.classList.remove('hidden');
                }
            }
        });

        this.cancelTwoFactorLogin?.addEventListener('click', () => {
            this.loginTwoFactorCard?.classList.add('hidden');
            this.loginCard?.classList.remove('hidden');
            this.temp2FAToken = null;
        });

        // Registration form
        this.registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            this.registerError?.classList.add('hidden');

            const formData = new FormData(this.registerForm!);
            const username = formData.get('username') as string;
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            const passwordConfirm = formData.get('passwordConfirm') as string;

            // Client-side validation
            if (password !== passwordConfirm) {
                this.showRegisterError('Passwords do not match');
                return;
            }

            if (password.length < 8) {
                this.showRegisterError('Password must be at least 8 characters');
                return;
            }

            if (username.length < 3 || username.length > 20) {
                this.showRegisterError('Username must be between 3 and 20 characters');
                return;
            }

            try {
                await this.authService.register(username, email, password);
                this.onAuthSuccess?.();
            } catch (error) {
                this.showRegisterError(error instanceof Error ? error.message : 'Registration failed');
            }
        });

        // Toggle between login and register
        document.getElementById('showRegister')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loginCard?.classList.add('hidden');
            this.registerCard?.classList.remove('hidden');
        });

        document.getElementById('showLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.registerCard?.classList.add('hidden');
            this.loginCard?.classList.remove('hidden');
            this.registerError?.classList.add('hidden');
        });

        // Google register button
        this.googleRegisterBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Starting Google OAuth flow from register...');
            this.authService.googleSignIn();
        });
    }

    private showRegisterError(message: string): void {
        if (this.registerError) {
            this.registerError.textContent = message;
            this.registerError.classList.remove('hidden');
        }
    }

    showLogin(): void {
        this.loginCard?.classList.remove('hidden');
        this.registerCard?.classList.add('hidden');
        this.authCallback?.classList.add('hidden');
        document.body.classList.add('overflow-hidden');
    }

    showAuthCallback(): void {
        this.loginCard?.classList.add('hidden');
        this.authCallback?.classList.remove('hidden');
    }

    hideAuthCallback(): void {
        this.authCallback?.classList.add('hidden');
    }

    hideLoginCards(): void {
        this.loginCard?.classList.add('hidden');
        this.registerCard?.classList.add('hidden');
        this.authCallback?.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    async handleOAuthCallback(): Promise<boolean> {
        console.log('🎮 [FRONTEND] OAuth token detected in URL');
        this.showAuthCallback();
        const success = this.authService.handleOAuthCallback();
        console.log('🎮 [FRONTEND] OAuth callback handled, success:', success);

        if (success) {
            console.log('🎮 [FRONTEND] Waiting for auth-success event...');
            await new Promise(resolve => {
                window.addEventListener('auth-success', resolve, { once: true });
            });
            console.log('🎮 [FRONTEND] Auth success event received');
            return true;
        } else {
            console.error('🎮 [FRONTEND] OAuth callback failed');
            this.hideAuthCallback();
            this.showLogin();
            return false;
        }
    }

    async checkExistingAuth(): Promise<boolean> {
        const savedToken = localStorage.getItem('auth_token');
        console.log('🎮 [FRONTEND] Saved token exists:', !!savedToken);

        if (this.authService.isAuthenticated()) {
            console.log('🎮 [FRONTEND] User is authenticated, fetching user data...');
            try {
                await this.authService.fetchCurrentUser();
                console.log('🎮 [FRONTEND] User data fetched successfully');
                return true;
            } catch (error) {
                console.error('🎮 [FRONTEND] Failed to fetch user:', error);
                await this.authService.logout();
                return false;
            }
        }
        return false;
    }

    async logout(): Promise<void> {
        await this.authService.logout();
        this.onShowLogin?.();
    }
}
