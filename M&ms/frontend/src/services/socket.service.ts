import { EventEmitter } from './EventEmitter'; // We need a simple event emitter
import { authService } from './auth.service';
import { getWebSocketUrl } from '../config';

class WebSocketClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private reconnectTimer: number | null = null;
    private reconnectAttempts = 0;
    private isConnecting = false;

    constructor() {
        super();
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    connect() {
        // Prevent multiple connections
        if (this.isConnecting || this.isConnected()) {
            return;
        }

        const token = authService.getToken();
        if (!token) return;

        this.isConnecting = true;
        const url = `${getWebSocketUrl()}?token=${token}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.isConnecting = false;
            this.emit('connected', {});
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type) {
                    this.emit(message.type, message);
                }
            } catch (e) {
                console.error(e);
            }
        };

        this.ws.onclose = () => {
            this.isConnecting = false;
            this.emit('disconnected', {});
            this.reconnect();
        };

        this.ws.onerror = (e) => {
            console.error('WS Error', e);
            this.isConnecting = false;
        };
    }

    reconnect() {
        if (this.reconnectAttempts > 5 || !this.ws) return; // Don't reconnect if explicitly disconnected (ws is null)
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, 3000);
    }

    disconnect() {
        if (this.ws) {
            this.ws.onclose = null; // Prevent reconnection logic from firing
            this.ws.close();
            this.ws = null;
            this.isConnecting = false;
            this.emit('disconnected', {});
        }
    }

    send(type: string, payload: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, ...payload }));
        }
    }

    // Game specific methods
    sendGameInvite(userId: number) {
        this.send('game_invite', { to_user_id: userId });
    }

    acceptInvite(inviteId: string) {
        this.send('game_invite_accept', { invite_id: inviteId });
    }

    declineInvite(inviteId: string) {
        this.send('game_invite_decline', { invite_id: inviteId });
    }

    sendPaddleUpdate(gameId: string, paddleY: number) {
        this.send('game_paddle_update', { game_id: gameId, paddle_y: paddleY });
    }

    sendGameState(gameId: string, state: any) {
        this.send('game_state', { game_id: gameId, state });
    }

    sendGameEnd(gameId: string, winnerInfo: number | string, leftScore: number, rightScore: number) {
        const payload: any = {
            game_id: gameId,
            left_score: leftScore,
            right_score: rightScore
        };

        if (typeof winnerInfo === 'number') {
            payload.winner_id = winnerInfo;
        } else {
            payload.winner_side = winnerInfo;
        }

        this.send('game_end', payload);
    }

    sendGamePause(gameId: string) {
        this.send('game_pause', { game_id: gameId });
    }

    sendGameResume(gameId: string) {
        this.send('game_resume', { game_id: gameId });
    }

    sendGameLeave(gameId: string) {
        this.send('game_leave', { game_id: gameId });
    }

}


export const wsClient = new WebSocketClient();
