// Frontend/src/components/WaitingRoom.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToRoom, updateRoomSettings, removePlayer } from '../utils/firebaseService';
import { startGame, initiateVoting } from '../utils/gameUtils';
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
  const [roomExpired, setRoomExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const playerId = localStorage.getItem('playerId');

  useEffect(() => {
    console.log('🔍 Cargando sala:', roomCode);

    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        console.log('✅ Datos de sala recibidos:', data);
        console.log('🎮 Estado del juego:', data.gameState);
        setRoomData(data);
        setLoading(false);
        
        if (data.gameState?.status === 'waiting') {
          console.log('🔄 Reseteando estado de inicio');
          setIsStarting(false);
        }
      } else {
        console.log('❌ Sala no encontrada o expirada');
        setRoomExpired(true);
        setLoading(false);
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
    toastSuccess('Código copiado al portapapeles', {
      title: '📋 Copiado',
      duration: 2000
    });
  };

  const handleSaveSettings = async (settings) => {
    const result = await updateRoomSettings(roomCode, settings);
    if (!result.success) {
      toastError('No se pudo guardar la configuración', {
        title: '❌ Error',
        duration: 3000
      });
    } else {
      toastSuccess('Configuración guardada correctamente', {
        title: '✓ Guardado',
        duration: 2000
      });
    }
  };

  const handleRemovePlayer = async (playerIdToRemove) => {
    if (window.confirm('¿Seguro que quieres expulsar a este jugador?')) {
      const result = await removePlayer(roomCode, playerIdToRemove);
      if (!result.success) {
        toastError('No se pudo expulsar al jugador', {
          title: '❌ Error',
          duration: 3000
        });
      } else {
        toastSuccess('Jugador expulsado de la sala', {
          title: '👋 Expulsado',
          duration: 2000
        });
      }
    }
  };

  const handleStartGame = async () => {
    const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
    if (!isHost || isStarting) return;
    
    if (roomData.players.length < 3) {
      toastWarning('Se necesitan al menos 3 jugadores para iniciar', {
        title: '⚠ Jugadores insuficientes',
        duration: 3000
      });
      return;
    }

    if (!roomData.selectedCategories || roomData.selectedCategories.length === 0) {
      toastWarning('Debes configurar al menos una categoría antes de iniciar', {
        title: '⚠ Sin categorías',
        duration: 3000
      });
      return;
    }

    setIsStarting(true);
    try {
      await startGame(roomCode, roomData);
      toastSuccess('¡El juego está comenzando!', {
        title: '🎮 Iniciando',
        duration: 2000
      });
    } catch (error) {
      console.error('Error al iniciar el juego:', error);
      toastError('No se pudo iniciar el juego', {
        title: '❌ Error',
        duration: 3000
      });
      setIsStarting(false);
    }
  };

  const handleInitiateVoting = async () => {
    const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
    if (!isHost) return;
    
    try {
      await initiateVoting(roomCode);
      toastInfo('Votación iniciada', {
        title: '🗳️ Votación',
        duration: 2000
      });
    } catch (error) {
      console.error('Error al iniciar votación:', error);
      toastError('No se pudo iniciar la votación', {
        title: '❌ Error',
        duration: 3000
      });
    }
  };

  if (loading) {
    return (
      <div className="waiting-room-container">
        <div className="loading">
          <h2>⏳ Cargando sala...</h2>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="waiting-room-container">
        <div className="error">
          <h2>⏰ Sala Expirada</h2>
          <p>Esta sala ha sido cerrada automáticamente después de 4 horas de inactividad.</p>
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-primary"
            style={{ marginTop: '20px' }}
          >
            🏠 Volver al inicio
          </button>
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
          <div className="time-remaining-badge">
            ⏰ Sala activa por: {timeRemaining}
          </div>
        )}
        
        <div className="room-code-section">
          <p>Código de sala:</p>
          <div className="code-display">
            <span className="code">{roomCode}</span>
            <button onClick={copyRoomCode} className="btn-copy">
              📋 Copiar
            </button>
          </div>
        </div>

        <div className="players-section">
          <h3>Jugadores ({roomData.players.length})</h3>
          <div className="players-list">
            {roomData.players.map((player) => (
              <div key={player.id} className="player-item">
                <div className="player-info">
                  <img 
                    src={player.avatar.image} 
                    alt={player.avatar.name}
                    className="player-avatar-img"
                  />
                  <span className="player-name">
                    {player.isHost && '👑 '}
                    {player.name}
                  </span>
                </div>
                <div className="player-actions">
                  {player.id === playerId && (
                    <span className="badge-you">Tú</span>
                  )}
                  {isHost && player.id !== playerId && (
                    <button 
                      onClick={() => handleRemovePlayer(player.id)}
                      className="btn-kick"
                      title="Expulsar jugador"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="game-info-section">
          <div className="info-card">
            <span className="info-icon">🎭</span>
            <div className="info-text">
              <strong>{roomData.impostorCount || 1}</strong> Impostor(es)
            </div>
          </div>
          <div className="info-card">
            <span className="info-icon">📚</span>
            <div className="info-text">
              <strong>{roomData.selectedCategories?.length || 0}</strong> Categorías
            </div>
          </div>
        </div>

        {isHost ? (
          <div className="host-controls">
            <button 
              onClick={() => setShowSettings(true)}
              className="btn btn-settings"
            >
              ⚙️ Configurar Juego
            </button>

            {!canStart && (
              <p className="warning-text">
                ⚠️ Se necesitan mínimo {minPlayers} jugadores para empezar
              </p>
            )}
            
            <button 
              onClick={handleStartGame}
              className="btn btn-start"
              disabled={!canStart || isStarting}
            >
              {isStarting ? '⏳ Iniciando...' : canStart ? '🚀 Iniciar Partida' : `Esperando jugadores (${roomData.players.length}/${minPlayers})`}
            </button>
          </div>
        ) : (
          <div className="waiting-message">
            <p>⏳ Esperando a que el host inicie el juego...</p>
          </div>
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