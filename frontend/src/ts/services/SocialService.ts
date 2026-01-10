// SocialService.ts - Handles friends and chat functionality

const API_BASE_URL = '/api';

export interface Friend {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    is_online: boolean;
}

export interface FriendRequest {
    id: number;
    from: {
        id: number;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
    created_at: string;
}

export interface Conversation {
    user: {
        id: number;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
    last_message: {
        content: string;
        sent_at: string;
        is_mine: boolean;
    };
    unread_count: number;
}

export interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    read: boolean;
    sent_at: string;
    is_mine: boolean;
}

class SocialService {
    private static instance: SocialService;

    private constructor() { }

    static getInstance(): SocialService {
        if (!SocialService.instance) {
            SocialService.instance = new SocialService();
        }
        return SocialService.instance;
    }

    private getHeaders(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    // ==================== FRIENDS ====================

    async getFriends(): Promise<Friend[]> {
        const response = await fetch(`${API_BASE_URL}/users/friends`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch friends');
        const data = await response.json();
        return data.friends || [];
    }

    async getPendingRequests(): Promise<FriendRequest[]> {
        const response = await fetch(`${API_BASE_URL}/users/friends/pending`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch pending requests');
        const data = await response.json();
        return data.requests || [];
    }

    async sendFriendRequest(userId: number): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/users/friends/${userId}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({})
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to send friend request');
        }
    }

    async acceptRequest(requestId: number): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/users/friends/${requestId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ action: 'accept' })
        });
        if (!response.ok) throw new Error('Failed to accept request');
    }

    async rejectRequest(requestId: number): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/users/friends/${requestId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ action: 'reject' })
        });
        if (!response.ok) throw new Error('Failed to reject request');
    }

    async removeFriend(friendId: number): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/users/friends/${friendId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to remove friend');
    }

    // ==================== CHAT ====================

    async getConversations(): Promise<Conversation[]> {
        const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch conversations');
        const data = await response.json();
        return data.conversations || [];
    }

    async getMessages(userId: number, limit = 50): Promise<Message[]> {
        const response = await fetch(`${API_BASE_URL}/chat/messages/${userId}?limit=${limit}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        return data.messages || [];
    }

    async sendMessage(userId: number, content: string): Promise<Message> {
        const response = await fetch(`${API_BASE_URL}/chat/messages/${userId}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ content })
        });
        if (!response.ok) throw new Error('Failed to send message');
        return await response.json();
    }

    // ==================== USER SEARCH ====================

    async searchUsers(query: string): Promise<Friend[]> {
        const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.users || [];
    }
}

export const socialService = SocialService.getInstance();
