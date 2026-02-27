import { API_BASE_URL } from '../config';
import { authService } from './auth.service';

const AI_API_URL = `${API_BASE_URL}/chat/ai`;

export interface AiMessage {
    id: number;
    conversationId: number;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export interface AiConversation {
    id: number;
    title: string;
    updatedAt: string;
    messages?: AiMessage[];
}

class AiService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    async getConversations(): Promise<AiConversation[]> {
        const response = await fetch(`${AI_API_URL}/conversations`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch conversations');
        const data = await response.json();
        return (data.conversations || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            updatedAt: c.updated_at
        }));
    }

    async createConversation(title?: string): Promise<AiConversation> {
        const response = await fetch(`${AI_API_URL}/conversations`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ title })
        });
        if (!response.ok) throw new Error('Failed to create conversation');
        const data = await response.json();
        return {
            id: data.id,
            title: data.title,
            updatedAt: data.created_at
        };
    }

    async getConversation(id: number): Promise<AiConversation> {
        const response = await fetch(`${AI_API_URL}/conversations/${id}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch conversation');
        const data = await response.json();
        return {
            id: data.id,
            title: data.title,
            updatedAt: data.updated_at,
            messages: (data.messages || []).map((m: any) => ({
                id: m.id,
                conversationId: m.conversation_id,
                role: m.role,
                content: m.content,
                createdAt: m.created_at
            }))
        };
    }

    async sendMessage(conversationId: number, content: string): Promise<AiMessage> {
        const response = await fetch(`${AI_API_URL}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Failed to send message to AI');
        }

        const data = await response.json();
        return {
            id: data.id,
            conversationId: conversationId,
            role: data.role,
            content: data.content,
            createdAt: data.created_at
        };
    }

    async deleteConversation(id: number): Promise<void> {
        const response = await fetch(`${AI_API_URL}/conversations/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete conversation');
    }
}

export const aiService = new AiService();
