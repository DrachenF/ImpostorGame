// Frontend/src/components/WaitingRoom.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToRoom, updateRoomSettings, removePlayer, leaveRoom } from '../utils/firebaseService';
import { startGame } from '../utils/gameUtils';
import { toastSuccess, toastError, toastWarning } from '../utils/toast';
import GameSettings from './GameSettings';
import GamePlay from './GamePlay';
import './WaitingRoom.css';

function WaitingRoom() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const playerId = localStorage.getItem('playerId');

  // --- CORRECCIÓN CRÍTICA AQUÍ ---
  useEffect(() => {
    // Solo expulsamos al jugador si cierra la pestaña explícitamente
    const handleBeforeUnload = (e) => {
      leaveRoom(roomCode, playerId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // QUITAMOS la limpieza automática al desmontar (return)
    // para evitar que React StrictMode te saque de la sala al cargar.
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomCode, playerId]);
  // -------------------------------

  useEffect(() => {
    console.log('🔍 Cargando sala:', roomCode);

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setRoomData(data);
        setLoading(false);
        
        if (data.gameState?.status === 'waiting') {
          setIsStarting(false);
        }
      } else {
        console.log('❌ Sala no encontrada en suscripción');
        // No ponemos setLoading(false) inmediatamente para dar tiempo a reconectar
        // si hubo un parpadeo de conexión.
        setTimeout(() => {
             if (!data) setLoading(false);
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [roomCode, navigate]);

  useEffect(() => {
    if (!roomData?.expiresAt) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const expiresAt = new Date(roomData.expiresAt);
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining('Expirada');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [roomData]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toastSuccess('Código copiado', { duration: 2000 });
  };

  const handleSaveSettings = async (settings) => {
    const result = await updateRoomSettings(roomCode, settings);
    if (!result.success) toastError('Error guardando configuración');
    else toastSuccess('Configuración guardada');
  };

  const handleRemovePlayer = async (playerIdToRemove) => {
    if (window.confirm('¿Expulsar jugador?')) {
      const result = await removePlayer(roomCode, playerIdToRemove);
      if (result.success) toastSuccess('Jugador expulsado');
      else toastError('Error al expulsar');
    }
  };

  const handleStartGame = async () => {
    const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
    if (!isHost || isStarting) return;
    
    if (roomData.players.length < 3) {
      toastWarning('Se necesitan mínimo 3 jugadores');
      return;
    }

    setIsStarting(true);
    try {
      await startGame(roomCode, roomData);
      toastSuccess('¡Iniciando!');
    } catch (error) {
      console.error('Error inicio:', error);
      toastError('No se pudo iniciar');
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="waiting-room-container">
        <div className="loading"><h2>⏳ Conectando...</h2></div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="waiting-room-container">
        <div className="error">
          <h2>⚠️ Sala no encontrada</h2>
          <p>La sala no existe o ha expirado.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">Volver</button>
        </div>
      </div>
    );
  }

  if (roomData.gameState?.status === 'starting') {
    return <GamePlay roomId={roomCode} playerId={playerId} />;
  }

  const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
  const minPlayers = 3;
  const canStart = roomData.players.length >= minPlayers;

  return (
    <div className="waiting-room-container">
      <div className="waiting-room-card">
        <h1 className="room-title">🎭 Sala de Espera</h1>
        
        {timeRemaining && (
          <div className="time-remaining-badge">Activa: {timeRemaining}</div>
        )}
        
        <div className="room-code-section">
          <p>Código de sala:</p>
          <div className="code-display">
            <span className="code">{roomCode}</span>
            <button onClick={copyRoomCode} className="btn-copy">Copiar</button>
          </div>
        </div>

        <div className="players-section">
          <h3>Jugadores ({roomData.players.length})</h3>
          <div className="players-list">
            {roomData.players.map((player) => (
              <div key={player.id} className="player-item">
                <div className="player-info">
                  <img src={player.avatar.image} alt="avatar" className="player-avatar-img"/>
                  <span className="player-name">
                    {player.isHost && '👑 '} {player.name}
                  </span>
                </div>
                <div className="player-actions">
                  {player.id === playerId && <span className="badge-you">Tú</span>}
                  {isHost && player.id !== playerId && (
                    <button onClick={() => handleRemovePlayer(player.id)} className="btn-kick">✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <div className="host-controls">
            <button onClick={() => setShowSettings(true)} className="btn btn-settings">⚙️ Configurar</button>
            <button 
              onClick={handleStartGame}
              className="btn btn-start"
              disabled={!canStart || isStarting}
            >
              {isStarting ? 'Iniciando...' : canStart ? '🚀 Iniciar' : `Esperando (${roomData.players.length}/${minPlayers})`}
            </button>
          </div>
        ) : (
          <div className="waiting-message"><p>⏳ Esperando al host...</p></div>
        )}
      </div>

      {showSettings && isHost && (
        <GameSettings 
          roomData={roomData}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default WaitingRoom;