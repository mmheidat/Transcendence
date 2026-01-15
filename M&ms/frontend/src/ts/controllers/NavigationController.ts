// Navigation controller for section switching and browser history

export type SectionType = 'game' | 'leaderboard' | 'profile' | 'chat' | 'ai-assistant' | 'settings' | 'welcome';

export class NavigationController {
    private isNavigating = false;
    private onSectionChange: ((section: SectionType) => void) | null = null;

    // DOM elements
    private welcomeSection: HTMLElement | null;
    private gameContainer: HTMLElement | null;
    private leaderboardSection: HTMLElement | null;
    private profileSection: HTMLElement | null;
    private chatSection: HTMLElement | null;
    private aiAssistantSection: HTMLElement | null;
    private settingsSection: HTMLElement | null;
    private gameModeSelection: HTMLElement | null;
    private aiDifficultySelection: HTMLElement | null;
    private actualGameCanvas: HTMLElement | null;
    private tournamentSetup: HTMLElement | null;
    private tournamentBracket: HTMLElement | null;

    constructor() {
        this.welcomeSection = document.getElementById('welcomeSection');
        this.gameContainer = document.getElementById('game-container');
        this.leaderboardSection = document.getElementById('leaderboardSection');
        this.profileSection = document.getElementById('profileSection');
        this.aiAssistantSection = document.getElementById('aiAssistantSection');
        this.chatSection = document.getElementById('chatSection');
        this.settingsSection = document.getElementById('settingsSection');
        this.gameModeSelection = document.getElementById('gameModeSelection');
        this.aiDifficultySelection = document.getElementById('aiDifficultySelection');
        this.actualGameCanvas = document.getElementById('actualGameCanvas');
        this.tournamentSetup = document.getElementById('tournamentSetup');
        this.tournamentBracket = document.getElementById('tournamentBracket');

        this.setupHistoryListeners();
    }

    setOnSectionChange(callback: (section: SectionType) => void): void {
        this.onSectionChange = callback;
    }

    private setupHistoryListeners(): void {
        window.addEventListener('popstate', (event) => {
            this.isNavigating = true;
            if (event.state && event.state.section) {
                this.showSection(event.state.section as SectionType, false);
            } else {
                this.showSection('welcome', false);
            }
            this.isNavigating = false;
        });

        window.addEventListener('load', () => {
            if (!window.location.hash) {
                window.history.replaceState({ section: 'welcome' }, '', '#welcome');
            }
        });
    }

    showSection(section: SectionType, addToHistory: boolean = true): void {
        if (addToHistory && !this.isNavigating) {
            window.history.pushState({ section }, '', `#${section}`);
        }

        // Hide all sections
        this.welcomeSection?.classList.add('hidden');
        this.gameContainer?.classList.add('hidden');
        this.leaderboardSection?.classList.add('hidden');
        this.profileSection?.classList.add('hidden');
        this.chatSection?.classList.add('hidden');
        this.aiAssistantSection?.classList.add('hidden');
        this.settingsSection?.classList.add('hidden');

        // Reset game UI
        this.gameModeSelection?.classList.remove('hidden');
        this.aiDifficultySelection?.classList.add('hidden');
        this.actualGameCanvas?.classList.add('hidden');
        this.tournamentSetup?.classList.add('hidden');
        this.tournamentBracket?.classList.add('hidden');

        const player1Score = document.getElementById('player1Score');
        const player2Score = document.getElementById('player2Score');
        if (player1Score) player1Score.textContent = '0';
        if (player2Score) player2Score.textContent = '0';

        // Show selected section
        switch (section) {
            case 'game':
                this.gameContainer?.classList.remove('hidden');
                break;
            case 'leaderboard':
                this.leaderboardSection?.classList.remove('hidden');
                break;
            case 'profile':
                this.profileSection?.classList.remove('hidden');
                break;
            case 'chat':
                this.chatSection?.classList.remove('hidden');
                break;
            case 'ai-assistant':
                this.aiAssistantSection?.classList.remove('hidden');
                break;
            case 'settings':
                this.settingsSection?.classList.remove('hidden');
                break;
            case 'welcome':
                this.welcomeSection?.classList.remove('hidden');
                break;
        }

        // Notify callback for section-specific loading
        if (this.onSectionChange) {
            this.onSectionChange(section);
        }
    }

    getGameModeSelection(): HTMLElement | null {
        return this.gameModeSelection;
    }

    getAiDifficultySelection(): HTMLElement | null {
        return this.aiDifficultySelection;
    }

    getActualGameCanvas(): HTMLElement | null {
        return this.actualGameCanvas;
    }

    getTournamentSetup(): HTMLElement | null {
        return this.tournamentSetup;
    }

    getTournamentBracket(): HTMLElement | null {
        return this.tournamentBracket;
    }
}
