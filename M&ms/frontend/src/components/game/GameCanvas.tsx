import React, { useRef, useEffect, useState } from 'react';
import { usePongGame } from '../../hooks/usePongGame';
import { GameMode } from '../../game/PongEngine';
import { Play, RotateCcw, Menu, LogOut, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { userService } from '../../services/user.service';
import { wsClient } from '../../services/socket.service';

interface GameCanvasProps {
    mode: GameMode;
    difficulty?: 'easy' | 'medium' | 'hard';
    onGameEnd?: (winner: { side: 'left' | 'right'; name: string }) => void;
    onlineConfig?: { gameId: string; isHost: boolean; player1Name?: string; player2Name?: string };
}

const GameCanvas: React.FC<GameCanvasProps> = ({ mode, difficulty = 'medium', onGameEnd, onlineConfig }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const navigate = useNavigate();
    const { gameState, startGame, pauseGame, resetGame, initGame } = usePongGame(canvasRef, mode, difficulty, onGameEnd, onlineConfig);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    // Initial setup
    useEffect(() => {
        initGame();
        // Auto-start game on mount
        const timer = setTimeout(() => {
            startGame();
        }, 100);
        return () => clearTimeout(timer);
    }, []); // Run once on mount

    // Handle leaving game - records as a loss
    const handleLeaveGame = async () => {
        setIsLeaving(true);
        try {
            // Record the game result as a loss for the player
            // Only record for AI mode since 1v1/2v2 are local with no stats tracking
            if (mode === 'ai') {
                await userService.recordGameResult({
                    player1_score: gameState.leftScore,
                    player2_score: 11, // AI wins by forfeit
                    winner_id: undefined, // No winner ID for AI
                    game_mode: `ai_${difficulty}`
                });
            } else if (mode === 'online' && onlineConfig) {
                // Determine our side to set scores correctly?
                // Backend handles the forfeit scoring for online games (0-11 logic)
                wsClient.sendGameLeave(onlineConfig.gameId);
            }
        } catch (error) {
            console.error('Failed to record game result:', error);
        } finally {
            setIsLeaving(false);
            setShowLeaveConfirm(false);
            navigate('/play');
        }
    };

    return (
        <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">


            {/* Header info */}
            <div className="flex justify-between w-full mb-4 px-4 items-center">
                <div className="bg-gray-800/80 px-6 py-2 rounded-lg border border-rose-500/30">
                    <span className="text-rose-400 font-bold text-2xl">{gameState.leftScore}</span>
                </div>

                <div className="text-gray-400 font-mono text-sm uppercase tracking-widest">
                    {mode === 'ai' ? `VS AI (${difficulty})` : (
                        mode === 'online' && onlineConfig
                            ? `${onlineConfig.player1Name || 'P1'} VS ${onlineConfig.player2Name || 'P2'}`
                            : mode
                    )}
                </div>

                <div className="bg-gray-800/80 px-6 py-2 rounded-lg border border-blue-500/30">
                    <span className="text-blue-400 font-bold text-2xl">{gameState.rightScore}</span>
                </div>
            </div>

            {/* Canvas Container */}
            <div className="relative rounded-lg shadow-2xl border-4 border-rose-500/50 overflow-hidden bg-black w-full aspect-[2/1]">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                />

                {/* Pause Overlay */}
                {gameState.isPaused && !gameState.winner && !showLeaveConfirm && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                        <h2 className="text-4xl font-bold text-white mb-6 tracking-widest">PAUSED</h2>
                        <div className="flex flex-col space-y-3">
                            <button
                                onClick={() => pauseGame()}
                                className="flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-full transition-all transform hover:scale-105"
                            >
                                <Play fill="currentColor" size={20} />
                                <span>RESUME</span>
                            </button>
                            <button
                                onClick={() => setShowLeaveConfirm(true)}
                                className="flex items-center justify-center space-x-2 bg-gray-600 hover:bg-red-600 text-white px-8 py-3 rounded-full transition-all transform hover:scale-105"
                            >
                                <LogOut size={20} />
                                <span>LEAVE GAME</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Leave Confirmation Modal */}
                {showLeaveConfirm && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-30">
                        <div className="bg-gray-800 rounded-xl p-8 max-w-md mx-4 border-2 border-red-500/50 shadow-2xl">
                            <div className="flex items-center justify-center mb-4">
                                <AlertTriangle className="text-yellow-500" size={48} />
                            </div>
                            <h3 className="text-2xl font-bold text-white text-center mb-2">Leave Game?</h3>
                            <p className="text-gray-300 text-center mb-6">
                                Leaving now will count as a <span className="text-red-400 font-bold">LOSS</span> and end your current game.
                            </p>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setShowLeaveConfirm(false)}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg transition-all font-semibold"
                                    disabled={isLeaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLeaveGame}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-all font-semibold flex items-center justify-center space-x-2"
                                    disabled={isLeaving}
                                >
                                    {isLeaving ? (
                                        <span>Leaving...</span>
                                    ) : (
                                        <>
                                            <LogOut size={18} />
                                            <span>Leave</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Game Over Overlay */}
                {gameState.winner && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-20 animate-in fade-in duration-300">
                        <h2 className="text-5xl font-bold text-white mb-2">GAME OVER</h2>
                        {mode === 'online' && onlineConfig ? (
                            (() => {
                                const isMe = (onlineConfig.isHost && gameState.winner.side === 'left') ||
                                    (!onlineConfig.isHost && gameState.winner.side === 'right');
                                return (
                                    <div className={`text-6xl mb-8 font-black animate-bounce ${isMe ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]' : 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]'}`}>
                                        {isMe ? 'YOU WIN!' : 'YOU LOSE'}
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="text-3xl text-yellow-400 mb-8 font-bold animate-pulse">
                                {gameState.winner.name} WINS!
                            </div>
                        )}

                        <div className="flex space-x-4">
                            {mode !== 'online' && (
                                <button
                                    onClick={() => {
                                        resetGame();
                                        startGame();
                                    }}
                                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-all hover:shadow-lg hover:shadow-green-500/30"
                                >
                                    <RotateCcw size={20} />
                                    <span>Play Again</span>
                                </button>
                            )}

                            <Link
                                to="/play"
                                className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-all hover:shadow-lg"
                            >
                                <Menu size={20} />
                                <span>Menu</span>
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Helper */}
            <div className="mt-6 text-gray-500 text-sm flex space-x-8">
                <div className="flex items-center space-x-2">
                    <span className="bg-gray-700 px-2 py-1 rounded text-xs text-white">W</span>
                    <span className="bg-gray-700 px-2 py-1 rounded text-xs text-white">S</span>
                    <span>{onlineConfig?.player1Name || "Player 1"}</span>
                </div>

                {mode !== 'ai' && (
                    <div className="flex items-center space-x-2">
                        <span className="bg-gray-700 px-2 py-1 rounded text-xs text-white">↑</span>
                        <span className="bg-gray-700 px-2 py-1 rounded text-xs text-white">↓</span>
                        <span>{onlineConfig?.player2Name || "Player 2"}</span>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    <span className="bg-gray-700 px-2 py-1 rounded text-xs text-white">ESC</span>
                    <span>Pause</span>
                </div>
            </div>

        </div >
    );
};

export default GameCanvas;
