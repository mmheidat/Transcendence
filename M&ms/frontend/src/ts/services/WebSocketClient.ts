export class WebSocketClient {
    private ws: WebSocket | null = null;
    private listeners = new Map<string, Function[]>();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 2000;
    private reconnectTimer: number | null = null;
    private url: string = '';
    private token: string = '';
    private intentionallyClosed = false;

    constructor() {
        console.log('WebSocketClient initialized');
    }

    /**
     * Connect to WebSocket server with JWT authentication
     */
    connect(token?: string): void {
        if (token) {
            this.token = token;
        } else {
            // Get token from localStorage if not provided
            this.token = localStorage.getItem('auth_token') || '';
        }

        if (!this.token) {
            console.error('No authentication token available for WebSocket');
            return;
        }

        this.intentionallyClosed = false;
        this.url = `wss://localhost:8443/api/chat/ws?token=${this.token}`;

        try {
            this.ws = new WebSocket(this.url);
            this.setupEventHandlers();
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Setup WebSocket event handlers
     */
    private setupEventHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.emit('connected', {});
        };

        this.ws.onmessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);
                console.log('WebSocket message received:', message.type);
                
                // Emit event based on message type
                if (message.type) {
                    this.emit(message.type, message);
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.emit('error', { error });
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            this.emit('disconnected', { code: event.code, reason: event.reason });
            
            // Attempt to reconnect if not intentionally closed
            if (!this.intentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.scheduleReconnect();
            }
        };
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        
        console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = window.setTimeout(() => {
            console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
            this.connect();
        }, delay);
    }

    /**
     * Send message to WebSocket server
     */
    send(type: string, payload: object = {}): void {
        console.log('send() called - type:', type, 'payload:', payload);
        console.log('WebSocket state:', this.ws ? this.ws.readyState : 'null', '(OPEN=1)');
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket is not connected - readyState:', this.ws?.readyState);
            this.emit('error', { error: 'WebSocket not connected' });
            return;
        }

        try {
            const message = JSON.stringify({ type, ...payload });
            console.log('Sending WebSocket message:', message);
            this.ws.send(message);
            console.log('WebSocket message sent successfully:', type);
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
            this.emit('error', { error: 'Failed to send message' });
        }
    }

    /**
     * Register event listener
     */
    on(type: string, callback: Function): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(callback);
    }

    /**
     * Remove event listener
     */
    off(type: string, callback?: Function): void {
        if (!callback) {
            // Remove all listeners for this type
            this.listeners.delete(type);
        } else {
            // Remove specific listener
            const callbacks = this.listeners.get(type);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        }
    }

    /**
     * Emit event to all registered listeners
     */
    private emit(type: string, data: any): void {
        const callbacks = this.listeners.get(type);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in WebSocket listener for ${type}:`, error);
                }
            });
        }
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Close WebSocket connection
     */
    disconnect(): void {
        this.intentionallyClosed = true;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.listeners.clear();
        console.log('WebSocket disconnected');
    }

    /**
     * Update authentication token
     */
    updateToken(token: string): void {
        this.token = token;
        // Reconnect with new token if already connected
        if (this.isConnected()) {
            this.disconnect();
            this.connect(token);
        }
    }
}

// Singleton instance
export const wsClient = new WebSocketClient();
