// Main application orchestrator
// This file coordinates all controllers and handles app initialization

import { AuthController } from './controllers/AuthController.js';
import { NavigationController, SectionType } from './controllers/NavigationController.js';
import { GameController } from './controllers/GameController.js';
import { TournamentController } from './controllers/TournamentController.js';
import { ChatController } from './controllers/ChatController.js';
import { ProfileController } from './controllers/ProfileController.js';
import { LeaderboardController } from './controllers/LeaderboardController.js';
import { SettingsController } from './controllers/SettingsController.js';
import { GameSocketService } from './services/GameSocketService.js';
import { showNotification, showGameInvitePopup } from './utils/NotificationUtils.js';

// ============================================================================
// CONTROLLERS
// ============================================================================

const authController = new AuthController();
const navigationController = new NavigationController();
const gameController = new GameController();
const tournamentController = new TournamentController();
const chatController = new ChatController();
const profileController = new ProfileController();
const leaderboardController = new LeaderboardController();
const settingsController = new SettingsController();
const gameSocketService = GameSocketService.getInstance();

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const mainApp = document.getElementById('mainApp') as HTMLElement;
const playerNameDisplay = document.getElementById('playerNameDisplay') as HTMLElement;
const languageSelector = document.getElementById('languageSelector') as HTMLSelectElement;

// Navigation buttons
const navPlay = document.getElementById('navPlay') as HTMLButtonElement;
const navLeaderboard = document.getElementById('navLeaderboard') as HTMLButtonElement;
const navProfile = document.getElementById('navProfile') as HTMLButtonElement;
const navChat = document.getElementById('navChat') as HTMLButtonElement;
const navSettings = document.getElementById('navSettings') as HTMLButtonElement;
const navLogout = document.getElementById('navLogout') as HTMLButtonElement;

let eventListenersSetup = false;

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeApp(): Promise<void> {
    console.log('Initializing app...');

    setupEventListeners();

    // Check for OAuth callback
    if (window.location.search.includes('token=')) {
        const success = await authController.handleOAuthCallback();
        if (success) {
            onAuthSuccess();
        }
        return;
    }

    // Check existing authentication
    const isAuthenticated = await authController.checkExistingAuth();
    if (isAuthenticated) {
        onAuthSuccess();
    } else {
        authController.showLogin();
    }
}

function onAuthSuccess(): void {
    const user = authController.getAuthService().getCurrentUser();

    if (user) {
        console.log('User authenticated:', user);

        // Update UI with user data
        if (playerNameDisplay) {
            playerNameDisplay.textContent = `Welcome, ${user.display_name || user.username}!`;
        }

        // Update profile name
        const profilePlayerName = document.getElementById('profilePlayerName');
        if (profilePlayerName) {
            profilePlayerName.textContent = user.display_name || user.username;
        }

        // Update settings
        const settingsUsername = document.getElementById('settingsUsername') as HTMLInputElement;
        if (settingsUsername) {
            settingsUsername.value = user.username;
        }

        const settingsEmail = document.getElementById('settingsEmail') as HTMLInputElement;
        if (settingsEmail) {
            settingsEmail.value = user.email;
        }

        // Update avatar
        if (user.avatar_url) {
            updateAvatarImage(user.avatar_url);
        }

        // Connect WebSocket
        gameSocketService.connect()
            .then(() => {
                console.log('🎮 Game WebSocket connected');
                setupGameSocketListeners();
            })
            .catch((err) => console.error('Failed to connect game WebSocket:', err));
    }

    authController.hideLoginCards();
    mainApp?.classList.remove('hidden');
    document.body.classList.remove('overflow-hidden');

    navigationController.showSection('game', true);
}

function updateAvatarImage(avatarUrl: string): void {
    const avatarElements = document.querySelectorAll('[id^="currentAvatar"]');
    avatarElements.forEach(element => {
        if (element instanceof HTMLElement) {
            element.style.backgroundImage = `url(${avatarUrl})`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
            element.textContent = '';
        }
    });
}

