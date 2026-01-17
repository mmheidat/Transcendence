// Chat controller for friends, messages, and social features

import { socialService, Message } from '../services/SocialService.js';
import { GameSocketService } from '../services/GameSocketService.js';
import { showNotification } from '../utils/NotificationUtils.js';

export class ChatController {
    private gameSocketService: GameSocketService;
    private currentChatUserId: number | null = null;
    private currentChatUserName: string = '';
    private currentChatUserAvatar: string = '';
    private socialPollingInterval: number | null = null;

    // DOM elements
    private noChatSelected: HTMLElement | null;
    private chatWindow: HTMLElement | null;
    private chatFriendName: HTMLElement | null;
    private chatInput: HTMLInputElement | null;
    private sendMessageBtn: HTMLButtonElement | null;
    private chatMessages: HTMLElement | null;
    private friendOptionsMenu: HTMLElement | null;

    // Callbacks
    private onShowSection: ((section: string) => void) | null = null;

    constructor() {
        this.gameSocketService = GameSocketService.getInstance();

        this.noChatSelected = document.getElementById('noChatSelected');
        this.chatWindow = document.getElementById('chatWindow');
        this.chatFriendName = document.getElementById('chatFriendName');
        this.chatInput = document.getElementById('chatInput') as HTMLInputElement;
        this.sendMessageBtn = document.getElementById('sendMessageBtn') as HTMLButtonElement;
        this.chatMessages = document.getElementById('chatMessages');
        this.friendOptionsMenu = document.getElementById('friendOptionsMenu');
    }

    setOnShowSection(callback: (section: string) => void): void {
        this.onShowSection = callback;
    }

    getCurrentChatUserId(): number | null {
        return this.currentChatUserId;
    }

    getCurrentChatUserName(): string {
        return this.currentChatUserName;
    }

    getCurrentChatUserAvatar(): string {
        return this.currentChatUserAvatar;
    }

