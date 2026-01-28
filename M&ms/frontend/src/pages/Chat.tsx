import React, { useEffect, useState, useRef } from 'react';
import { UserPlus, MessageSquare, Send, MoreVertical, Search, Gamepad2, User, Trash2, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { wsClient } from '../services/socket.service';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { socialService, Friend, FriendRequest } from '../services/social.service';
import Modal from '../components/ui/Modal';


interface UIMessage {
    id: number;
    sender: string;
    text: string;
    time: string;
    isMe: boolean;
}

const Chat: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { unreadCounts, markAsRead, refreshNotifications, setActiveChatId } = useNotification();
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [searchResults, setSearchResults] = useState<Friend[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [sendingRequestTo, setSendingRequestTo] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // UI State for menus and modals
    const [activeMenuFriendId, setActiveMenuFriendId] = useState<number | null>(null);
    const [friendToDelete, setFriendToDelete] = useState<Friend | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenuFriendId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Load messages and mark as read when friend selected
    useEffect(() => {
        if (!selectedFriend) {
            setActiveChatId(null);
            return;
        }

        // Set active chat ID to prevent notifications
        setActiveChatId(selectedFriend.id);

        // Clear notification locally
        markAsRead(selectedFriend.id);

        socialService.getMessages(selectedFriend.id).then(msgs => {
            const formatted: UIMessage[] = msgs.map(m => ({
                id: m.id,
                sender: m.is_mine ? 'Me' : (selectedFriend.display_name || selectedFriend.username),
                text: m.content,
                time: new Date(m.sent_at).toLocaleTimeString(),
                isMe: m.is_mine
            }));
            // Sort by time just in case
            setMessages(formatted.sort((a, b) => a.id - b.id));
        }).catch(err => console.error(err));
    }, [selectedFriend, markAsRead]); // Added markAsRead dependency

    const loadData = async () => {
        try {
            const [friendsData, requestsData] = await Promise.all([
                socialService.getFriends(),
                socialService.getPendingRequests()
            ]);
            setFriends(friendsData);
            setRequests(requestsData);
            refreshNotifications(); // Sync latest unread counts
        } catch (e) {
            console.error('Failed to load social data', e);
        }
    };

    // WebSocket connection - only depends on user, not selectedFriend
    useEffect(() => {
        if (!user) return;

        wsClient.connect();
        loadData();

        const handleConnected = () => {
            // console.log('Chat connected to WS');
        };

        // @ts-ignore
        wsClient.on('connected', handleConnected);

        return () => {
            // @ts-ignore
            wsClient.off('connected', handleConnected);
        };
    }, [user]);

    // Chat message listener - depends on selectedFriend
    useEffect(() => {
        if (!selectedFriend) return;

        const handleMessage = (payload: any) => {
            if (payload.senderId && payload.content) {
                const newMsg: UIMessage = {
                    id: Date.now(),
                    sender: payload.senderName || 'Unknown',
                    text: payload.content,
                    time: new Date().toLocaleTimeString(),
                    isMe: false
                };

                if (payload.senderId === selectedFriend.id) {
                    setMessages(prev => [...prev, newMsg]);
                }
            } else if (payload.message && payload.sender_id) {
                const newMsg: UIMessage = {
                    id: payload.message.id || Date.now(),
                    sender: 'Unknown',
                    text: payload.message.content,
                    time: new Date(payload.message.sent_at).toLocaleTimeString(),
                    isMe: false
                };
                if (payload.sender_id === selectedFriend.id) {
                    setMessages(prev => [...prev, newMsg]);
                }
            } else if (payload.from && payload.content) {
                // Handle 'new_message' payload format which uses 'from' instead of 'senderId'
                const newMsg: UIMessage = {
                    id: payload.messageId || Date.now(),
                    sender: selectedFriend.display_name || selectedFriend.username,
                    text: payload.content,
                    time: new Date().toLocaleTimeString(),
                    isMe: false
                };
                if (payload.from === selectedFriend.id) {
                    setMessages(prev => [...prev, newMsg]);
                }
            }
        };

        // @ts-ignore
        wsClient.on('new_message', handleMessage);

        return () => {
            // @ts-ignore
            wsClient.off('new_message', handleMessage);
        };
    }, [selectedFriend]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            try {
                const results = await socialService.searchUsers(searchQuery);
                setSearchResults(results);
            } catch (e) {
                console.error(e);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Search is handled by useEffect now
    };

    const sendFriendRequest = async (userId: number) => {
        if (sendingRequestTo === userId) return; // Prevent double-clicks
        setSendingRequestTo(userId);
        try {
            await socialService.sendFriendRequest(userId);
            alert('Friend request sent!');
            setSearchResults(prev => prev.filter(u => u.id !== userId));
        } catch (e: any) {
            alert(e.message || 'Failed to send request');
        } finally {
            setSendingRequestTo(null);
        }
    };

    const handleAcceptRequest = async (requestId: number) => {
        try {
            await socialService.acceptRequest(requestId);
            // Refresh all data to get new friend list and updated requests
            loadData();
        } catch (e) {
            console.error('Failed to accept request', e);
            alert('Failed to accept request');
        }
    };

    const handleRejectRequest = async (requestId: number) => {
        try {
            await socialService.rejectRequest(requestId);
            setRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (e) {
            console.error('Failed to reject request', e);
            alert('Failed to reject request');
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedFriend) return;

        const text = messageInput;

        try {
            // Send via HTTP (persistence)
            await socialService.sendMessage(selectedFriend.id, text);

            // Optimistic update
            setMessages(prev => [...prev, {
                id: Date.now(),
                sender: 'Me',
                text: text,
                time: new Date().toLocaleTimeString(),
                isMe: true
            }]);

            setMessageInput('');

            // WS might echo this back, so we might get a duplicate if we handle 'own' messages in WS listener. 
            // Usually WS listener filters out own messages or we should check ID.
        } catch (e) {
            console.error('Failed to send message', e);
            alert('Failed to send message');
        }
    };

    const handleViewProfile = () => {
        if (selectedFriend) {
            setActiveMenuFriendId(null);
            // Navigate to profile page (assuming route is /profile?user=username or similar due to current routing structure)
            // Or if you implement a public profile page: /profile/:username
            // Based on existing code, user profile is at /profile but only for logged in user.
            // If you need public profile, you might need to adjust routing.
            // For now, I'll redirect to a client-side route that would handle parameters if implemented, 
            // or just log it if strictly personal profile page exists.
            // Assuming we can pass state or query param for now, or new route needed.
            // Based on user request "view profile", I'll assume standard /profile/:username or similar pattern is desired.
            // Checking App.tsx, route is "/profile" -> Profile component.
            // I will use query param ?view=username for now or check if Profile component handles it.
            // If not, I'll just navigate to their profile assuming Profile page can handle "viewing others".
            // Since User Request implies viewing, I'll navigate to /profile with state.
            navigate('/profile', { state: { userId: selectedFriend.id, username: selectedFriend.username } });
        }
    };

    const handleDeleteClick = () => {
        if (selectedFriend) {
            setFriendToDelete(selectedFriend);
            setActiveMenuFriendId(null);
        }
    };

    const confirmDeleteFriend = async () => {
        if (!friendToDelete) return;

        try {
            await socialService.removeFriend(friendToDelete.id);
            // Remove from friends list locally
            setFriends(prev => prev.filter(f => f.id !== friendToDelete.id));

            // If deleted friend was selected, deselect
            if (selectedFriend?.id === friendToDelete.id) {
                setSelectedFriend(null);
                setMessages([]);
            }

            setFriendToDelete(null);
        } catch (error) {
            console.error('Failed to delete friend:', error);
            alert('Failed to delete friend');
        }
    };


    return (
        <div className="min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-6">Chat & Friends</h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    {/* Friends List Sidebar */}
                    <div className="lg:col-span-1 flex flex-col space-y-6 h-full">

                        {/* Search Bar */}
                        <div className="bg-gray-800 rounded-lg p-4 shadow-xl">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Find users..."
                                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSearch(!showSearch)}
                                    className={`p-2 rounded-lg ${showSearch ? 'bg-rose-600' : 'bg-gray-700'} text-white hover:bg-rose-700 transition`}
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                            </form>

                            {/* Tab Switcher */}
                            {!showSearch && (
                                <div className="flex bg-gray-700 rounded-lg p-1 mt-4">
                                    <button
                                        onClick={() => setActiveTab('friends')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'friends' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        Friends ({friends.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('requests')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'requests' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        Requests ({requests.length})
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* List Area */}
                        <div className="bg-gray-800 rounded-lg shadow-xl p-4 flex-1 overflow-hidden flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                                {showSearch ? <UserPlus className="w-5 h-5 mr-2 text-rose-400" /> : <MessageSquare className="w-5 h-5 mr-2 text-rose-400" />}
                                {showSearch
                                    ? 'Search Results'
                                    : activeTab === 'friends'
                                        ? `Friends`
                                        : `Pending Requests`}
                            </h3>

                            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                {showSearch ? (
                                    <>
                                        {searchResults.length === 0 && <p className="text-gray-400 text-center py-4">No users found</p>}
                                        {searchResults.map(user => (
                                            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3 overflow-hidden">
                                                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : (user.display_name || user.username).substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-white font-medium">{user.display_name || user.username}</span>
                                                </div>
                                                <button
                                                    onClick={() => sendFriendRequest(user.id)}
                                                    disabled={sendingRequestTo === user.id}
                                                    className="p-2 bg-rose-600 hover:bg-rose-700 rounded-full text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Add Friend"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                ) : activeTab === 'requests' ? (
                                    /* REQUESTS LIST */
                                    <>
                                        {requests.length === 0 && <p className="text-gray-400 text-center py-4">No pending requests</p>}
                                        {requests.map(req => {
                                            // Safety check for invalid request objects
                                            if (!req || !req.from) return null;

                                            return (
                                                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3 overflow-hidden">
                                                            {req.from.avatar_url ? <img src={req.from.avatar_url} className="w-full h-full object-cover" /> : (req.from.display_name || req.from.username || '?').substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="text-white font-medium">{req.from.display_name || req.from.username || 'Unknown'}</span>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleAcceptRequest(req.id)}
                                                            className="p-1.5 bg-green-600 hover:bg-green-700 rounded-full text-white transition"
                                                            title="Accept"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectRequest(req.id)}
                                                            className="p-1.5 bg-red-600 hover:bg-red-700 rounded-full text-white transition"
                                                            title="Reject"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </>
                                ) : (
                                    /* FRIENDS LIST */
                                    friends.map(friend => (
                                        <div
                                            key={friend.id}
                                            onClick={() => {
                                                if (selectedFriend?.id === friend.id) return;
                                                setSelectedFriend(friend);
                                                setMessages([]);
                                                setActiveMenuFriendId(null);
                                            }}
                                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedFriend?.id === friend.id ? 'bg-rose-600/20 border border-rose-500/50' : 'hover:bg-gray-700 bg-gray-700/30'}`}
                                        >
                                            <div className="bg-gradient-to-br from-gray-600 to-gray-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mr-3 relative overflow-visible">
                                                {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full object-cover rounded-full" /> : (friend.display_name || friend.username).substring(0, 2).toUpperCase()}
                                                {/* Online Status */}
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${friend.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>

                                                {/* Unread Badge */}
                                                {unreadCounts.has(friend.id) && unreadCounts.get(friend.id)! > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-gray-800 shadow-sm animate-bounce">
                                                        <span className="text-[10px] font-bold text-white">
                                                            {unreadCounts.get(friend.id)! > 9 ? '9+' : unreadCounts.get(friend.id)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-white text-sm">{friend.display_name || friend.username}</h4>
                                                <p className={`text-xs ${friend.is_online ? 'text-green-400' : 'text-gray-400'}`}>{friend.is_online ? 'Online' : 'Offline'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col h-full border border-gray-700/50">
                        {selectedFriend ? (
                            <>
                                {/* Chat Header */}
                                <div className="bg-gray-700/50 p-4 flex items-center justify-between border-b border-gray-600 backdrop-blur-sm relative z-10">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-rose-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold overflow-hidden">
                                            {selectedFriend.avatar_url ? <img src={selectedFriend.avatar_url} className="w-full h-full object-cover" /> : (selectedFriend.display_name || selectedFriend.username).substring(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold">{selectedFriend.display_name || selectedFriend.username}</h3>
                                            <p className={`text-sm ${selectedFriend.is_online ? 'text-green-400' : 'text-gray-400'}`}>{selectedFriend.is_online ? 'Online' : 'Offline'}</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 relative" ref={menuRef}>
                                        <button
                                            onClick={() => {
                                                if (selectedFriend && !sendingRequestTo) {
                                                    setSendingRequestTo(selectedFriend.id);
                                                    wsClient.sendGameInvite(selectedFriend.id);
                                                    alert(`Game invite sent to ${selectedFriend.display_name || selectedFriend.username}`);
                                                    // Reset after a delay to allow sending again if needed, but prevents rapid double-clicks
                                                    setTimeout(() => setSendingRequestTo(null), 2000);
                                                }
                                            }}
                                            disabled={sendingRequestTo === selectedFriend.id}
                                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm font-bold shadow-lg transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Invite to Game"
                                        >
                                            <Gamepad2 className="w-4 h-4 mr-1" />
                                            Challenge
                                        </button>

                                        {/* Friend Actions Menu */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setActiveMenuFriendId(activeMenuFriendId === selectedFriend.id ? null : selectedFriend.id)}
                                                className="text-gray-400 hover:text-white p-2 transition rounded-full hover:bg-gray-600"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {activeMenuFriendId === selectedFriend.id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-xl border border-gray-700 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                    <button
                                                        onClick={handleViewProfile}
                                                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center transition-colors border-b border-gray-700"
                                                    >
                                                        <User className="w-4 h-4 mr-2 text-indigo-400" />
                                                        View Profile
                                                    </button>
                                                    <button
                                                        onClick={handleDeleteClick}
                                                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete Friend
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Chat Messages */}
                                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-900/30">
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.isMe ? 'bg-rose-600 text-white rounded-tr-none' : 'bg-gray-700 text-gray-200 rounded-tl-none'}`}>
                                                <p>{msg.text}</p>
                                                <p className={`text-xs mt-1 text-right ${msg.isMe ? 'text-rose-200' : 'text-gray-400'}`}>{msg.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-gray-800 border-t border-gray-700">
                                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500 border border-gray-600 placeholder-gray-400"
                                        />
                                        <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-full transition duration-300 shadow-lg shadow-rose-500/20">
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg">Select a user to start chatting</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirm Delete Modal */}
            <Modal
                isOpen={!!friendToDelete}
                onClose={() => setFriendToDelete(null)}
                title="Remove Friend"
            >
                <div className="text-gray-300">
                    <p className="mb-6">
                        Are you sure you want to remove <span className="font-bold text-white">{friendToDelete?.display_name || friendToDelete?.username}</span> from your friends list?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => setFriendToDelete(null)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteFriend}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors shadow-lg shadow-red-500/20"
                        >
                            Remove Friend
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Chat;
