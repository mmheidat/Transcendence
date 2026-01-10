import Game from './game';
import { AuthService } from './services/AuthService.js';
import { ProfileService } from './services/ProfileService.js';
import { socialService, Message } from './services/SocialService.js';

// Services
const authService = AuthService.getInstance();
const profileService = ProfileService.getInstance();

// Current chat state
let currentChatUserId: number | null = null;
let currentChatUserName: string = '';

// Main elements
const loginCard = document.getElementById('loginCard') as HTMLElement;
const loginForm = document.getElementById('loginForm') as HTMLFormElement;
const registerCard = document.getElementById('registerCard') as HTMLElement;
const registerForm = document.getElementById('registerForm') as HTMLFormElement;
const registerError = document.getElementById('registerError') as HTMLElement;
const showRegisterLink = document.getElementById('showRegister') as HTMLAnchorElement;
const showLoginLink = document.getElementById('showLogin') as HTMLAnchorElement;
const googleLoginBtn = document.getElementById('googleLogin') as HTMLButtonElement;
const googleRegisterBtn = document.getElementById('googleRegister') as HTMLButtonElement;
const mainApp = document.getElementById('mainApp') as HTMLElement;
const authCallback = document.getElementById('authCallback') as HTMLElement;
const playerNameDisplay = document.getElementById('playerNameDisplay') as HTMLElement;

// Navigation buttons
const navPlay = document.getElementById('navPlay') as HTMLButtonElement;
const navLeaderboard = document.getElementById('navLeaderboard') as HTMLButtonElement;
const navProfile = document.getElementById('navProfile') as HTMLButtonElement;
const navChat = document.getElementById('navChat') as HTMLButtonElement;
const navSettings = document.getElementById('navSettings') as HTMLButtonElement;
const navLogout = document.getElementById('navLogout') as HTMLButtonElement;

// Language controls
const languageSelector = document.getElementById('languageSelector') as HTMLSelectElement;

// Content sections
const welcomeSection = document.getElementById('welcomeSection') as HTMLElement;
const gameContainer = document.getElementById('game-container') as HTMLElement;
const leaderboardSection = document.getElementById('leaderboardSection') as HTMLElement;
const profileSection = document.getElementById('profileSection') as HTMLElement;
const chatSection = document.getElementById('chatSection') as HTMLElement;
const settingsSection = document.getElementById('settingsSection') as HTMLElement;

// Chat functionality
// Friends list is now loaded dynamically
const noChatSelected = document.getElementById('noChatSelected') as HTMLElement;
const chatWindow = document.getElementById('chatWindow') as HTMLElement;
const chatFriendName = document.getElementById('chatFriendName') as HTMLElement;
const chatInput = document.getElementById('chatInput') as HTMLInputElement;
const sendMessageBtn = document.getElementById('sendMessageBtn') as HTMLButtonElement;
const chatMessages = document.getElementById('chatMessages') as HTMLElement;
const viewProfileBtn = document.getElementById('viewProfileBtn') as HTMLButtonElement;
const inviteToGameBtn = document.getElementById('inviteToGameBtn') as HTMLButtonElement;
const friendOptionsBtn = document.getElementById('friendOptionsBtn') as HTMLButtonElement;
const friendOptionsMenu = document.getElementById('friendOptionsMenu') as HTMLElement;

// Game variables
let currentGame: Game | null = null;

// Game mode elements
const gameModeSelection = document.getElementById('gameModeSelection') as HTMLElement;
const aiDifficultySelection = document.getElementById('aiDifficultySelection') as HTMLElement;
const actualGameCanvas = document.getElementById('actualGameCanvas') as HTMLElement;

const selectAIMode = document.getElementById('selectAIMode') as HTMLButtonElement;
const selectMultiplayerMode = document.getElementById('selectMultiplayerMode') as HTMLButtonElement;
const select2v2Mode = document.getElementById('select2v2Mode') as HTMLButtonElement;
const backToMenu = document.getElementById('backToMenu') as HTMLButtonElement;
const backToGameMode = document.getElementById('backToGameMode') as HTMLButtonElement;
const startAIGameBtns = document.querySelectorAll('.start-ai-game');
const quitGame = document.getElementById('quitGame') as HTMLButtonElement;

const gameMode = document.getElementById('gameMode') as HTMLElement;
const gameDifficulty = document.getElementById('gameDifficulty') as HTMLElement;

// Tournament elements
const selectTournamentMode = document.getElementById('selectTournamentMode') as HTMLButtonElement;
const tournamentSetup = document.getElementById('tournamentSetup') as HTMLElement;
const tournamentBracket = document.getElementById('tournamentBracket') as HTMLElement;
const startTournamentBtn = document.getElementById('startTournament') as HTMLButtonElement;
const backFromTournamentSetup = document.getElementById('backFromTournamentSetup') as HTMLButtonElement;
const playTournamentMatchBtn = document.getElementById('playTournamentMatch') as HTMLButtonElement;
const exitTournamentBtn = document.getElementById('exitTournament') as HTMLButtonElement;

// 2FA Elements
const loginTwoFactorCard = document.getElementById('loginTwoFactorCard') as HTMLElement;
const loginTwoFactorForm = document.getElementById('loginTwoFactorForm') as HTMLFormElement;
const loginTwoFactorError = document.getElementById('loginTwoFactorError') as HTMLElement;
const cancelTwoFactorLogin = document.getElementById('cancelTwoFactorLogin') as HTMLButtonElement;

const twoFactorSetupModal = document.getElementById('twoFactorSetupModal') as HTMLElement;
const twoFactorSetupForm = document.getElementById('twoFactorSetupForm') as HTMLFormElement;
const setupTwoFactorError = document.getElementById('setupTwoFactorError') as HTMLElement;
const qrCodeContainer = document.getElementById('qrCodeContainer') as HTMLElement;
const toggle2faBtn = document.getElementById('toggle2faBtn') as HTMLButtonElement;
const close2faSetup = document.getElementById('close2faSetup') as HTMLButtonElement;

let temp2FAToken: string | null = null; // Store temp token during 2FA login flow

// Tournament state
interface TournamentState {
    players: string[];
    currentMatch: number; // 0 = semi1, 1 = semi2, 2 = final
    semi1Winner: string | null;
    semi2Winner: string | null;
    champion: string | null;
    active: boolean;
}

let tournament: TournamentState = {
    players: [],
    currentMatch: 0,
    semi1Winner: null,
    semi2Winner: null,
    champion: null,
    active: false
};

