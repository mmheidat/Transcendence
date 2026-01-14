import { getWebSocketUrl } from '../config.js';

const WS_URL = getWebSocketUrl('/chat/ws');

export interface GameInvite {
    id: string;
    from_user_id: number;
    from_username: string;
    to_user_id: number;
    created_at: string;
}

export interface GameState {
    ball_x: number;
    ball_y: number;
    ball_dx: number;
    ball_dy: number;
    left_paddle_y: number;
    right_paddle_y: number;
    left_score: number;
    right_score: number;
}

type MessageHandler = (data: any) => void;

export class GameSocketService {
    private static instance: GameSocketService;
    private ws: WebSocket | null = null;
    private handlers: Map<string, MessageHandler[]> = new Map();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private pendingInvites: GameInvite[] = [];
    private currentGameId: string | null = null;
    private isHost: boolean = false;
    private isConnecting: boolean = false;
    private intentionalClose: boolean = false;
    private pingInterval: any = null;

    private constructor() { }

    static getInstance(): GameSocketService {
        if (!GameSocketService.instance) {
            GameSocketService.instance = new GameSocketService();
        }
        return GameSocketService.instance;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                reject(new Error('No auth token'));
                return;
            }

            // Already connected
            if (this.ws?.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }

            // Already connecting
            if (this.isConnecting) {
                // Wait for current connection attempt
                const checkConnection = setInterval(() => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        clearInterval(checkConnection);
                        resolve();
                    }
                }, 100);
                return;
            }

            this.isConnecting = true;
            this.intentionalClose = false;
            this.ws = new WebSocket(`${WS_URL}?token=${token}`);

            this.ws.onopen = () => {
                console.log('🎮 GameSocket connected');
                this.reconnectAttempts = 0;
                this.isConnecting = false;

                // Start ping to keep connection alive
                this.startPing();
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

            this.ws.onclose = () => {
                console.log('🎮 GameSocket disconnected');
                this.isConnecting = false;
                this.stopPing();

                // Only reconnect if not intentionally closed
                if (!this.intentionalClose) {
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('🎮 GameSocket error:', error);
                this.isConnecting = false;
            };
        });
    }

    private startPing(): void {
        this.stopPing();
        // Send ping every 30 seconds to keep connection alive
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    }

    private stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(2000 * this.reconnectAttempts, 10000);
            console.log(`🎮 Reconnecting... attempt ${this.reconnectAttempts} in ${delay}ms`);
            setTimeout(() => {
                if (!this.intentionalClose) {
                    this.connect().catch(() => { });
                }
            }, delay);
        } else {
            console.log('🎮 Max reconnection attempts reached');
        }
    }

    private handleMessage(message: { type: string;[key: string]: any }): void {
        const handlers = this.handlers.get(message.type);
        if (handlers) {
            handlers.forEach(handler => handler(message));
        }

        // Built-in handlers for game events
        switch (message.type) {
            case 'game_invite':
                this.pendingInvites.push(message.invite);
                break;
            case 'game_invite_accepted':
                this.currentGameId = message.game_id;
                this.isHost = message.is_host;
                break;
            case 'game_invite_declined':
                console.log('Game invite was declined');
                break;
        }
    }

    on(eventType: string, handler: MessageHandler): void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(handler);
    }

    off(eventType: string, handler: MessageHandler): void {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    // Send a game invite to another user
    sendGameInvite(toUserId: number): void {
        console.log('🎮 Sending game invite to user:', toUserId);
        this.send({
            type: 'game_invite',
            to_user_id: toUserId
        });
    }

    // Accept a game invite
    acceptInvite(inviteId: string): void {
        this.send({
            type: 'game_invite_accept',
            invite_id: inviteId
        });
    }

    // Decline a game invite
    declineInvite(inviteId: string): void {
        this.send({
            type: 'game_invite_decline',
            invite_id: inviteId
        });
    }

    // Send paddle position update during game
    sendPaddleUpdate(paddleY: number): void {
        if (!this.currentGameId) return;
        this.send({
            type: 'game_paddle_update',
            game_id: this.currentGameId,
            paddle_y: paddleY
        });
    }

    // Send full game state (host only)
    sendGameState(state: GameState): void {
        if (!this.currentGameId || !this.isHost) return;
        this.send({
            type: 'game_state',
            game_id: this.currentGameId,
            state: state
        });
    }

    // Send game end notification
    sendGameEnd(winnerId: number, leftScore: number, rightScore: number): void {
        if (!this.currentGameId) return;
        this.send({
            type: 'game_end',
            game_id: this.currentGameId,
            winner_id: winnerId,
            left_score: leftScore,
            right_score: rightScore
        });
    }

    private send(data: object): void {
        console.log('🎮 GameSocket sending:', data, 'readyState:', this.ws?.readyState);
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            console.log('🎮 GameSocket message sent successfully');
        } else {
            console.error('🎮 WebSocket not connected, readyState:', this.ws?.readyState);
        }
    }

    getPendingInvites(): GameInvite[] {
        return [...this.pendingInvites];
    }

    clearInvite(inviteId: string): void {
        this.pendingInvites = this.pendingInvites.filter(inv => inv.id !== inviteId);
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    isGameHost(): boolean {
        return this.isHost;
    }

    getCurrentGameId(): string | null {
        return this.currentGameId;
    }

    setCurrentGame(gameId: string, isHost: boolean): void {
        this.currentGameId = gameId;
        this.isHost = isHost;
    }

    endCurrentGame(): void {
        this.currentGameId = null;
        this.isHost = false;
    }

    disconnect(): void {
        this.intentionalClose = true;
        this.stopPing();
        this.reconnectAttempts = 0;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
