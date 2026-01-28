import { useEffect, useRef, useState, useCallback } from 'react';
import { PongEngine, GameMode } from '../game/PongEngine';
import { userService } from '../services/user.service';

export interface GameState {
    isPlaying: boolean;
    isPaused: boolean;
    leftScore: number;
    rightScore: number;
    winner: { side: 'left' | 'right'; name: string } | null;
}

import { wsClient } from '../services/socket.service';

export const usePongGame = (
    canvasRef: React.RefObject<HTMLCanvasElement>,
    gameMode: GameMode = '1v1',
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    onMatchEnd?: (winner: { side: 'left' | 'right'; name: string }) => void,
    onlineConfig?: { gameId: string; isHost: boolean; player1Name?: string; player2Name?: string }
) => {
    const engineRef = useRef<PongEngine | null>(null);
    const requestRef = useRef<number>();

    // Refs for Loop State to avoid stale closures
    const isPlayingRef = useRef(false);
    const isPausedRef = useRef(false);

    // Game State (for UI)
    const [gameState, setGameState] = useState<GameState>({
        isPlaying: false,
        isPaused: false,
        leftScore: 0,
        rightScore: 0,
        winner: null,
    });

    // Initialize Engine
    const initGame = useCallback(() => {
        if (!canvasRef.current) return;

        console.log("Initializing Pong Engine", gameMode, difficulty);
        const engine = new PongEngine(canvasRef.current, gameMode, difficulty);

        // Setup Callbacks
        engine.onScoreUpdate = (left, right) => {
            setGameState(prev => ({ ...prev, leftScore: left, rightScore: right }));
        };

        // Online Configuration
        if (gameMode === 'online' && onlineConfig) {
            engine.setIsHost(onlineConfig.isHost);

            // Send updates to server
            engine.setOnlinePaddleCallback((paddleY) => {
                wsClient.sendPaddleUpdate(onlineConfig.gameId, paddleY);
            });

            if (onlineConfig.isHost) {
                engine.setOnlineStateCallback((state) => {
                    wsClient.sendGameState(onlineConfig.gameId, state);
                });
            }

            // Receive updates from server
            const handlePaddleUpdate = (data: any) => {
                // Host receives Guest's paddle (Right), Guest receives Host's paddle (Left)
                // engine.setOpponentPaddle handles logic based on isHost
                if (data.game_id === onlineConfig.gameId) {
                    engine.setOpponentPaddle(data.paddle_y, onlineConfig.isHost);
                }
            };

            const handleGameState = (data: any) => {
                if (!onlineConfig.isHost && data.game_id === onlineConfig.gameId) {
                    engine.applyOnlineState(data.state);
                }
            };

            const handleGameEnd = (data: any) => {
                if (data.game_id === onlineConfig.gameId) {
                    // Determine winner side from scores
                    const leftScore = data.left_score;
                    const rightScore = data.right_score;

                    let winnerSide: 'left' | 'right' = 'left';
                    let winnerName = 'Opponent'; // Generic name helper

                    if (rightScore > leftScore) {
                        winnerSide = 'right';
                    }

                    // If we are host (Left) and winner is Left -> We Won
                    // If we are guest (Right) and winner is Right -> We Won
                    const amIWinner = (onlineConfig.isHost && winnerSide === 'left') || (!onlineConfig.isHost && winnerSide === 'right');
                    winnerName = amIWinner ? 'You' : 'Opponent';

                    console.log(`Game Over received. Winner: ${winnerSide} (${winnerName})`);

                    isPlayingRef.current = false;
                    setGameState(prev => ({
                        ...prev,
                        isPlaying: false,
                        leftScore,
                        rightScore,
                        winner: { side: winnerSide, name: winnerName }
                    }));
                    stopLoop();
                }
            };

            const handleGamePause = (data: any) => {
                if (data.game_id === onlineConfig.gameId) {
                    // Received pause from opponent, apply it without emitting back
                    isPausedRef.current = true;
                    setGameState(prev => ({ ...prev, isPaused: true }));
                }
            };

            const handleGameResume = (data: any) => {
                if (data.game_id === onlineConfig.gameId) {
                    isPausedRef.current = false;
                    setGameState(prev => ({ ...prev, isPaused: false }));
                }
            };

            const handleOpponentLeft = (data: any) => {
                if (data.game_id === onlineConfig.gameId) {
                    // Opponent left, we win!
                    // data.winner_id should be us (or we infer it)
                    // Set winner to us (or just trigger game end with win)
                    // We don't know our 'side' easily here without checking isHost
                    // Host is 'left', Guest is 'right'.
                    // If isHost (Left) and opponent (Right) left, Left wins.
                    const mySide = onlineConfig.isHost ? 'left' : 'right';
                    const winnerName = "You"; // Or user display name if available

                    isPlayingRef.current = false;
                    isPausedRef.current = false; // Ensure pause overlay is removed
                    setGameState(prev => ({
                        ...prev,
                        isPlaying: false,
                        isPaused: false, // Explicitly unpause
                        winner: { side: mySide, name: 'Opponent Left' } // Special message?
                    }));
                    stopLoop();
                }
            };

            // @ts-ignore
            wsClient.on('game_paddle_update', handlePaddleUpdate);
            // @ts-ignore
            wsClient.on('game_state', handleGameState);
            // @ts-ignore
            wsClient.on('game_ended', handleGameEnd);
            // @ts-ignore
            wsClient.on('game_paused', handleGamePause);
            // @ts-ignore
            wsClient.on('game_resumed', handleGameResume);
            // @ts-ignore
            wsClient.on('game_opponent_left', handleOpponentLeft);

            // Cleanup listener on engine destroy? 
            // We rely on component unmount cleanup effectively, but let's be careful.
            // Ideally we store these handlers to off them later.
        }

        engine.onGameEnd = async (side, name) => {
            isPlayingRef.current = false;
            setGameState(prev => ({
                ...prev,
                isPlaying: false,
                winner: { side, name }
            }));
            stopLoop();

            if (onMatchEnd) {
                onMatchEnd({ side, name });
            }

            // Record Game Result
            try {
                if (engineRef.current) {
                    const { leftScore, rightScore, gameMode } = engineRef.current;

                    // Only record explicit results for AI mode here.
                    // Online mode results are recorded by backend (game_end or game_leave)
                    if (gameMode === 'ai') {
                        await userService.recordGameResult({
                            player1_score: leftScore,
                            player2_score: rightScore,
                            player2_id: undefined,
                            game_mode: gameMode,
                            winner_id: undefined
                        });
                    } else if (gameMode === 'online' && onlineConfig) {
                        // Notify server of game end
                        // 'side' is the winner ('left' or 'right')
                        wsClient.sendGameEnd(onlineConfig.gameId, side, leftScore, rightScore);
                    }
                }
            } catch (e) {
                console.error("Failed to record game result", e);
            }
        };

        engine.setup();
        engineRef.current = engine;
    }, [canvasRef, gameMode, difficulty, onlineConfig]);

    const lastTimeRef = useRef<number>(0);

    // Game Loop
    const animate = useCallback((time: number) => {
        if (!isPlayingRef.current) return;

        if (lastTimeRef.current === 0) {
            lastTimeRef.current = time;
        }

        const deltaTime = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        if (engineRef.current) {
            // Always draw to prevent clearing canvas issues? 
            // Actually, if we want to show the paused state, we should draw.
            // But if paused, we don't update.
            if (!isPausedRef.current) {
                engineRef.current.update(deltaTime);
            }
            engineRef.current.draw();
        }

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    const startLoop = useCallback(() => {
        if (!requestRef.current) {
            requestRef.current = requestAnimationFrame(animate);
        }
    }, [animate]);

    const stopLoop = useCallback(() => {
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = undefined;
        }
    }, []);

    // Controls
    const startGame = useCallback(() => {
        if (!engineRef.current) initGame();

        isPlayingRef.current = true;
        isPausedRef.current = false;

        setGameState(prev => ({
            ...prev,
            isPlaying: true,
            isPaused: false,
            winner: null,
            leftScore: 0,
            rightScore: 0
        }));

        startLoop();
    }, [initGame, startLoop]);

    const pauseGame = useCallback((forceState?: boolean, emitEvent: boolean = true) => {
        let nextState = forceState !== undefined ? forceState : !isPausedRef.current;

        if (nextState === isPausedRef.current && forceState !== undefined) return;

        isPausedRef.current = nextState;
        setGameState(prev => ({ ...prev, isPaused: nextState }));

        if (gameMode === 'online' && onlineConfig && emitEvent) {
            if (nextState) {
                wsClient.sendGamePause(onlineConfig.gameId);
            } else {
                wsClient.sendGameResume(onlineConfig.gameId);
            }
        }
    }, [gameMode, onlineConfig]);

    const resetGame = useCallback(() => {
        isPlayingRef.current = false;
        stopLoop();
        engineRef.current = null;
        setGameState({
            isPlaying: false,
            isPaused: false,
            leftScore: 0,
            rightScore: 0,
            winner: null,
        });

        // Clear canvas
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        // Re-init happens on next start
        initGame();
    }, [initGame, stopLoop, canvasRef]);

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!engineRef.current) return;

            // Prevent scrolling for game keys
            const gameKeys = ['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S', 'q', 'Q', 'a', 'A', 'o', 'O', 'l', 'L'];
            if (gameKeys.includes(e.key)) {
                e.preventDefault();
            }

            if (e.key === 'Escape') {
                pauseGame();
            }

            engineRef.current.keys[e.key] = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!engineRef.current) return;
            engineRef.current.keys[e.key] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [pauseGame]);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => {
            engineRef.current?.resizeCanvas();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            isPlayingRef.current = false;
            stopLoop();
        };
    }, [stopLoop]);

    return {
        gameState,
        startGame,
        pauseGame,
        resetGame,
        initGame
    };
};