// Settings elements
const avatarUpload = document.getElementById('avatarUpload') as HTMLInputElement;
const currentAvatar = document.getElementById('currentAvatar') as HTMLElement;
const updateUsernameBtn = document.getElementById('updateUsernameBtn') as HTMLButtonElement;
const saveSettingsBtn = document.getElementById('saveSettingsBtn') as HTMLButtonElement;
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn') as HTMLButtonElement;


let isNavigating = false;
let eventListenersSetup = false;

type SectionType = 'game' | 'leaderboard' | 'profile' | 'chat' | 'settings' | 'welcome';

// ============================================================================
// INITIALIZATION
// ============================================================================


async function initializeApp(): Promise<void> {
    console.log('Initializing app...');

    // Setup event listeners first, before any authentication flow
    setupEventListeners();

    // Check for OAuth callback
    if (window.location.search.includes('token=')) {
        console.log('🎮 [FRONTEND] OAuth token detected in URL');
        showAuthCallback();
        const success = authService.handleOAuthCallback();
        console.log('🎮 [FRONTEND] OAuth callback handled, success:', success);

        if (success) {
            console.log('🎮 [FRONTEND] Waiting for auth-success event...');
            await new Promise(resolve => {
                window.addEventListener('auth-success', resolve, { once: true });
            });
            console.log('🎮 [FRONTEND] Auth success event received');
            onAuthSuccess();
        } else {
            console.error('🎮 [FRONTEND] OAuth callback failed');
            hideAuthCallback();
            showLogin();
        }
        return;
    }

    // Check if user is already authenticated
    const savedToken = localStorage.getItem('auth_token');
    console.log('🎮 [FRONTEND] Saved token exists:', !!savedToken);

    if (authService.isAuthenticated()) {
        console.log('🎮 [FRONTEND] User is authenticated, fetching user data...');
        try {
            await authService.fetchCurrentUser();
            console.log('🎮 [FRONTEND] User data fetched successfully');
            onAuthSuccess();
        } catch (error) {
            console.error('🎮 [FRONTEND] Failed to fetch user:', error);
            await authService.logout();
            showLogin();
        }
    } else {
        console.log('🎮 [FRONTEND] No authentication, showing login');
        showLogin();
    }
}

function showLogin(): void {
    loginCard.classList.remove('hidden');
    registerCard.classList.add('hidden');
    mainApp.classList.add('hidden');
    authCallback.classList.add('hidden');
    document.body.classList.add('overflow-hidden');
}

function showAuthCallback(): void {
    loginCard.classList.add('hidden');
    mainApp.classList.add('hidden');
    authCallback.classList.remove('hidden');
}

function hideAuthCallback(): void {
    authCallback.classList.add('hidden');
}

function onAuthSuccess(): void {
    const user = authService.getCurrentUser();

    if (user) {
        console.log('User authenticated:', user);

        // Update UI with user data
        if (playerNameDisplay) {
            playerNameDisplay.textContent = `Welcome, ${user.display_name || user.username}!`;
        }

        // Update profile
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

        // Update avatar if available
        if (user.avatar_url) {
            updateAvatarImage(user.avatar_url);
        }
    }

    loginCard.classList.add('hidden');
    registerCard.classList.add('hidden');
    authCallback.classList.add('hidden');
    mainApp.classList.remove('hidden');
    document.body.classList.remove('overflow-hidden');

    // Initialize with game section so users can play immediately
    showSection('game', true);
}

