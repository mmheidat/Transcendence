import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { wsClient } from '../../services/socket.service';
import { useAuth } from '../../context/AuthContext';
import { X, Check, Gamepad2 } from 'lucide-react';

interface GameInvite {
    id: string; // Invite ID
    from_user_id: number;
    from_username: string;
}

const InviteHandler: React.FC = () => {
    const { user } = useAuth();
    const [invites, setInvites] = useState<GameInvite[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        // Ensure WS connection
        if (user) {
            wsClient.connect();
        }

        const handleInvite = (payload: any) => {
            console.log("Invite received:", payload);
            // Payload might vary, adjusting to likely structure
            // Legacy: { type: 'game_invite', invite: { id, from_user_id, from_username ... } }
            // OR { type: 'game_invite', id, from_user_id, from_username }
            const invite = payload.invite || payload;

            if (invite && invite.id) {
                setInvites(prev => [...prev, invite]);
            }
        };

        const handleInviteAccepted = (payload: any) => {
            console.log("Invite accepted, starting game:", payload);
            // Payload: { type: 'game_invite_accepted', game_id: 123, is_host: boolean, opponent_id: ..., player1_name: ..., player2_name: ... }
            const { game_id, is_host, player1_name, player2_name } = payload;

            navigate(`/game?mode=online&gameId=${game_id}&isHost=${is_host}&p1=${encodeURIComponent(player1_name || 'Player 1')}&p2=${encodeURIComponent(player2_name || 'Player 2')}`);
        };

        // @ts-ignore
        wsClient.on('game_invite', handleInvite);
        // @ts-ignore
        wsClient.on('game_invite_accepted', handleInviteAccepted);

        return () => {
            // @ts-ignore
            wsClient.off('game_invite', handleInvite);
            // @ts-ignore
            wsClient.off('game_invite_accepted', handleInviteAccepted);
        };
    }, [navigate, user]);

    const accept = (invite: GameInvite) => {
        wsClient.acceptInvite(invite.id);
        setInvites(prev => prev.filter(i => i.id !== invite.id));
    };

    const decline = (invite: GameInvite) => {
        wsClient.declineInvite(invite.id);
        setInvites(prev => prev.filter(i => i.id !== invite.id));
    };

    if (invites.length === 0) return null;

    return (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
            {invites.map(invite => (
                <div key={invite.id} className="bg-gray-800 border border-yellow-500 rounded-lg shadow-2xl p-4 w-80 animate-slide-in">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center">
                            <div className="bg-yellow-500/20 p-2 rounded-full mr-3">
                                <Gamepad2 className="w-6 h-6 text-yellow-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">Game Invite</h4>
                                <p className="text-gray-300 text-sm">
                                    <span className="text-yellow-400 font-bold">{invite.from_username || `User ${invite.from_user_id}`}</span> wants to play!
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={() => accept(invite)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-bold text-sm flex items-center justify-center transition"
                        >
                            <Check className="w-4 h-4 mr-1" /> Accept
                        </button>
                        <button
                            onClick={() => decline(invite)}
                            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-md font-bold text-sm flex items-center justify-center transition"
                        >
                            <X className="w-4 h-4 mr-1" /> Decline
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default InviteHandler;