function updatePlayerName(name: string): void {
    if (playerNameDisplay) {
        playerNameDisplay.textContent = `Welcome, ${name}!`;
    }
    const profilePlayerName = document.getElementById('profilePlayerName');
    if (profilePlayerName) {
        profilePlayerName.textContent = name;
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners(): void {
    if (eventListenersSetup) {
        console.log('Event listeners already set up, skipping...');
        return;
    }

    console.log('Setting up event listeners...');
    eventListenersSetup = true;

    // Auth controller
    authController.setCallbacks(onAuthSuccess, () => {
        authController.showLogin();
        navigationController.showSection('welcome', false);
    });
    authController.setupEventListeners();

    // Navigation
    navPlay?.addEventListener('click', () => navigationController.showSection('game'));
    navLeaderboard?.addEventListener('click', () => navigationController.showSection('leaderboard'));
    navProfile?.addEventListener('click', () => navigationController.showSection('profile'));
    navChat?.addEventListener('click', () => navigationController.showSection('chat'));
    navSettings?.addEventListener('click', () => navigationController.showSection('settings'));

    // Logout
    navLogout?.addEventListener('click', async () => {
        const confirmLogout = confirm('Are you sure you want to log out?');
        if (confirmLogout) {
            gameController.stopCurrentGame();
            tournamentController.stopCurrentGame();
            chatController.stopSocialPolling();
            await authController.logout();
        }
    });

    // Language selector
    languageSelector?.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        console.log('Language changed to:', target.value);
    });

    // Navigation section change callbacks
    navigationController.setOnSectionChange((section: SectionType) => {
        // Stop games when leaving
        if (section !== 'game') {
            gameController.stopCurrentGame();
            tournamentController.stopCurrentGame();
        }

        // Stop chat polling when leaving chat
        if (section !== 'chat') {
            chatController.stopSocialPolling();
        }

        // Section-specific loading
        switch (section) {
            case 'leaderboard':
                setTimeout(() => leaderboardController.loadLeaderboard(), 1000);
                break;
            case 'profile':
                profileController.loadProfileData();
                break;
            case 'chat':
                chatController.loadSocialData();
                break;
            case 'settings':
                settingsController.check2faStatus();
                settingsController.loadSettingsData();
                break;
        }
    });

    // Game controller
    gameController.setupEventListeners();

    // Tournament controller
    tournamentController.setupEventListeners();

    // Chat controller
    chatController.setOnShowSection((section) => navigationController.showSection(section as SectionType));
    chatController.setupEventListeners();

    // Settings controller
    settingsController.setCallbacks(
        (section) => navigationController.showSection(section as SectionType),
        updatePlayerName
    );
    settingsController.setupEventListeners();
}

// ============================================================================
// GAME SOCKET LISTENERS
// ============================================================================

function setupGameSocketListeners(): void {
    console.log('🎮 Setting up game socket listeners');

    gameSocketService.on('game_invite', (message) => {
        console.log('🎮 Received game invite:', message);
        showGameInvitePopup(
            message.invite,
            (id) => gameSocketService.acceptInvite(id),
            (id) => gameSocketService.declineInvite(id)
        );
    });

    gameSocketService.on('game_invite_sent', (message) => {
        console.log('🎮 Game invite sent successfully:', message);
    });

    gameSocketService.on('game_invite_error', (message) => {
        console.log('🎮 Game invite error:', message);
        showNotification(message.error, 'error');
    });

    gameSocketService.on('game_invite_expired', () => {
        showNotification('Game invite expired', 'info');
    });

    gameSocketService.on('game_invite_declined', () => {
        showNotification('Your game invite was declined', 'info');
    });

    gameSocketService.on('game_invite_accepted', (message) => {
        console.log('🎮 Game invite accepted:', message);
        showNotification('Game starting!', 'success');
        gameSocketService.setCurrentGame(message.game_id, message.is_host);
        gameController.startOnlineGame(
            message.opponent_id,
            message.is_host,
            message.db_game_id,
            (section) => navigationController.showSection(section as SectionType)
        );
    });

    gameSocketService.on('new_message', (message) => {
        console.log('💬 Received new message:', message);
        chatController.handleIncomingMessage(message);
    });
}

// ============================================================================
// START APPLICATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
