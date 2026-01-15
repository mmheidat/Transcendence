import { aiService, AiConversation, AiMessage } from '../services/AiService.js';
import { wsClient } from '../services/WebSocketClient.js';

export class AiAssistantPage {
    private currentConversation: number | null = null;
    private conversations: AiConversation[] = [];
    private messages: AiMessage[] = [];
    private streaming: boolean = false;
    private currentStreamBuffer: string = '';
    private initialized: boolean = false;
    
    // Streaming metrics
    private chunkCounter: number = 0;
    private firstChunkTime: number | null = null;
    private requestStartTime: number | null = null;

    // DOM elements
    private conversationListEl: HTMLElement | null = null;
    private aiMessagesEl: HTMLElement | null = null;
    private aiPromptEl: HTMLTextAreaElement | null = null;
    private aiSendBtn: HTMLButtonElement | null = null;
    private aiStopBtn: HTMLButtonElement | null = null;
    private newConversationBtn: HTMLButtonElement | null = null;

    constructor() {
        console.log('AiAssistantPage created');
    }

    /**
     * Initialize the AI Assistant page
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('AiAssistantPage already initialized');
            return;
        }

        console.log('Initializing AiAssistantPage...');
        
        // Get DOM elements
        this.conversationListEl = document.getElementById('conversation-list');
        this.aiMessagesEl = document.getElementById('ai-messages');
        this.aiPromptEl = document.getElementById('ai-prompt') as HTMLTextAreaElement;
        this.aiSendBtn = document.getElementById('ai-send') as HTMLButtonElement;
        this.aiStopBtn = document.getElementById('ai-stop') as HTMLButtonElement;
        this.newConversationBtn = document.getElementById('new-conversation') as HTMLButtonElement;

        // Setup event handlers
        this.setupEventHandlers();
        
        // Setup WebSocket handlers
        this.setupWebSocket();

        // Connect WebSocket if not already connected
        if (!wsClient.isConnected()) {
            wsClient.connect();
        }

        // Load conversations
        await this.loadConversations();

        this.initialized = true;
        console.log('AiAssistantPage initialized');
    }

    /**
     * Setup WebSocket event handlers
     */
    private setupWebSocket(): void {
        // Handle streaming delta events
        wsClient.on('aiDelta', (data: any) => {
            console.log('📥 aiDelta received:', data.delta?.length, 'chars, conversationId:', data.conversationId);
            
            if (data.conversationId === this.currentConversation) {
                this.chunkCounter++;
                
                // Track first chunk timing
                if (this.chunkCounter === 1) {
                    this.firstChunkTime = Date.now();
                    const latency = this.requestStartTime ? this.firstChunkTime - this.requestStartTime : 0;
                    console.log(`✅ FIRST CHUNK arrived after ${latency}ms (First Token Latency)`);
                    
                    // Update status indicator
                    const statusEl = document.querySelector('.streaming-status');
                    if (statusEl) {
                        statusEl.textContent = `🚀 Streaming... (Chunk #${this.chunkCounter})`;
                    }
                } else {
                    // Update chunk counter
                    const statusEl = document.querySelector('.streaming-status');
                    if (statusEl) {
                        statusEl.textContent = `🚀 Streaming... (Chunk #${this.chunkCounter})`;
                    }
                    console.log(`📦 Chunk #${this.chunkCounter} received`);
                }
                
                this.currentStreamBuffer += data.delta;
                console.log('📝 Buffer now:', this.currentStreamBuffer.length, 'chars');
                this.renderStreamingMessage(this.currentStreamBuffer);
            } else {
                console.log('⚠️ Delta for different conversation, ignoring');
            }
        });

        // Handle completion events
        wsClient.on('aiDone', (data: any) => {
            if (data.conversationId === this.currentConversation) {
                const totalTime = this.requestStartTime ? Date.now() - this.requestStartTime : 0;
                console.log(`✅ Streaming COMPLETE! Total chunks: ${this.chunkCounter}, Total time: ${totalTime}ms`);
                
                this.streaming = false;
                this.finalizeMessage(data.messageId, this.currentStreamBuffer);
                this.currentStreamBuffer = '';
                this.updateButtons();
                
                // Reset counters
                this.chunkCounter = 0;
                this.firstChunkTime = null;
                this.requestStartTime = null;
            }
        });

        // Handle error events
        wsClient.on('aiError', (data: any) => {
            if (data.conversationId === this.currentConversation || !data.conversationId) {
                this.streaming = false;
                
                // If streaming message exists with thinking animation, show stopped state first
                const streamingEl = document.getElementById('streaming-message');
                if (streamingEl && streamingEl.querySelector('.streaming-status')) {
                    this.showStoppedState();
                } else {
                    this.showError(data.error, data.code);
                }
                
                this.updateButtons();
            }
        });

        // Handle connection events
        wsClient.on('connected', () => {
            console.log('WebSocket connected in AI Assistant');
        });

        wsClient.on('disconnected', () => {
            console.log('WebSocket disconnected in AI Assistant');
        });
    }