    setupEventListeners(): void {
        this.sendMessageBtn?.addEventListener('click', () => this.sendMessage());
        this.chatInput?.addEventListener('keypress', (e: KeyboardEvent) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        document.getElementById('viewProfileBtn')?.addEventListener('click', () => {
            this.onShowSection?.('profile');
        });

        document.getElementById('inviteToGameBtn')?.addEventListener('click', async () => {
            await this.sendGameInvite();
        });

        document.getElementById('friendOptionsBtn')?.addEventListener('click', () => {
            this.friendOptionsMenu?.classList.toggle('hidden');
        });

        document.getElementById('unfriendBtn')?.addEventListener('click', async () => {
            await this.handleUnfriend();
        });

        document.addEventListener('click', (e: MouseEvent) => {
            const friendOptionsBtn = document.getElementById('friendOptionsBtn');
            if (!friendOptionsBtn?.contains(e.target as Node) &&
                !this.friendOptionsMenu?.contains(e.target as Node)) {
                this.friendOptionsMenu?.classList.add('hidden');
            }
        });

        this.setupAddFriendListener();
    }

    private setupAddFriendListener(): void {
        const addFriendBtn = document.getElementById('addFriendBtn');
        const addFriendInput = document.getElementById('addFriendInput') as HTMLInputElement;

        addFriendBtn?.addEventListener('click', async () => {
            const username = addFriendInput?.value.trim();
            if (!username) {
                this.showAddFriendResult('Please enter a username', 'error');
                return;
            }

            try {
                const users = await socialService.searchUsers(username);
                if (users.length === 0) {
                    this.showAddFriendResult('No users found matching "' + username + '"', 'error');
                    return;
                }

                let targetUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
                if (!targetUser) {
                    targetUser = users.find(u => u.display_name?.toLowerCase() === username.toLowerCase());
                }
                if (!targetUser) {
                    targetUser = users[0];
                }

                await socialService.sendFriendRequest(targetUser.id);
                this.showAddFriendResult(`Friend request sent to ${targetUser.display_name || targetUser.username}!`, 'success');
                addFriendInput.value = '';
            } catch (error: any) {
                this.showAddFriendResult(error.message || 'Failed to send request', 'error');
            }
        });
    }

    private showAddFriendResult(message: string, type: 'success' | 'error'): void {
        const addFriendResult = document.getElementById('addFriendResult');
        if (addFriendResult) {
            addFriendResult.textContent = message;
            addFriendResult.className = `mt-2 text-sm ${type === 'success' ? 'text-green-400' : 'text-red-400'}`;
            addFriendResult.classList.remove('hidden');
            setTimeout(() => addFriendResult.classList.add('hidden'), 3000);
        }
    }

    private async sendGameInvite(): Promise<void> {
        if (!this.currentChatUserId) {
            alert('Please select a friend first');
            return;
        }
        const friendName = this.chatFriendName?.textContent || 'Friend';

        try {
            if (!this.gameSocketService.isConnected()) {
                await this.gameSocketService.connect();
            }
            this.gameSocketService.sendGameInvite(this.currentChatUserId);
            showNotification(`Game invite sent to ${friendName}!`, 'success');
        } catch (error) {
            console.error('Failed to send game invite:', error);
            showNotification('Failed to send invite. Please try again.', 'error');
        }
    }

    private async handleUnfriend(): Promise<void> {
        if (!this.currentChatUserId) return;

        const friendName = this.currentChatUserName || 'this friend';
        if (!confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
            return;
        }

        try {
            await socialService.removeFriend(this.currentChatUserId);
            this.friendOptionsMenu?.classList.add('hidden');
            this.chatWindow?.classList.add('hidden');
            this.noChatSelected?.classList.remove('hidden');
            this.currentChatUserId = null;
            this.currentChatUserName = '';
            this.loadFriendsList();
            alert('Friend removed successfully');
        } catch (error) {
            console.error('Failed to remove friend:', error);
            alert('Failed to remove friend. Please try again.');
        }
    }

    async loadFriendsList(): Promise<void> {
        const friendsList = document.getElementById('friendsList');
        const friendsCount = document.getElementById('friendsCount');
        if (!friendsList) return;

        try {
            const friends = await socialService.getFriends();
            if (friendsCount) friendsCount.textContent = friends.length.toString();

            if (this.currentChatUserId) {
                const stillFriends = friends.some(f => f.id === this.currentChatUserId);
                if (!stillFriends) {
                    this.chatWindow?.classList.add('hidden');
                    this.noChatSelected?.classList.remove('hidden');
                    this.currentChatUserId = null;
                    this.currentChatUserName = '';
                }
            }

            if (friends.length === 0) {
                friendsList.innerHTML = '<div class="text-gray-400 text-center py-4 text-sm">No friends yet. Add someone!</div>';
                return;
            }

            friendsList.innerHTML = friends.map(friend => `
                <div class="friend-item bg-gray-700 hover:bg-gray-600 rounded-lg p-3 cursor-pointer transition duration-300"
                    data-friend-id="${friend.id}" data-friend-name="${friend.display_name || friend.username}" data-friend-avatar="${friend.avatar_url || ''}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="relative">
                                ${friend.avatar_url
                    ? `<img src="${friend.avatar_url}" class="rounded-full w-10 h-10 object-cover">`
                    : `<div class="bg-indigo-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold">
                                            ${(friend.display_name || friend.username).charAt(0).toUpperCase()}
                                       </div>`}
                                <div class="absolute bottom-0 right-0 w-3 h-3 ${friend.is_online ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-gray-700"></div>
                            </div>
                            <div>
                                <p class="text-white font-semibold">${friend.display_name || friend.username}</p>
                                <p class="${friend.is_online ? 'text-green-400' : 'text-gray-400'} text-xs">${friend.is_online ? 'Online' : 'Offline'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            friendsList.querySelectorAll('.friend-item').forEach(item => {
                item.addEventListener('click', () => {
                    const friendId = parseInt(item.getAttribute('data-friend-id') || '0');
                    const friendName = item.getAttribute('data-friend-name') || 'Friend';
                    const friendAvatar = item.getAttribute('data-friend-avatar') || '';
                    this.openChatWithUser(friendId, friendName, friendAvatar);
                });
            });
        } catch (error) {
            console.error('Failed to load friends:', error);
            friendsList.innerHTML = '<div class="text-red-400 text-center py-4 text-sm">Failed to load friends</div>';
        }
    }

    async loadFriendRequests(): Promise<void> {
        const requestsList = document.getElementById('friendRequestsList');
        const requestsCount = document.getElementById('friendRequestsCount');
        if (!requestsList) return;

        try {
            const requests = await socialService.getPendingRequests();
            if (requestsCount) requestsCount.textContent = requests.length.toString();

            if (requests.length === 0) {
                requestsList.innerHTML = '<div class="text-gray-400 text-center py-2 text-sm">No pending requests</div>';
                return;
            }

            requestsList.innerHTML = requests.map(req => `
                <div class="bg-gray-700 rounded-lg p-3" data-request-id="${req.id}">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-white font-semibold">${req.from.display_name || req.from.username}</span>
                    </div>
                    <div class="flex space-x-2">
                        <button class="accept-request flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-2 rounded transition duration-300">Accept</button>
                        <button class="reject-request flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-2 rounded transition duration-300">Decline</button>
                    </div>
                </div>
            `).join('');

            requestsList.querySelectorAll('.accept-request').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const requestDiv = (btn as HTMLElement).closest('[data-request-id]');
                    const requestId = parseInt(requestDiv?.getAttribute('data-request-id') || '0');
                    try {
                        await socialService.acceptRequest(requestId);
                        this.loadFriendRequests();
                        this.loadFriendsList();
                    } catch (error) {
                        console.error('Failed to accept request:', error);
                    }
                });
            });

            requestsList.querySelectorAll('.reject-request').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const requestDiv = (btn as HTMLElement).closest('[data-request-id]');
                    const requestId = parseInt(requestDiv?.getAttribute('data-request-id') || '0');
                    try {
                        await socialService.rejectRequest(requestId);
                        this.loadFriendRequests();
                    } catch (error) {
                        console.error('Failed to reject request:', error);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to load friend requests:', error);
        }
    }

    async openChatWithUser(userId: number, userName: string, avatarUrl: string = ''): Promise<void> {
        this.currentChatUserId = userId;
        this.currentChatUserName = userName;
        this.currentChatUserAvatar = avatarUrl;

        this.noChatSelected?.classList.add('hidden');
        this.chatWindow?.classList.remove('hidden');
        if (this.chatFriendName) this.chatFriendName.textContent = userName;

        const chatAvatar = document.getElementById('chatAvatar');
        if (chatAvatar) {
            chatAvatar.removeAttribute('style');
            if (avatarUrl) {
                chatAvatar.innerHTML = `<img src="${avatarUrl}" class="rounded-full w-10 h-10 object-cover">`;
                chatAvatar.className = '';
            } else {
                chatAvatar.innerHTML = '';
                chatAvatar.textContent = userName.charAt(0).toUpperCase();
                chatAvatar.className = 'bg-indigo-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold';
            }
        }

        if (this.chatMessages) {
            this.chatMessages.innerHTML = '<div class="text-gray-400 text-center py-4">Loading messages...</div>';
        }

        try {
            const messages = await socialService.getMessages(userId);
            this.renderMessages(messages);
        } catch (error) {
            console.error('Failed to load messages:', error);
            if (this.chatMessages) {
                this.chatMessages.innerHTML = '<div class="text-red-400 text-center py-4">Failed to load messages</div>';
            }
        }
    }

    private renderMessages(messages: Message[]): void {
        if (!this.chatMessages) return;

        if (messages.length === 0) {
            this.chatMessages.innerHTML = '<div class="text-gray-400 text-center py-4">No messages yet. Start the conversation!</div>';
            return;
        }

        this.chatMessages.innerHTML = messages.map(msg => {
            const time = new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (msg.is_mine) {
                return `
                    <div class="flex items-start space-x-2 justify-end">
                        <div>
                            <div class="bg-indigo-600 rounded-lg p-3 max-w-xs">
                                <p class="text-white text-sm">${msg.content}</p>
                            </div>
                            <p class="text-gray-500 text-xs mt-1 mr-2 text-right">${time}</p>
                        </div>
                    </div>
                `;
            } else {
                const avatarHtml = this.currentChatUserAvatar
                    ? `<img src="${this.currentChatUserAvatar}" class="rounded-full w-8 h-8 object-cover flex-shrink-0">`
                    : `<div class="bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            ${this.currentChatUserName.charAt(0).toUpperCase()}
                       </div>`;
                return `
                    <div class="flex items-start space-x-2">
                        ${avatarHtml}
                        <div>
                            <div class="bg-gray-700 rounded-lg p-3 max-w-xs">
                                <p class="text-white text-sm">${msg.content}</p>
                            </div>
                            <p class="text-gray-500 text-xs mt-1 ml-2">${time}</p>
                        </div>
                    </div>
                `;
            }
        }).join('');

        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    private async sendMessage(): Promise<void> {
        if (!this.chatInput || !this.chatMessages) return;
        const message = this.chatInput.value.trim();
        if (!message || !this.currentChatUserId) return;

        const originalValue = this.chatInput.value;
        this.chatInput.value = '';
        this.chatInput.disabled = true;

        try {
            await socialService.sendMessage(this.currentChatUserId, message);

            const messageDiv = document.createElement('div');
            messageDiv.className = 'flex items-start space-x-2 justify-end';
            messageDiv.innerHTML = `
                <div>
                    <div class="bg-indigo-600 rounded-lg p-3 max-w-xs">
                        <p class="text-white text-sm">${message}</p>
                    </div>
                    <p class="text-gray-500 text-xs mt-1 mr-2 text-right">
                        ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            `;

            const placeholder = this.chatMessages.querySelector('.text-gray-400.text-center');
            if (placeholder) placeholder.remove();

            this.chatMessages.appendChild(messageDiv);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        } catch (error) {
            console.error('Failed to send message:', error);
            this.chatInput.value = originalValue;
            alert('Failed to send message. Please try again.');
        } finally {
            this.chatInput.disabled = false;
            this.chatInput.focus();
        }
    }

    handleIncomingMessage(message: { from: number; content: string }): void {
        if (!this.chatMessages) return;

        if (this.currentChatUserId && message.from === this.currentChatUserId) {
            const avatarHtml = this.currentChatUserAvatar
                ? `<img src="${this.currentChatUserAvatar}" class="rounded-full w-8 h-8 object-cover flex-shrink-0">`
                : `<div class="bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        ${this.currentChatUserName.charAt(0).toUpperCase()}
                   </div>`;

            const messageDiv = document.createElement('div');
            messageDiv.className = 'flex items-start space-x-2';
            messageDiv.innerHTML = `
                ${avatarHtml}
                <div>
                    <div class="bg-gray-700 rounded-lg p-3 max-w-xs">
                        <p class="text-white text-sm">${message.content}</p>
                    </div>
                    <p class="text-gray-500 text-xs mt-1 ml-2">
                        ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            `;

            const placeholder = this.chatMessages.querySelector('.text-gray-400.text-center');
            if (placeholder) placeholder.remove();

            this.chatMessages.appendChild(messageDiv);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    loadSocialData(): void {
        this.loadFriendsList();
        this.loadFriendRequests();
        this.startSocialPolling();
    }

    startSocialPolling(): void {
        this.stopSocialPolling();
        this.socialPollingInterval = window.setInterval(() => {
            this.loadFriendsList();
            this.loadFriendRequests();
        }, 10000);
    }

    stopSocialPolling(): void {
        if (this.socialPollingInterval) {
            clearInterval(this.socialPollingInterval);
            this.socialPollingInterval = null;
        }
    }

    closeChatWindow(): void {
        this.chatWindow?.classList.add('hidden');
        this.noChatSelected?.classList.remove('hidden');
        this.currentChatUserId = null;
        this.currentChatUserName = '';
        this.currentChatUserAvatar = '';
    }
}
