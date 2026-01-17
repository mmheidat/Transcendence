// Notification utilities for toast messages and game invite popups

export function showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('opacity-0', 'transition-opacity');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

export interface GameInvite {
    id: string;
    from_user_id: number;
    from_username: string;
}

export function showGameInvitePopup(
    invite: GameInvite,
    onAccept: (id: string) => void,
    onDecline: (id: string) => void
): void {
    const popup = document.createElement('div');
    popup.id = `invite-${invite.id}`;
    popup.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-700 to-indigo-800 text-white px-6 py-4 rounded-lg shadow-2xl z-50 border border-indigo-500';
    popup.innerHTML = `
        <div class="flex items-center space-x-4">
            <div class="text-3xl">🎮</div>
            <div class="flex-1">
                <p class="font-bold text-lg">${invite.from_username} wants to play!</p>
                <p class="text-indigo-200 text-sm">Game invite received</p>
            </div>
            <div class="flex space-x-2">
                <button id="accept-${invite.id}" class="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-bold transition">Accept</button>
                <button id="decline-${invite.id}" class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-bold transition">Decline</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    document.getElementById(`accept-${invite.id}`)?.addEventListener('click', () => {
        onAccept(invite.id);
        popup.remove();
    });

    document.getElementById(`decline-${invite.id}`)?.addEventListener('click', () => {
        onDecline(invite.id);
        popup.remove();
    });

    // Auto-remove after 60 seconds
    setTimeout(() => popup.remove(), 60000);
}
