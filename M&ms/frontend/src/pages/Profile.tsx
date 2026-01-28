import React, { useEffect, useState } from 'react';
import { Trophy, Gamepad2, Flame, Settings } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { userService, UserProfile, UserStats, GameHistory } from '../services/user.service';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [history, setHistory] = useState<GameHistory[]>([]);
    const [loading, setLoading] = useState(true);

    // Determines which user ID to fetch: passed via navigation state or current user
    // @ts-ignore
    const targetUserId = location.state?.userId || user?.id;
    const isOwnProfile = targetUserId === user?.id;

    useEffect(() => {
        const fetchData = async () => {
            if (!targetUserId) return;
            try {
                const [userProfile, userStats, userHistory] = await Promise.all([
                    userService.fetchUserProfile(targetUserId),
                    userService.fetchUserStats(targetUserId),
                    userService.fetchMatchHistory(10, targetUserId)
                ]);
                setProfile(userProfile);
                setStats(userStats);
                setHistory(userHistory);
            } catch (err) {
                console.error("Failed to fetch profile data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [targetUserId]);

    if (loading) return <div className="text-center p-10">Loading...</div>;
    if (!profile || !stats) return <div className="text-center p-10">Failed to load profile</div>;

    return (
        <div className="min-h-screen">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-6">Player Profile</h2>

                {/* Profile Header */}
                <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                            <div className="bg-rose-600 rounded-full w-24 h-24 flex items-center justify-center text-white text-4xl font-bold overflow-hidden shadow-lg shadow-rose-500/20">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span>{profile.username.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">{profile.display_name}</h3>
                                <p className="text-gray-500 text-sm mt-1">Member since: {new Date(profile.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        {isOwnProfile && (
                            <a href="/settings" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition border border-gray-600 flex items-center">
                                <Settings size={18} className="mr-2" /> Edit Profile
                            </a>
                        )}
                    </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Win Rate */}
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 text-center hover:transform hover:scale-105 transition duration-300">
                        <div className="flex justify-center mb-2 text-rose-400">
                            <Trophy size={48} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-gray-400 text-sm mb-2">Win Rate</h4>
                        <p className="text-4xl font-bold text-rose-400">{stats.win_rate}</p>
                        <p className="text-gray-500 text-sm mt-2">{stats.wins}W - {stats.losses}L</p>
                    </div>

                    {/* Total Games */}
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 text-center hover:transform hover:scale-105 transition duration-300">
                        <div className="flex justify-center mb-2 text-blue-400">
                            <Gamepad2 size={48} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-gray-400 text-sm mb-2">Total Games</h4>
                        <p className="text-4xl font-bold text-rose-400">{stats.total_games}</p>
                        <p className="text-gray-500 text-sm mt-2">Matches played</p>
                    </div>

                    {/* Longest Win Streak */}
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 text-center hover:transform hover:scale-105 transition duration-300">
                        <div className="flex justify-center mb-2 text-orange-400">
                            <Flame size={48} strokeWidth={1.5} />
                        </div>
                        <h4 className="text-gray-400 text-sm mb-2">Longest Streak</h4>
                        <p className="text-4xl font-bold text-orange-400">{stats.longest_streak}</p>
                        <p className="text-gray-500 text-sm mt-2">Consecutive wins</p>
                    </div>
                </div>

                {/* Match History */}
                <div className="bg-gray-800 rounded-lg shadow-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Recent Match History</h3>
                    <div className="space-y-3">
                        {history.length > 0 ? (
                            history.map((match) => {
                                const isWinner = match.winner?.id === targetUserId;
                                const amIPlayer1 = match.player1.id === targetUserId;
                                const opponent = amIPlayer1 ? match.player2 : match.player1;
                                const isAI = match.game_mode?.startsWith('ai') || !opponent;
                                const opponentName = isAI ? 'AI' : (opponent?.displayName || opponent?.username || 'Unknown');

                                // Determine score display
                                const p1Score = match.player1_score;
                                const p2Score = match.player2_score;

                                const myScore = amIPlayer1 ? p1Score : p2Score;
                                const oppScore = amIPlayer1 ? p2Score : p1Score;

                                // Fallback winner check if winner object/id is missing but scores define a winner (standard 1v1)
                                const actualIsWinner = isWinner || (myScore > oppScore);

                                const isLeaverLoss = !actualIsWinner && myScore === 0 && oppScore === 11;
                                const scoreDisplay = `${myScore} - ${oppScore}`;

                                return (
                                    <div key={match.id} className="flex items-center justify-between bg-gray-700/50 p-4 rounded hover:bg-gray-700 transition duration-200 border-l-4 border-transparent hover:border-rose-500">
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-2 h-2 rounded-full ${actualIsWinner ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div>
                                                <p className="font-bold text-white">{actualIsWinner ? 'Win' : 'Loss'} vs <span className="text-rose-400">{opponentName}</span></p>
                                                <p className="text-xs text-gray-500">{new Date(match.played_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className={`text-xl font-mono font-bold ${isLeaverLoss ? 'text-red-500' : 'text-gray-300'}`}>
                                            {isLeaverLoss ? "Forfeit" : scoreDisplay}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-gray-400 text-center py-4">
                                <p>No games played yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