function updateAvatarImage(avatarUrl: string): void {
    const avatarElements = document.querySelectorAll('[id^="currentAvatar"], [id^="chatAvatar"]');
    avatarElements.forEach(element => {
        if (element instanceof HTMLElement) {
            element.style.backgroundImage = `url(${avatarUrl})`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
            element.textContent = '';
        }
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners(): void {
    // Prevent duplicate event listener registration
    if (eventListenersSetup) {
        console.log('Event listeners already set up, skipping...');
        return;
    }

    console.log('Setting up event listeners...');
    eventListenersSetup = true;

    // Google Sign-in
    googleLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Starting Google OAuth flow...');
        authService.googleSignIn();
    });

    // Traditional login
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const email = formData.get('email') as string || formData.get('username') as string;
        const password = formData.get('password') as string;

        try {
            const response = await authService.login(email, password);
            if (response.requires2fa) {
                temp2FAToken = response.token;
                loginCard.classList.add('hidden');
                loginTwoFactorCard.classList.remove('hidden');
            } else {
                onAuthSuccess();
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Login failed');
        }
    });

    loginTwoFactorForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginTwoFactorError.classList.add('hidden');
        const input = document.getElementById('twoFactorCode') as HTMLInputElement;
        const codeValue = input?.value;

        if (!temp2FAToken) {
            loginTwoFactorCard.classList.add('hidden');
            loginCard.classList.remove('hidden');
            return;
        }

        try {
            await authService.verify2fa(temp2FAToken, codeValue);
            loginTwoFactorCard.classList.add('hidden');
            onAuthSuccess();
        } catch (error) {
            loginTwoFactorError.textContent = 'Invalid code';
            loginTwoFactorError.classList.remove('hidden');
        }
    });

    cancelTwoFactorLogin?.addEventListener('click', () => {
        loginTwoFactorCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
        temp2FAToken = null;
    });

    // Registration form handler
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerError.classList.add('hidden');

        const formData = new FormData(registerForm);
        const username = formData.get('username') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const passwordConfirm = formData.get('passwordConfirm') as string;

        // Client-side validation
        if (password !== passwordConfirm) {
            registerError.textContent = 'Passwords do not match';
            registerError.classList.remove('hidden');
            return;
        }

        if (password.length < 8) {
            registerError.textContent = 'Password must be at least 8 characters';
            registerError.classList.remove('hidden');
            return;
        }

        if (username.length < 3 || username.length > 20) {
            registerError.textContent = 'Username must be between 3 and 20 characters';
            registerError.classList.remove('hidden');
            return;
        }

        try {
            await authService.register(username, email, password);
            // Auto-login after successful registration
            onAuthSuccess();
        } catch (error) {
            registerError.textContent = error instanceof Error ? error.message : 'Registration failed';
            registerError.classList.remove('hidden');
        }
    });

    // Toggle between login and register
    showRegisterLink?.addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    });

    showLoginLink?.addEventListener('click', (e) => {
        e.preventDefault();
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
        registerError.classList.add('hidden');
    });

    // Google register button (same as login)
    googleRegisterBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Starting Google OAuth flow from register...');
        authService.googleSignIn();
    });

    // Logout with confirmation
    navLogout?.addEventListener('click', async () => {
        const confirmLogout = confirm('Are you sure you want to log out?');
        if (confirmLogout) {
            await authService.logout();
            showLogin();
            // Reset sections
            showSection('welcome', false);
        }
    });

    // Navigation
    navPlay?.addEventListener('click', () => showSection('game'));
    navLeaderboard?.addEventListener('click', () => showSection('leaderboard'));
    navProfile?.addEventListener('click', () => showSection('profile'));
    navChat?.addEventListener('click', () => showSection('chat'));
    navSettings?.addEventListener('click', () => showSection('settings'));

    // Language selector
    languageSelector?.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        console.log('Language changed to:', target.value);
    });

    // Game mode selection
    selectAIMode?.addEventListener('click', () => {
        gameModeSelection.classList.add('hidden');
        aiDifficultySelection.classList.remove('hidden');
    });

    // 1v1 Local Mode - direct game start
    selectMultiplayerMode?.addEventListener('click', () => {
        gameModeSelection.classList.add('hidden');
        startLocalGame('1v1');
    });

    // 2v2 Mode - direct game start
    select2v2Mode?.addEventListener('click', () => {
        gameModeSelection.classList.add('hidden');
        startLocalGame('2v2');
    });

    // Tournament Mode - show setup
    selectTournamentMode?.addEventListener('click', () => {
        gameModeSelection.classList.add('hidden');
        tournamentSetup.classList.remove('hidden');
    });

    // Back from tournament setup
    backFromTournamentSetup?.addEventListener('click', () => {
        tournamentSetup.classList.add('hidden');
        gameModeSelection.classList.remove('hidden');
    });

    // Start tournament
    startTournamentBtn?.addEventListener('click', () => {
        const p1 = (document.getElementById('tournamentPlayer1') as HTMLInputElement).value.trim() || 'Player 1';
        const p2 = (document.getElementById('tournamentPlayer2') as HTMLInputElement).value.trim() || 'Player 2';
        const p3 = (document.getElementById('tournamentPlayer3') as HTMLInputElement).value.trim() || 'Player 3';
        const p4 = (document.getElementById('tournamentPlayer4') as HTMLInputElement).value.trim() || 'Player 4';

        startTournament([p1, p2, p3, p4]);
    });

    // Play tournament match
    playTournamentMatchBtn?.addEventListener('click', () => {
        playCurrentTournamentMatch();
    });

    // Exit tournament
    exitTournamentBtn?.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit the tournament?')) {
            exitTournament();
        }
    });

    backToMenu?.addEventListener('click', () => {
        window.history.back();
    });

    backToGameMode?.addEventListener('click', () => {
        aiDifficultySelection.classList.add('hidden');
        gameModeSelection.classList.remove('hidden');
    });

    // Start AI game
    startAIGameBtns.forEach(btn => {
        btn.addEventListener('click', function (this: HTMLElement) {
            const difficulty = this.getAttribute('data-difficulty');
            if (difficulty) startAIGame(difficulty);
        });
    });

    quitGame?.addEventListener('click', async () => {
        if (currentGame && currentGame.gameRunning) {
            // Show confirmation dialog for active game
            const confirmExit = confirm(
                '⚠️ Warning: Leaving now will count as a LOSS!\n\n' +
                'This match will be recorded in your match history as a loss (Leaver).\n\n' +
                'Are you sure you want to quit?'
            );

            if (!confirmExit) {
                return; // User cancelled, don't quit
            }

            // Record the game as a loss for the current user
            const user = authService.getCurrentUser();
            if (user) {
                try {
                    // Record as loss - opponent wins with current + bonus
                    const leftScore = currentGame.leftScore;
                    const rightScore = Math.max(currentGame.rightScore, 11); // Winner gets at least winning score
                    const isAI = currentGame.isAIGame;

                    await profileService.recordGameResult({
                        player2_id: undefined, // Local/AI game
                        player1_score: leftScore,
                        player2_score: rightScore,
                        winner_id: undefined, // No specific winner ID for AI/local
                        game_mode: isAI ? 'ai_forfeit' : 'pvp_forfeit'
                    });

                    console.log('Game recorded as forfeit/loss');
                } catch (error) {
                    console.error('Failed to record game forfeit:', error);
                }
            }
        }

        if (currentGame) {
            currentGame.stop();
            currentGame = null;
        }
        actualGameCanvas.classList.add('hidden');
        gameModeSelection.classList.remove('hidden');
        (document.getElementById('player1Score') as HTMLElement).textContent = '0';
        (document.getElementById('player2Score') as HTMLElement).textContent = '0';
    });

    // Chat functionality
    setupChatListeners();

    // Settings functionality
    setupSettingsListeners();
}

// ============================================================================
// CHAT FUNCTIONALITY
// ============================================================================

function setupChatListeners(): void {
    // Send message handlers
    sendMessageBtn?.addEventListener('click', sendMessage);
    chatInput?.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') sendMessage();
    });

    viewProfileBtn?.addEventListener('click', () => showSection('profile'));

    inviteToGameBtn?.addEventListener('click', () => {
        if (!currentChatUserId) {
            alert('Please select a friend first');
            return;
        }
        const friendName = chatFriendName.textContent || 'Friend';
        // TODO: Implement real game invite system via WebSocket
        alert(`Game invitation sent to ${friendName}! They will be notified when online.`);
    });

    friendOptionsBtn?.addEventListener('click', () => {
        friendOptionsMenu.classList.toggle('hidden');
    });

    // Unfriend button handler
    const unfriendBtn = document.getElementById('unfriendBtn');
    unfriendBtn?.addEventListener('click', async () => {
        if (!currentChatUserId) return;

        const friendName = currentChatUserName || 'this friend';
        if (!confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
            return;
        }

        try {
            await socialService.removeFriend(currentChatUserId);
            friendOptionsMenu.classList.add('hidden');

            // Close chat and refresh friends list
            chatWindow.classList.add('hidden');
            noChatSelected.classList.remove('hidden');
            currentChatUserId = null;
            currentChatUserName = '';

            loadFriendsList();
            alert('Friend removed successfully');
        } catch (error) {
            console.error('Failed to remove friend:', error);
            alert('Failed to remove friend. Please try again.');
        }
    });

    document.addEventListener('click', (e: MouseEvent) => {
        if (!friendOptionsBtn?.contains(e.target as Node) &&
            !friendOptionsMenu?.contains(e.target as Node)) {
            friendOptionsMenu?.classList.add('hidden');
        }
    });

    // Add Friend functionality
    const addFriendBtn = document.getElementById('addFriendBtn');
    const addFriendInput = document.getElementById('addFriendInput') as HTMLInputElement;

    addFriendBtn?.addEventListener('click', async () => {
        const username = addFriendInput?.value.trim();
        if (!username) {
            showAddFriendResult('Please enter a username', 'error');
            return;
        }

        try {
            // Search for user
            const users = await socialService.searchUsers(username);
            console.log('Search results:', users);

            if (users.length === 0) {
                showAddFriendResult('No users found matching "' + username + '"', 'error');
                return;
            }

            // Try exact match first, then fallback to first result
            let targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (!targetUser) {
                // Check display_name as well
                targetUser = users.find(u => u.display_name?.toLowerCase() === username.toLowerCase());
            }
            if (!targetUser) {
                // Use first result as fallback
                targetUser = users[0];
            }

            await socialService.sendFriendRequest(targetUser.id);
            showAddFriendResult(`Friend request sent to ${targetUser.display_name || targetUser.username}!`, 'success');
            addFriendInput.value = '';
        } catch (error: any) {
            console.error('Add friend error:', error);
            showAddFriendResult(error.message || 'Failed to send request', 'error');
        }
    });
}

