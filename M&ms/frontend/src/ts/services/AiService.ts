const API_BASE_URL = 'https://localhost:8443/api/chat/ai';

export interface AiConversation {
    id: number;
    userId: number;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages?: AiMessage[];
}

export interface AiMessage {
    id: number;
    conversationId: number;
    role: 'user' | 'assistant';
    content: string;
    tokens?: number;
    createdAt: string;
}

export interface CreateConversationRequest {
    title?: string;
}

export interface UpdateConversationRequest {
    title?: string;
}

export class AiService {
    private static instance: AiService;

    private constructor() {
        console.log('AiService initialized');
    }

    public static getInstance(): AiService {
        if (!AiService.instance) {
            AiService.instance = new AiService();
        }
        return AiService.instance;
    }

    /**
     * Get authentication headers
     */
    private getHeaders(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    /**
     * Get all conversations for current user
     */
    async getConversations(): Promise<AiConversation[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch conversations: ${response.statusText}`);
            }

            const data = await response.json();
            const conversations = data.conversations || [];
            // Backend returns snake_case, convert to camelCase
            return conversations.map((conv: any) => ({
                id: conv.id,
                userId: conv.user_id || 0,
                title: conv.title,
                createdAt: conv.created_at,
                updatedAt: conv.updated_at,
                messages: conv.messages
            }));
        } catch (error) {
            console.error('Error fetching conversations:', error);
            throw error;
        }
    }

    /**
     * Get a specific conversation with all its messages
     */
    async getConversation(conversationId: number): Promise<AiConversation> {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch conversation: ${response.statusText}`);
            }

            const data = await response.json();
            // Backend returns snake_case, convert to camelCase
            return {
                id: data.id,
                userId: data.user_id || 0,
                title: data.title,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                messages: (data.messages || []).map((msg: any) => ({
                    id: msg.id,
                    conversationId: msg.conversation_id,
                    role: msg.role,
                    content: msg.content,
                    tokens: msg.tokens,
                    createdAt: msg.created_at
                }))
            };
        } catch (error) {
            console.error('Error fetching conversation:', error);
            throw error;
        }
    }

    /**
     * Create a new conversation
     */
    async createConversation(title?: string): Promise<AiConversation> {
        try {
            const body: CreateConversationRequest = {};
            if (title) {
                body.title = title;
            }

            const response = await fetch(`${API_BASE_URL}/conversations`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error(`Failed to create conversation: ${response.statusText}`);
            }

            const data = await response.json();
            // Backend returns snake_case, convert to camelCase
            return {
                id: data.id,
                userId: data.user_id || 0,
                title: data.title,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error creating conversation:', error);
            throw error;
        }
    }

    /**
     * Update conversation (e.g., change title)
     */
    async updateConversation(conversationId: number, updates: UpdateConversationRequest): Promise<AiConversation> {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                throw new Error(`Failed to update conversation: ${response.statusText}`);
            }

            const data = await response.json();
            // Backend returns snake_case, convert to camelCase
            return {
                id: data.id,
                userId: data.user_id || 0,
                title: data.title,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error updating conversation:', error);
            throw error;
        }
    }

    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId: number): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to delete conversation: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error deleting conversation:', error);
            throw error;
        }
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId: number): Promise<AiMessage[]> {
        try {
            const conversation = await this.getConversation(conversationId);
            return conversation.messages || [];
        } catch (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }
    }
}

export const aiService = AiService.getInstance();
