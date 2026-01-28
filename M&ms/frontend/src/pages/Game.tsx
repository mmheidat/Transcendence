import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import GameCanvas from '../components/game/GameCanvas';
import { GameMode } from '../game/PongEngine';

const Game: React.FC = () => {
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') as GameMode;
    const difficulty = searchParams.get('difficulty') as 'easy' | 'medium' | 'hard' | undefined;

    const gameId = searchParams.get('gameId');
    const isHost = searchParams.get('isHost') === 'true';
    const player1Name = searchParams.get('p1') || 'Player 1';
    const player2Name = searchParams.get('p2') || 'Player 2';

    // Validate mode
    const validModes: GameMode[] = ['ai', '1v1', '2v2', 'online', 'tournament'];
    if (!mode || !validModes.includes(mode)) {
        return <Navigate to="/play" replace />;
    }

    const onlineConfig = (mode === 'online' && gameId)
        ? { gameId, isHost, player1Name, player2Name }
        : undefined;

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
            <GameCanvas mode={mode} difficulty={difficulty} onlineConfig={onlineConfig} />
        </div>
    );
};

export default Game;