function showAddFriendResult(message: string, type: 'success' | 'error'): void {
    const addFriendResult = document.getElementById('addFriendResult') as HTMLElement;
    if (addFriendResult) {
        addFriendResult.textContent = message;
        addFriendResult.className = `mt-2 text-sm ${type === 'success' ? 'text-green-400' : 'text-red-400'}`;
        addFriendResult.classList.remove('hidden');
        setTimeout(() => addFriendResult.classList.add('hidden'), 3000);
    }
}

// Load and render friends list
async function loadFriendsList(): Promise<void> {
    const friendsList = document.getElementById('friendsList');
    const friendsCount = document.getElementById('friendsCount');
    if (!friendsList) return;

    try {
        const friends = await socialService.getFriends();
        friendsCount!.textContent = friends.length.toString();

        // Check if current chat partner is still a friend
        if (currentChatUserId) {
            const stillFriends = friends.some(f => f.id === currentChatUserId);
            if (!stillFriends) {
                // Close chat window - they're no longer friends
                chatWindow.classList.add('hidden');
                noChatSelected.classList.remove('hidden');
                currentChatUserId = null;
                currentChatUserName = '';
            }
        }

        if (friends.length === 0) {
            friendsList.innerHTML = '<div class="text-gray-400 text-center py-4 text-sm">No friends yet. Add someone!</div>';
            return;
        }

        friendsList.innerHTML = friends.map(friend => `
            <div class="friend-item bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition duration-300"
                data-friend-id="${friend.id}" data-friend-name="${friend.display_name || friend.username}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="relative">
                            ${friend.avatar_url
                ? `<img src="${friend.avatar_url}" class="rounded-full w-10 h-10 object-cover">`
                : `<div class="bg-purple-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
                                    ${(friend.display_name || friend.username).charAt(0).toUpperCase()}
                                   </div>`
            }
                            <div class="absolute bottom-0 right-0 w-3 h-3 ${friend.is_online ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-gray-700"></div>
                        </div>
                        <div>
                            <p class="text-white font-semibold">${friend.display_name || friend.username}</p>
                            <p class="${friend.is_online ? 'text-green-400' : 'text-gray-400'} text-xs">${friend.is_online ? 'Online' : 'Offline'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click listeners to friend items
        friendsList.querySelectorAll('.friend-item').forEach(item => {
            item.addEventListener('click', () => {
                const friendId = parseInt(item.getAttribute('data-friend-id') || '0');
                const friendName = item.getAttribute('data-friend-name') || 'Friend';
                openChatWithUser(friendId, friendName);
            });
        });
    } catch (error) {
        console.error('Failed to load friends:', error);
        friendsList.innerHTML = '<div class="text-red-400 text-center py-4 text-sm">Failed to load friends</div>';
    }
}

// Load and render friend requests
async function loadFriendRequests(): Promise<void> {
    const requestsList = document.getElementById('friendRequestsList');
    const requestsCount = document.getElementById('friendRequestsCount');
    if (!requestsList) return;

    try {
        const requests = await socialService.getPendingRequests();
        requestsCount!.textContent = requests.length.toString();

        if (requests.length === 0) {
            requestsList.innerHTML = '<div class="text-gray-400 text-center py-2 text-sm">No pending requests</div>';
            return;
        }

        requestsList.innerHTML = requests.map(req => `
            <div class="bg-gray-700 rounded-lg p-3" data-request-id="${req.id}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-white font-semibold">${req.from.display_name || req.from.username}</span>
                </div>
                <div class="flex space-x-2">
                    <button class="accept-request flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-2 rounded transition duration-300">
                        Accept
                    </button>
                    <button class="reject-request flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-2 rounded transition duration-300">
                        Decline
                    </button>
                </div>
            </div>
        `).join('');

        // Add click listeners
        requestsList.querySelectorAll('.accept-request').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const requestDiv = (btn as HTMLElement).closest('[data-request-id]');
                const requestId = parseInt(requestDiv?.getAttribute('data-request-id') || '0');
                try {
                    await socialService.acceptRequest(requestId);
                    loadFriendRequests();
                    loadFriendsList();
                } catch (error) {
                    console.error('Failed to accept request:', error);
                }
            });
        });

        requestsList.querySelectorAll('.reject-request').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const requestDiv = (btn as HTMLElement).closest('[data-request-id]');
                const requestId = parseInt(requestDiv?.getAttribute('data-request-id') || '0');
                try {
                    await socialService.rejectRequest(requestId);
                    loadFriendRequests();
                } catch (error) {
                    console.error('Failed to reject request:', error);
                }
            });
        });
    } catch (error) {
        console.error('Failed to load friend requests:', error);
    }
}

// Open chat with specific user
async function openChatWithUser(userId: number, userName: string): Promise<void> {
    currentChatUserId = userId;
    currentChatUserName = userName;

    noChatSelected.classList.add('hidden');
    chatWindow.classList.remove('hidden');
    chatFriendName.textContent = userName;

    // Clear and load messages
    chatMessages.innerHTML = '<div class="text-gray-400 text-center py-4">Loading messages...</div>';

    try {
        const messages = await socialService.getMessages(userId);
        renderMessages(messages);
    } catch (error) {
        console.error('Failed to load messages:', error);
        chatMessages.innerHTML = '<div class="text-red-400 text-center py-4">Failed to load messages</div>';
    }
}

function renderMessages(messages: Message[]): void {
    if (messages.length === 0) {
        chatMessages.innerHTML = '<div class="text-gray-400 text-center py-4">No messages yet. Start the conversation!</div>';
        return;
    }

    chatMessages.innerHTML = messages.map(msg => {
        const time = new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (msg.is_mine) {
            return `
                <div class="flex items-start space-x-2 justify-end">
                    <div>
                        <div class="bg-purple-600 rounded-lg p-3 max-w-xs">
                            <p class="text-white text-sm">${msg.content}</p>
                        </div>
                        <p class="text-gray-500 text-xs mt-1 mr-2 text-right">${time}</p>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="flex items-start space-x-2">
                    <div class="bg-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        ${currentChatUserName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="bg-gray-700 rounded-lg p-3 max-w-xs">
                            <p class="text-white text-sm">${msg.content}</p>
                        </div>
                        <p class="text-gray-500 text-xs mt-1 ml-2">${time}</p>
                    </div>
                </div>
            `;
        }
    }).join('');

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(): Promise<void> {
    const message = chatInput.value.trim();
    if (!message || !currentChatUserId) return;

    const originalValue = chatInput.value;
    chatInput.value = '';
    chatInput.disabled = true;

    try {
        await socialService.sendMessage(currentChatUserId, message);

        // Add the message to the UI
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start space-x-2 justify-end';
        messageDiv.innerHTML = `
            <div>
                <div class="bg-purple-600 rounded-lg p-3 max-w-xs">
                    <p class="text-white text-sm">${message}</p>
                </div>
                <p class="text-gray-500 text-xs mt-1 mr-2 text-right">
                    ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        `;

        // Remove "no messages" placeholder if present
        const placeholder = chatMessages.querySelector('.text-gray-400.text-center');
        if (placeholder) placeholder.remove();

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Failed to send message:', error);
        chatInput.value = originalValue;
        alert('Failed to send message. Please try again.');
    } finally {
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// Load social data when chat section opens
let socialPollingInterval: number | null = null;

function loadSocialData(): void {
    loadFriendsList();
    loadFriendRequests();

    // Start polling to keep friends list updated (detects if someone removed you)
    startSocialPolling();
}

function startSocialPolling(): void {
    stopSocialPolling();
    socialPollingInterval = window.setInterval(() => {
        loadFriendsList();
        loadFriendRequests();
    }, 10000); // Refresh every 10 seconds
}

function stopSocialPolling(): void {
    if (socialPollingInterval) {
        clearInterval(socialPollingInterval);
        socialPollingInterval = null;
    }
}

// ============================================================================
// SETTINGS FUNCTIONALITY
// ============================================================================

function setupSettingsListeners(): void {
    avatarUpload?.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('File size must be less than 2MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event: ProgressEvent<FileReader>) => {
                if (event.target?.result) {
                    currentAvatar.innerHTML = `<img src="${event.target.result}" class="w-24 h-24 rounded-full object-cover">`;
                }
            };
            reader.readAsDataURL(file);
        }
    });

    toggle2faBtn?.addEventListener('click', async () => {
        if (toggle2faBtn.textContent?.includes('Disable')) {
            if (confirm('Are you sure you want to disable 2FA?')) {
                try {
                    await authService.disable2fa();
                    update2faButton(false);
                } catch (e) { alert('Failed to disable 2FA'); }
            }
        } else {
            try {
                const data = await authService.generate2faSecret();
                qrCodeContainer.innerHTML = `<img src="${data.qrCode}" alt="2FA QR Code" class="mx-auto" />`;
                twoFactorSetupModal.classList.remove('hidden');
            } catch (e) { alert('Failed to start 2FA setup'); }
        }
    });

    close2faSetup?.addEventListener('click', () => {
        twoFactorSetupModal.classList.add('hidden');
    });

    twoFactorSetupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        setupTwoFactorError.classList.add('hidden');
        const input = document.getElementById('setupTwoFactorCode') as HTMLInputElement;
        const code = input.value;
        try {
            await authService.enable2fa(code);
            twoFactorSetupModal.classList.add('hidden');
            update2faButton(true);
            alert('Two-Factor Authentication Enabled!');
        } catch (e) {
            setupTwoFactorError.textContent = 'Invalid code';
            setupTwoFactorError.classList.remove('hidden');
        }
    });

    updateUsernameBtn?.addEventListener('click', () => {
        const usernameInput = document.getElementById('settingsUsername') as HTMLInputElement;
        const newUsername = usernameInput.value.trim();
        if (newUsername) {
            playerNameDisplay.textContent = `Welcome, ${newUsername}!`;
            const profilePlayerName = document.getElementById('profilePlayerName');
            if (profilePlayerName) {
                profilePlayerName.textContent = newUsername;
            }
            alert('Username updated successfully!');
        }
    });

    saveSettingsBtn?.addEventListener('click', async () => {
        const user = authService.getCurrentUser();
        if (!user) {
            alert('You must be logged in to save settings');
            return;
        }

        const settings = {
            display_name: (document.getElementById('settingsUsername') as HTMLInputElement).value,
            date_of_birth: (document.getElementById('settingsDOB') as HTMLInputElement).value || undefined,
            nationality: (document.getElementById('settingsNationality') as HTMLSelectElement).value || undefined,
            phone: (document.getElementById('settingsPhone') as HTMLInputElement).value || undefined,
            gender: (document.getElementById('settingsGender') as HTMLSelectElement).value || undefined
        };

        try {
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = 'Saving...';

            await profileService.updateProfile(user.id, settings);

            // Update UI with new display name
            if (settings.display_name) {
                playerNameDisplay.textContent = `Welcome, ${settings.display_name}!`;
                const profilePlayerName = document.getElementById('profilePlayerName');
                if (profilePlayerName) {
                    profilePlayerName.textContent = settings.display_name;
                }
            }

            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings. Please try again.');
        } finally {
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.textContent = 'Save Changes';
        }
    });

    // Cancel settings - go back to game
    cancelSettingsBtn?.addEventListener('click', () => {
        showSection('game');
    });
}

// ============================================================================
// GAME FUNCTIONALITY
// ============================================================================

function startAIGame(difficulty: string): void {
    aiDifficultySelection.classList.add('hidden');
    actualGameCanvas.classList.remove('hidden');

    gameMode.textContent = `VS AI - ${difficulty.toUpperCase()}`;
    gameDifficulty.textContent = `Difficulty: ${difficulty}`;

    try {
        currentGame = new Game('gameCanvas', 'ai', difficulty as 'easy' | 'medium' | 'hard');
        currentGame.start();
    } catch (error) {
        console.error('Failed to start game:', error);
        alert('Failed to start game. Please try again.');
        actualGameCanvas.classList.add('hidden');
        gameModeSelection.classList.remove('hidden');
    }
}

function startLocalGame(mode: '1v1' | '2v2'): void {
    actualGameCanvas.classList.remove('hidden');

    if (mode === '1v1') {
        gameMode.textContent = '1v1 Local Match';
        gameDifficulty.textContent = 'P1: W/S | P2: ↑/↓';
    } else {
        gameMode.textContent = '2v2 Team Match';
        gameDifficulty.textContent = 'Left: W/S, Q/A | Right: ↑/↓, O/L';
    }

    try {
        console.log(`Starting ${mode} game`);
        currentGame = new Game('gameCanvas', mode);
        currentGame.start();
    } catch (error) {
        console.error('Failed to start game:', error);
        alert('Failed to start game. Please try again.');
        actualGameCanvas.classList.add('hidden');
        gameModeSelection.classList.remove('hidden');
    }
}

// ============================================================================
// PROFILE DATA LOADING
// ============================================================================

async function loadProfileData(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
        // Fetch fresh user profile, stats and match history in parallel
        const [userProfile, stats, matchHistory] = await Promise.all([
            profileService.fetchUserProfile(user.id),
            profileService.fetchUserStats(user.id),
            profileService.fetchMatchHistory(10)
        ]);

        // Update profile name and avatar using fresh data
        const profilePlayerName = document.getElementById('profilePlayerName');
        const profileAvatarInitials = document.getElementById('profileAvatarInitials');
        const profileAvatar = document.getElementById('profileAvatar');

        if (profilePlayerName) {
            profilePlayerName.textContent = userProfile.display_name || userProfile.username;
        }

        if (profileAvatar) {
            if (userProfile.avatar_url) {
                profileAvatar.innerHTML = `<img src="${userProfile.avatar_url}" class="w-full h-full object-cover rounded-full" alt="Avatar">`;
            } else if (profileAvatarInitials) {
                const initials = (userProfile.display_name || userProfile.username).substring(0, 2).toUpperCase();
                profileAvatar.innerHTML = `<span id="profileAvatarInitials">${initials}</span>`;
            }
        }

        // Update member since using fresh profile data
        const profileMemberSince = document.getElementById('profileMemberSince');
        if (profileMemberSince && userProfile.created_at) {
            profileMemberSince.textContent = profileService.formatMemberSince(userProfile.created_at);
        } else if (profileMemberSince) {
            profileMemberSince.textContent = 'Recently joined';
        }

        // Update stats
        const profileWinRate = document.getElementById('profileWinRate');
        const profileWinsLosses = document.getElementById('profileWinsLosses');
        const profileTotalGames = document.getElementById('profileTotalGames');
        const profileLongestStreak = document.getElementById('profileLongestStreak');

        if (profileWinRate) profileWinRate.textContent = `${stats.win_rate}%`;
        if (profileWinsLosses) profileWinsLosses.textContent = `${stats.wins}W - ${stats.losses}L`;
        if (profileTotalGames) profileTotalGames.textContent = stats.total_games.toString();
        if (profileLongestStreak) profileLongestStreak.textContent = stats.longest_streak.toString();

        // Update match history
        const profileMatchHistory = document.getElementById('profileMatchHistory');
        if (profileMatchHistory) {
            if (matchHistory.length === 0) {
                profileMatchHistory.innerHTML = `
                    <div class="text-gray-400 text-center py-4">
                        <p>No games played yet</p>
                    </div>
                `;
            } else {
                profileMatchHistory.innerHTML = matchHistory.map(game => {
                    const isWin = game.winner && game.winner.id === user.id;
                    const opponent = game.player1.id === user.id
                        ? (game.player2?.displayName || game.player2?.username || 'AI')
                        : (game.player1.displayName || game.player1.username);
                    const myScore = game.player1.id === user.id ? game.player1_score : game.player2_score;
                    const theirScore = game.player1.id === user.id ? game.player2_score : game.player1_score;

                    const bgClass = isWin ? 'bg-green-900 bg-opacity-30 border-green-500' : 'bg-red-900 bg-opacity-30 border-red-500';
                    const textClass = isWin ? 'text-green-400' : 'text-red-400';
                    const result = isWin ? 'W' : 'L';

                    return `
                        <div class="${bgClass} border rounded-lg p-4 flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <span class="${textClass} font-bold text-xl">${result}</span>
                                <div>
                                    <p class="text-white font-semibold">vs ${opponent}</p>
                                    <p class="text-gray-400 text-sm">${profileService.formatMatchDate(game.played_at)}</p>
                                </div>
                            </div>
                            <span class="text-white font-bold text-xl">${myScore} - ${theirScore}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load profile data:', error);

        // Fallback: use cached auth data for basic info
        const user = authService.getCurrentUser();
        const profilePlayerName = document.getElementById('profilePlayerName');
        const profileMemberSince = document.getElementById('profileMemberSince');
        const profileAvatar = document.getElementById('profileAvatar');

        if (profilePlayerName && user) {
            profilePlayerName.textContent = user.display_name || user.username;
        }

        if (profileMemberSince) {
            // Try to use created_at from user if available
            if (user?.created_at) {
                profileMemberSince.textContent = profileService.formatMemberSince(user.created_at);
            } else {
                profileMemberSince.textContent = 'N/A';
            }
        }

        if (profileAvatar && user) {
            if (user.avatar_url) {
                profileAvatar.innerHTML = `<img src="${user.avatar_url}" class="w-full h-full object-cover rounded-full" alt="Avatar">`;
            } else {
                const initials = (user.display_name || user.username).substring(0, 2).toUpperCase();
                profileAvatar.innerHTML = `<span>${initials}</span>`;
            }
        }

        // Set stats to show data unavailable
        const profileWinRate = document.getElementById('profileWinRate');
        const profileWinsLosses = document.getElementById('profileWinsLosses');
        const profileTotalGames = document.getElementById('profileTotalGames');
        const profileLongestStreak = document.getElementById('profileLongestStreak');
        const profileMatchHistory = document.getElementById('profileMatchHistory');

        if (profileWinRate) profileWinRate.textContent = '0%';
        if (profileWinsLosses) profileWinsLosses.textContent = '0W - 0L';
        if (profileTotalGames) profileTotalGames.textContent = '0';
        if (profileLongestStreak) profileLongestStreak.textContent = '0';
        if (profileMatchHistory) {
            profileMatchHistory.innerHTML = `
                <div class="text-gray-400 text-center py-4">
                    <p>Unable to load match history</p>
                </div>
            `;
        }
    }
}

// ============================================================================
// LEADERBOARD DATA LOADING
// ============================================================================

interface LeaderboardPlayer {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    wins: number;
    total_games: number;
    win_rate: string;
}

async function loadLeaderboard(): Promise<void> {
    const API_BASE_URL = 'https://localhost:8443/api';

    try {
        const response = await fetch(`${API_BASE_URL}/games/leaderboard?limit=10`);

        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();
        const leaderboard: LeaderboardPlayer[] = data.leaderboard || [];

        // Update Top 3 Podium
        const name1st = document.getElementById('leaderboard1stName');
        const wins1st = document.getElementById('leaderboard1stWins');
        const name2nd = document.getElementById('leaderboard2ndName');
        const wins2nd = document.getElementById('leaderboard2ndWins');
        const name3rd = document.getElementById('leaderboard3rdName');
        const wins3rd = document.getElementById('leaderboard3rdWins');

        if (leaderboard[0]) {
            if (name1st) name1st.textContent = leaderboard[0].display_name || leaderboard[0].username;
            if (wins1st) wins1st.textContent = leaderboard[0].wins.toString();
        }

        if (leaderboard[1]) {
            if (name2nd) name2nd.textContent = leaderboard[1].display_name || leaderboard[1].username;
            if (wins2nd) wins2nd.textContent = leaderboard[1].wins.toString();
        }

        if (leaderboard[2]) {
            if (name3rd) name3rd.textContent = leaderboard[2].display_name || leaderboard[2].username;
            if (wins3rd) wins3rd.textContent = leaderboard[2].wins.toString();
        }

        // Update Other Rankings (4th and beyond)
        const otherRankings = document.getElementById('leaderboardOtherRankings');
        if (otherRankings) {
            if (leaderboard.length > 3) {
                const othersHtml = leaderboard.slice(3).map((player, index) => `
                    <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition duration-300">
                        <div class="flex items-center space-x-4">
                            <span class="text-gray-400 font-bold text-lg w-8">${index + 4}</span>
                            <span class="text-white font-semibold">${player.display_name || player.username}</span>
                        </div>
                        <span class="text-purple-400 font-bold">${player.wins} wins</span>
                    </div>
                `).join('');
                otherRankings.innerHTML = othersHtml;
            } else if (leaderboard.length === 0) {
                otherRankings.innerHTML = `
                    <div class="text-gray-400 text-center py-4">
                        <p>No players yet. Play some games to rank up!</p>
                    </div>
                `;
            } else {
                otherRankings.innerHTML = `
                    <div class="text-gray-400 text-center py-4">
                        <p>Play more games to fill the rankings!</p>
                    </div>
                `;
            }
        }

    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        const otherRankings = document.getElementById('leaderboardOtherRankings');
        if (otherRankings) {
            otherRankings.innerHTML = `
                <div class="text-gray-400 text-center py-4">
                    <p>Unable to load rankings</p>
                </div>
            `;
        }
    }
}

// ============================================================================
// TOURNAMENT MANAGEMENT
// ============================================================================

function startTournament(players: string[]): void {
    tournament = {
        players: players,
        currentMatch: 0,
        semi1Winner: null,
        semi2Winner: null,
        champion: null,
        active: true
    };

    updateBracketDisplay();
    tournamentSetup.classList.add('hidden');
    tournamentBracket.classList.remove('hidden');
    updateCurrentMatchDisplay();
}

function updateBracketDisplay(): void {
    const semi1P1 = document.getElementById('semi1Player1');
    const semi1P2 = document.getElementById('semi1Player2');
    const semi2P1 = document.getElementById('semi2Player1');
    const semi2P2 = document.getElementById('semi2Player2');
    const finalP1 = document.getElementById('finalPlayer1');
    const finalP2 = document.getElementById('finalPlayer2');
    const championEl = document.getElementById('tournamentChampion');

    if (semi1P1) semi1P1.textContent = tournament.players[0] || '-';
    if (semi1P2) semi1P2.textContent = tournament.players[1] || '-';
    if (semi2P1) semi2P1.textContent = tournament.players[2] || '-';
    if (semi2P2) semi2P2.textContent = tournament.players[3] || '-';
    if (finalP1) finalP1.textContent = tournament.semi1Winner || 'TBD';
    if (finalP2) finalP2.textContent = tournament.semi2Winner || 'TBD';
    if (championEl) championEl.textContent = tournament.champion || 'TBD';
}

function updateCurrentMatchDisplay(): void {
    const display = document.getElementById('currentMatchDisplay');
    const playBtn = document.getElementById('playTournamentMatch') as HTMLButtonElement;

    if (!display) return;

    if (tournament.currentMatch === 0) {
        display.textContent = `${tournament.players[0]} vs ${tournament.players[1]}`;
    } else if (tournament.currentMatch === 1) {
        display.textContent = `${tournament.players[2]} vs ${tournament.players[3]}`;
    } else if (tournament.currentMatch === 2) {
        display.textContent = `🏆 FINAL: ${tournament.semi1Winner} vs ${tournament.semi2Winner}`;
    } else {
        display.textContent = `👑 Champion: ${tournament.champion}!`;
        if (playBtn) playBtn.classList.add('hidden');
    }
}

function playCurrentTournamentMatch(): void {
    if (!tournament.active) return;

    let player1Name: string, player2Name: string;

    if (tournament.currentMatch === 0) {
        player1Name = tournament.players[0];
        player2Name = tournament.players[1];
    } else if (tournament.currentMatch === 1) {
        player1Name = tournament.players[2];
        player2Name = tournament.players[3];
    } else if (tournament.currentMatch === 2) {
        player1Name = tournament.semi1Winner!;
        player2Name = tournament.semi2Winner!;
    } else {
        return;
    }

    tournamentBracket.classList.add('hidden');
    actualGameCanvas.classList.remove('hidden');

    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    if (currentGame) {
        currentGame.stop();
    }

    if (gameMode) gameMode.textContent = `Tournament Match ${tournament.currentMatch + 1}`;
    if (gameDifficulty) gameDifficulty.textContent = `${player1Name} vs ${player2Name}`;

    currentGame = new Game('gameCanvas', '1v1', 'medium', (winner) => {
        onTournamentMatchEnd(winner, player1Name, player2Name);
    });
    currentGame.start();
}

function onTournamentMatchEnd(winner: 'left' | 'right', player1Name: string, player2Name: string): void {
    const winnerName = winner === 'left' ? player1Name : player2Name;

    if (tournament.currentMatch === 0) {
        tournament.semi1Winner = winnerName;
        tournament.currentMatch = 1;
    } else if (tournament.currentMatch === 1) {
        tournament.semi2Winner = winnerName;
        tournament.currentMatch = 2;
    } else if (tournament.currentMatch === 2) {
        tournament.champion = winnerName;
        tournament.currentMatch = 3;
        tournament.active = false;
    }

    setTimeout(() => {
        actualGameCanvas.classList.add('hidden');
        tournamentBracket.classList.remove('hidden');
        updateBracketDisplay();
        updateCurrentMatchDisplay();

        if (tournament.champion) {
            alert(`🏆 ${tournament.champion} is the Tournament Champion! 🏆`);
        }
    }, 2000);
}

function exitTournament(): void {
    tournament = {
        players: [],
        currentMatch: 0,
        semi1Winner: null,
        semi2Winner: null,
        champion: null,
        active: false
    };

    if (currentGame) {
        currentGame.stop();
        currentGame = null;
    }

    tournamentBracket.classList.add('hidden');
    tournamentSetup.classList.add('hidden');
    actualGameCanvas.classList.add('hidden');
    gameModeSelection.classList.remove('hidden');
}

// ============================================================================
// SETTINGS DATA LOADING
// ============================================================================

async function loadSettingsData(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
        // Fetch fresh user data from API
        const profile = await profileService.fetchUserProfile(user.id);

        // Populate form fields
        const settingsUsername = document.getElementById('settingsUsername') as HTMLInputElement;
        const settingsEmail = document.getElementById('settingsEmail') as HTMLInputElement;
        const settingsDOB = document.getElementById('settingsDOB') as HTMLInputElement;
        const settingsNationality = document.getElementById('settingsNationality') as HTMLSelectElement;
        const settingsPhone = document.getElementById('settingsPhone') as HTMLInputElement;
        const settingsGender = document.getElementById('settingsGender') as HTMLSelectElement;

        if (settingsUsername) settingsUsername.value = profile.display_name || profile.username;
        if (settingsEmail) settingsEmail.value = user.email;
        if (settingsDOB && profile.date_of_birth) settingsDOB.value = profile.date_of_birth;
        if (settingsNationality && profile.nationality) settingsNationality.value = profile.nationality;
        if (settingsPhone && profile.phone) settingsPhone.value = profile.phone;
        if (settingsGender && profile.gender) settingsGender.value = profile.gender;

        // Update avatar display
        if (profile.avatar_url) {
            currentAvatar.innerHTML = `<img src="${profile.avatar_url}" class="w-24 h-24 rounded-full object-cover">`;
        }
    } catch (error) {
        console.error('Failed to load settings data:', error);
    }
}