    /**
     * Setup UI event handlers
     */
    private setupEventHandlers(): void {
        // Send button
        this.aiSendBtn?.addEventListener('click', () => {
            this.sendPrompt();
        });

        // Enter key to send (Shift+Enter for new line)
        this.aiPromptEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendPrompt();
            }
        });

        // Stop button
        this.aiStopBtn?.addEventListener('click', () => {
            this.cancelStream();
        });

        // New conversation button
        this.newConversationBtn?.addEventListener('click', async () => {
            await this.createNewConversation();
        });
    }

    /**
     * Load all conversations
     */
    async loadConversations(): Promise<void> {
        try {
            this.conversations = await aiService.getConversations();
            this.renderConversationList();

            // Auto-select first conversation or show empty state
            if (this.conversations.length > 0 && !this.currentConversation) {
                await this.selectConversation(this.conversations[0].id);
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            this.showError('Failed to load conversations', 'LOAD_ERROR');
        }
    }

    /**
     * Render conversation list in sidebar
     */
    private renderConversationList(): void {
        if (!this.conversationListEl) return;

        if (this.conversations.length === 0) {
            this.conversationListEl.innerHTML = `
                <div class="text-gray-400 text-sm p-4 text-center">
                    No conversations yet.<br>Start a new chat!
                </div>
            `;
            return;
        }

        this.conversationListEl.innerHTML = this.conversations.map(conv => `
            <div class="conversation-item ${conv.id === this.currentConversation ? 'active' : ''}" 
                 data-id="${conv.id}">
                <div class="conversation-title">${this.escapeHtml(conv.title)}</div>
                <div class="conversation-date">${this.formatDate(conv.updatedAt)}</div>
            </div>
        `).join('');

        // Add click handlers
        const items = this.conversationListEl.querySelectorAll('.conversation-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id') || '0');
                this.selectConversation(id);
            });
        });
    }

    /**
     * Select and load a conversation
     */
    async selectConversation(conversationId: number): Promise<void> {
        try {
            this.currentConversation = conversationId;
            
            // Load messages
            const conversation = await aiService.getConversation(conversationId);
            this.messages = conversation.messages || [];
            
            // Render messages
            this.renderMessages();
            
            // Update UI
            this.renderConversationList();
        } catch (error) {
            console.error('Failed to select conversation:', error);
            this.showError('Failed to load conversation', 'LOAD_ERROR');
        }
    }

    /**
     * Create new conversation
     */
    async createNewConversation(): Promise<void> {
        try {
            const conversation = await aiService.createConversation('New Conversation');
            this.conversations.unshift(conversation);
            await this.selectConversation(conversation.id);
        } catch (error) {
            console.error('Failed to create conversation:', error);
            this.showError('Failed to create conversation', 'CREATE_ERROR');
        }
    }

    /**
     * Send prompt to AI
     */
    async sendPrompt(): Promise<void> {
        const prompt = this.aiPromptEl?.value.trim();
        
        console.log('sendPrompt() called with prompt:', prompt);
        
        if (!prompt) {
            console.log('Empty prompt, returning');
            return;
        }

        if (this.streaming) {
            console.log('Already streaming, showing error');
            this.showError('Please wait for current response to complete', 'BUSY');
            return;
        }

        // Create conversation if none selected
        if (!this.currentConversation) {
            console.log('No conversation selected, creating new one');
            await this.createNewConversation();
            if (!this.currentConversation) {
                this.showError('Failed to create conversation', 'CREATE_ERROR');
                return;
            }
        }

        console.log('Current conversation ID:', this.currentConversation);

        // Clear input
        if (this.aiPromptEl) {
            this.aiPromptEl.value = '';
        }

        // Add user message to UI
        this.addUserMessage(prompt);

        // Set streaming state
        this.streaming = true;
        this.currentStreamBuffer = '';
        this.updateButtons();

        // Check WebSocket connection
        console.log('WebSocket connected?', wsClient.isConnected());
        
        // Track request start time
        this.requestStartTime = Date.now();
        console.log('⏱️ Request sent at:', new Date().toISOString());
        
        // Send via WebSocket
        console.log('Calling wsClient.send() with aiPrompt...');
        wsClient.send('aiPrompt', {
            conversationId: this.currentConversation,
            prompt: prompt
        });
        console.log('wsClient.send() completed');

        // Add placeholder for streaming response
        this.addStreamingPlaceholder();
    }

    /**
     * Cancel current stream
     */
    cancelStream(): void {
        if (!this.streaming || !this.currentConversation) {
            return;
        }

        wsClient.send('aiCancel', {
            conversationId: this.currentConversation
        });

        this.streaming = false;
        this.showStoppedState();
        this.updateButtons();
    }

    /**
     * Add user message to UI
     */
    private addUserMessage(content: string): void {
        const messageEl = document.createElement('div');
        messageEl.className = 'ai-message user';
        messageEl.innerHTML = `
            <div class="message-content">${this.escapeHtml(content)}</div>
        `;
        this.aiMessagesEl?.appendChild(messageEl);
        this.scrollToBottom();
    }

    /**
     * Add streaming placeholder
     */
    private addStreamingPlaceholder(): void {
        const messageEl = document.createElement('div');
        messageEl.className = 'ai-message assistant streaming';
        messageEl.id = 'streaming-message';
        messageEl.innerHTML = `
            <div class="streaming-status">
                <div class="thinking-animation">
                    <div class="pong-ball"></div>
                    <span class="thinking-text">Pong AI Thinking</span>
                    <div class="thinking-dots">
                        <span>.</span><span>.</span><span>.</span>
                    </div>
                </div>
            </div>
            <div class="message-content"></div>
        `;
        this.aiMessagesEl?.appendChild(messageEl);
        this.scrollToBottom();
    }

    /**
     * Render streaming message with current buffer
     */
    private renderStreamingMessage(content: string): void {
        const streamingEl = document.getElementById('streaming-message');
        if (streamingEl) {
            const contentEl = streamingEl.querySelector('.message-content') as HTMLElement;
            if (contentEl) {
                // Remove the thinking animation once content starts arriving
                const statusEl = streamingEl.querySelector('.streaming-status');
                if (statusEl && content.length > 0) {
                    statusEl.remove();
                }
                // Use innerHTML to preserve markdown/formatting without cursor
                contentEl.innerHTML = this.escapeHtml(content);
                this.scrollToBottom();
            }
        }
    }

    /**
     * Finalize message after streaming completes
     */
    private finalizeMessage(messageId: number, content: string): void {
        const streamingEl = document.getElementById('streaming-message');
        if (streamingEl) {
            streamingEl.className = 'ai-message assistant';
            streamingEl.removeAttribute('id');
            
            const contentEl = streamingEl.querySelector('.message-content');
            if (contentEl) {
                contentEl.textContent = content;
            }
        }

        // Add to messages array
        this.messages.push({
            id: messageId,
            conversationId: this.currentConversation!,
            role: 'assistant',
            content: content,
            createdAt: new Date().toISOString()
        });

        this.scrollToBottom();
    }

    /**
     * Show stopped state when user cancels or error occurs during thinking
     */
    private showStoppedState(): void {
        const streamingEl = document.getElementById('streaming-message');
        if (!streamingEl) return;

        const statusEl = streamingEl.querySelector('.streaming-status');
        if (!statusEl) {
            // Already streaming content, just remove the message
            streamingEl.remove();
            return;
        }

        // Update to stopped state
        statusEl.innerHTML = `
            <div class="thinking-animation stopped">
                <div class="pong-ball stopped"></div>
                <span class="thinking-text stopped">Pong AI Stopped</span>
            </div>
        `;

        // Fade out and remove after 1.5 seconds
        setTimeout(() => {
            streamingEl.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
            streamingEl.style.opacity = '0';
            streamingEl.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                streamingEl.remove();
            }, 500);
        }, 1000);
    }

    /**
     * Render all messages
     */
    private renderMessages(): void {
        if (!this.aiMessagesEl) return;

        this.aiMessagesEl.innerHTML = this.messages.map(msg => `
            <div class="ai-message ${msg.role}">
                <div class="message-content">${this.escapeHtml(msg.content)}</div>
            </div>
        `).join('');

        this.scrollToBottom();
    }

    /**
     * Show error message
     */
    private showError(error: string, code?: string): void {
        const messageEl = document.createElement('div');
        messageEl.className = 'ai-message error';
        messageEl.innerHTML = `
            <div class="message-content">
                <strong>Error:</strong> ${this.escapeHtml(error)}
                ${code ? `<br><small>Code: ${code}</small>` : ''}
            </div>
        `;
        this.aiMessagesEl?.appendChild(messageEl);
        this.scrollToBottom();

        // Auto-remove error after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    /**
     * Update button states based on streaming state
     */
    private updateButtons(): void {
        if (this.streaming) {
            this.aiSendBtn?.classList.add('hidden');
            this.aiStopBtn?.classList.remove('hidden');
            if (this.aiPromptEl) {
                this.aiPromptEl.disabled = true;
            }
        } else {
            this.aiSendBtn?.classList.remove('hidden');
            this.aiStopBtn?.classList.add('hidden');
            if (this.aiPromptEl) {
                this.aiPromptEl.disabled = false;
            }
        }
    }

    /**
     * Scroll messages to bottom
     */
    private scrollToBottom(): void {
        if (this.aiMessagesEl) {
            this.aiMessagesEl.scrollTop = this.aiMessagesEl.scrollHeight;
        }
    }

    /**
     * Format date for display
     */
    private formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cleanup when leaving page
     */
    cleanup(): void {
        this.streaming = false;
        this.currentConversation = null;
        this.currentStreamBuffer = '';
        console.log('AiAssistantPage cleaned up');
    }
}

// Export singleton instance
export const aiAssistantPage = new AiAssistantPage();
