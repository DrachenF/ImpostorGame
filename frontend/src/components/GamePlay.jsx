// Frontend/src/components/GamePlay.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { initiateVoting } from '../utils/gameUtils';
import RoleCard from './RoleCard';
import VotingScreen from './VotingScreen';
import './GamePlay.css';

function GamePlay({ roomId, playerId }) {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [roomExpired, setRoomExpired] = useState(false);

  useEffect(() => {
    const roomRef = doc(db, 'rooms', roomId);
    
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setRoomData(data);
        setGameState(data.gameState);
        
        // Si el juego acaba de iniciar, comenzar countdown
        if (data.gameState?.status === 'starting' && countdown === null) {
          setCountdown(3);
        }
        
        // Obtener el rol del jugador actual
        if (data.gameState?.playerRoles) {
          const role = data.gameState.playerRoles[playerId];
          setPlayerRole(role);
        }

        // Obtener datos del jugador actual
        const currentPlayer = data.players.find(p => p.id === playerId);
        setPlayerData(currentPlayer);
      } else {
        // La sala fue eliminada (expiró)
        console.log('⏰ Sala eliminada o expirada');
        setRoomExpired(true);
      }
    });

    return () => unsubscribe();
  }, [roomId, playerId, countdown]);

  // Countdown automático
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleInitiateVoting = async () => {
    const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
    if (!isHost) return;
    
    try {
      await initiateVoting(roomId);
      // El countdown se iniciará automáticamente en VotingScreen
    } catch (error) {
      console.error('Error al iniciar votación:', error);
      alert('❌ Error al iniciar votación');
    }
  };

  // Mostrar mensaje de sala expirada
  if (roomExpired) {
    return (
      <div className="gameplay-container">
        <div className="expired-overlay">
          <div className="expired-card">
            <h2>⏰ Sala Expirada</h2>
            <p>Esta sala se cerró automáticamente después de 4 horas.</p>
            <button 
              onClick={() => navigate('/')} 
              className="btn-back-home"
            >
              🏠 Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState || gameState.status !== 'starting') {
    return null;
  }

  // Mostrar pantalla de votación
  if (gameState.votingPhase?.active) {
    return (
      <VotingScreen 
        roomId={roomId}
        playerId={playerId}
        roomData={roomData}
        gameState={gameState}
      />
    );
  }

  const isHost = roomData?.players.find(p => p.id === playerId)?.isHost;

  return (
    <div className="gameplay-container">
      {countdown !== null && countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-circle">
            <span className="countdown-number">{countdown}</span>
          </div>
          <p className="countdown-text">Preparando el juego...</p>
        </div>
      )}

      {countdown === 0 && playerRole && playerData && (
        <RoleCard 
          playerData={playerData}
          role={playerRole}
          startingPlayer={gameState.startingPlayer}
          direction={gameState.direction}
          onInitiateVoting={handleInitiateVoting}
          isHost={isHost}
        />
      )}
    </div>
  );
}

export default GamePlay;