// ============================================================================
// SECTION NAVIGATION
// ============================================================================

function showSection(section: SectionType, addToHistory: boolean = true): void {
    if (section === 'settings') {
        check2faStatus();
    }
    if (currentGame) {
        currentGame.stop();
        currentGame = null;
    }

    if (addToHistory && !isNavigating) {
        window.history.pushState({ section }, '', `#${section}`);
    }

    // Hide all sections
    welcomeSection.classList.add('hidden');
    gameContainer.classList.add('hidden');
    leaderboardSection.classList.add('hidden');
    profileSection.classList.add('hidden');
    chatSection.classList.add('hidden');
    settingsSection.classList.add('hidden');

    // Reset game UI
    gameModeSelection.classList.remove('hidden');
    aiDifficultySelection.classList.add('hidden');
    actualGameCanvas.classList.add('hidden');
    tournamentSetup.classList.add('hidden');
    tournamentBracket.classList.add('hidden');

    (document.getElementById('player1Score') as HTMLElement).textContent = '0';
    (document.getElementById('player2Score') as HTMLElement).textContent = '0';

    // Show selected section
    switch (section) {
        case 'game':
            gameContainer.classList.remove('hidden');
            break;
        case 'leaderboard':
            leaderboardSection.classList.remove('hidden');
            setTimeout(() => {
                loadLeaderboard();
            }, 1000);
            break;
        case 'profile':
            profileSection.classList.remove('hidden');
            loadProfileData();
            break;
        case 'chat':
            chatSection.classList.remove('hidden');
            loadSocialData();
            break;
        case 'settings':
            settingsSection.classList.remove('hidden');
            loadSettingsData();
            break;
        case 'welcome':
            welcomeSection.classList.remove('hidden');
            break;
    }
}

// ============================================================================
// BROWSER HISTORY HANDLING
// ============================================================================

window.addEventListener('popstate', (event) => {
    isNavigating = true;
    if (event.state && event.state.section) {
        showSection(event.state.section as SectionType, false);
    } else {
        showSection('welcome', false);
    }
    isNavigating = false;
});

window.addEventListener('load', () => {
    if (!window.location.hash) {
        window.history.replaceState({ section: 'welcome' }, '', '#welcome');
    }
});

// ============================================================================
// START APPLICATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function check2faStatus() {
    try {
        const status = await authService.get2faStatus();
        update2faButton(status.enabled);
    } catch (e) { console.error(e); }
}

function update2faButton(enabled: boolean) {
    if (enabled) {
        toggle2faBtn.textContent = 'Disable 2FA';
        toggle2faBtn.classList.replace('bg-purple-600', 'bg-red-600');
        toggle2faBtn.classList.replace('hover:bg-purple-700', 'hover:bg-red-700');
    } else {
        toggle2faBtn.textContent = 'Enable 2FA';
        toggle2faBtn.classList.replace('bg-red-600', 'bg-purple-600');
        toggle2faBtn.classList.replace('hover:bg-red-700', 'hover:bg-purple-700');
    }
}