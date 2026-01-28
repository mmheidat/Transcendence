import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { socialService } from '../services/social.service';
import { wsClient } from '../services/socket.service';

interface NotificationContextType {
    unreadCounts: Map<number, number>;
    totalUnread: number;
    markAsRead: (userId: number) => void;
    refreshNotifications: () => Promise<void>;
    setActiveChatId: (id: number | null) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [unreadCounts, setUnreadCounts] = useState<Map<number, number>>(new Map());
    const [activeChatId, setActiveChatId] = useState<number | null>(null);

    // Derived state
    const totalUnread = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0);

    const refreshNotifications = React.useCallback(async () => {
        if (!user) return;
        try {
            const conversations = await socialService.getConversations();
            const newMap = new Map<number, number>();
            conversations.forEach(conv => {
                if (conv.unread_count > 0) {
                    newMap.set(conv.user.id, conv.unread_count);
                }
            });
            setUnreadCounts(newMap);
        } catch (e) {
            console.error("Failed to refresh notifications", e);
        }
    }, [user]);

    const markAsRead = React.useCallback((userId: number) => {
        setUnreadCounts(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
    }, []);

    // Initial load
    useEffect(() => {
        if (user) {
            refreshNotifications();
            // Ensure connection for WS
            wsClient.connect();
        } else {
            setUnreadCounts(new Map());
            setActiveChatId(null);
        }
    }, [user]);

    // WebSocket Listeners
    useEffect(() => {
        if (!user) return;

        const handleNewMessage = (payload: any) => {
            // Payload: { type: 'new_message', from: userId, content: ... }
            if (payload && payload.from) {
                // If the message is from me, ignore (shouldn't happen with correct backend)
                if (payload.from === user.id) return;

                // If we are currently looking at this chat, ignore
                if (payload.from === activeChatId) return;

                setUnreadCounts(prev => {
                    const newMap = new Map(prev);
                    const current = newMap.get(payload.from) || 0;
                    newMap.set(payload.from, current + 1);
                    return newMap;
                });
            }
        };

        // @ts-ignore
        wsClient.on('new_message', handleNewMessage);

        // Handle potential legacy event just in case
        const handleLegacy = (payload: any) => {
            // If payload structure is different, normalize it
            const fromId = payload.senderId || payload.sender_id;
            if (fromId) {
                handleNewMessage({ ...payload, from: fromId });
            }
        }
        // @ts-ignore
        wsClient.on('chat_message', handleLegacy);

        return () => {
            // @ts-ignore
            wsClient.off('new_message', handleNewMessage);
            // @ts-ignore
            wsClient.off('chat_message', handleLegacy);
        };
    }, [user, activeChatId]); // activeChatId dependency is crucial

    return (
        <NotificationContext.Provider value={{ unreadCounts, totalUnread, markAsRead, refreshNotifications, setActiveChatId }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};
