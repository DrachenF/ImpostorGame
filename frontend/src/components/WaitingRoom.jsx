// Frontend/src/components/WaitingRoom.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToRoom, updateRoomSettings, leaveRoom, kickPlayer, heartbeatPlayer, pruneInactivePlayers, transferHost } from '../utils/firebaseService';
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
  const [wasKicked, setWasKicked] = useState(false);
  const [roomExpired, setRoomExpired] = useState(false);
  const playerId = localStorage.getItem('playerId');
  const unsubscribeRef = useRef(null);
  const lastCleanupRef = useRef(0);

  // Salida segura
  useEffect(() => {
    const handleBeforeUnload = () => leaveRoom(roomCode, playerId);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomCode, playerId]);

  useEffect(() => {
    return () => {
      if (!wasKicked) leaveRoom(roomCode, playerId);
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [roomCode, playerId, wasKicked]);

  // Suscripción a la sala
  useEffect(() => {
    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (data) {
        setRoomExpired(Boolean(data.isExpired));
        setRoomData(data);
        setLoading(false);

        if (data.status === 'waiting') {
          setIsStarting(false);
        }
      } else {
        setTimeout(() => { if (!data) setLoading(false); }, 1000);
      }
    });
    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [roomCode, navigate]);

  useEffect(() => {
    const beat = () => heartbeatPlayer(roomCode, playerId).catch(() => {});
    beat();
    const id = setInterval(beat, 12000);
    return () => clearInterval(id);
  }, [roomCode, playerId]);

  useEffect(() => {
    if (!roomData || wasKicked) return;

    const kickedPlayers = roomData.kickedPlayers || {};
    const me = roomData.players.find(p => p.id === playerId);
    const isKicked = kickedPlayers[playerId]?.kicked || me?.isKicked;
    const missingFromRoom = !me && Object.keys(roomData).length > 0;

    if (isKicked || missingFromRoom) {
      setWasKicked(true);
      toastWarning('Has sido expulsado', { duration: 2200, title: 'Expulsado', closable: false });
      if (unsubscribeRef.current) unsubscribeRef.current();
      navigate('/');
    }
  }, [roomData, playerId, navigate, wasKicked, unsubscribeRef]);

  useEffect(() => {
    if (!roomData) return;
    const now = Date.now();
    if (now - lastCleanupRef.current < 10000) return;
    const me = roomData.players.find((p) => p.id === playerId && !p.isKicked && !p.hasLeft);
    const hostMissing = !roomData.players.some((p) => p.id === roomData.host && p.isHost && !p.hasLeft && !p.isKicked);
    const shouldClean = me && (me.isHost || hostMissing);
    if (!shouldClean) return;
    lastCleanupRef.current = now;
    pruneInactivePlayers(roomCode).catch(() => {});
  }, [roomData, roomCode, playerId]);

  // Temporizador de expiración
  useEffect(() => {
    if (!roomData?.expiresAt) return;
    const updateTime = () => {
      const diff = new Date(roomData.expiresAt) - new Date();
      if (diff <= 0) {
        setTimeRemaining('Expirada');
        setRoomExpired(true);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeRemaining(`${h}h ${m}m`);
    };
    updateTime();
    const i = setInterval(updateTime, 60000);
    return () => clearInterval(i);
  }, [roomData]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toastSuccess('Copiado');
  };

  const handleStart = async () => {
    if (roomData.players.length < 3) return toastWarning('Mínimo 3 jugadores');
    setIsStarting(true);
    try { await startGame(roomCode, roomData); }
    catch (e) { setIsStarting(false); toastError('Error iniciando'); }
  };

  const handleTransferHost = async (targetId) => {
    if (!targetId || targetId === playerId) return;
    try {
      await transferHost(roomCode, targetId);
    } catch (e) {
      toastError('No se pudo asignar host');
    }
  };

  if (loading) return <div className="waiting-room-container"><div className="loading">⏳ Cargando...</div></div>;
  if (!roomData) return <div className="waiting-room-container"><div className="error">⚠️ Sala no encontrada <button onClick={() => navigate('/')}>Salir</button></div></div>;

  if (roomExpired) {
    return (
      <div className="waiting-room-container">
        <div className="error">⚠️ Sala expirada <button onClick={() => navigate('/')}>Salir</button></div>
      </div>
    );
  }

  // Incluye voting (como ya lo tenías corregido)
  if (roomData.status === 'playing' || roomData.status === 'voting' || roomData.gameState?.status === 'starting') {
    return <GamePlay roomId={roomCode} playerId={playerId} />;
  }

  const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
  const visiblePlayers = roomData.players.filter(p => !p.isKicked);

  return (
    <div className="waiting-room-container">
      <div className="waiting-room-card">
        <h1 className="room-title">🎭 Sala de Espera</h1>
        <div className="time-remaining-badge">{timeRemaining}</div>

        <div className="room-code-section">
          <p>CÓDIGO:</p>
          <div className="code-display">
            <span className="code">{roomCode}</span>
            <button onClick={copyCode} className="btn-copy">COPIAR</button>
          </div>
        </div>

        <div className="players-section">
          <h3>Jugadores ({visiblePlayers.length})</h3>
          <div className="players-list">
            {visiblePlayers.map(p => {
              const isMe = p.id === playerId;

              return (
                <div
                  key={p.id}
                  className={`player-item ${isMe ? 'current-player-card' : ''}`}  // ✅ ÚNICO CAMBIO
                >
                  <img src={p.avatar.image} alt="av" className="player-avatar-img"/>
                  <span className="player-name">{p.isHost && '👑'} {p.name} {isMe && '(Tú)'}</span>
                  {isHost && p.id !== playerId && (
                    <div className="player-actions">
                      <button onClick={() => handleTransferHost(p.id)} className="btn-host-transfer" title="Dar host">👑</button>
                      <button onClick={() => kickPlayer(roomCode, p.id, playerId)} className="btn-kick">✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="game-info-section" style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          <div style={{display:'flex', gap:'10px'}}>
            <div className="info-card" style={{flex:1}}>
              <span className="info-icon">🎭</span>
              <div><strong>{roomData.impostorCount}</strong> Impostores</div>
            </div>
            <div className="info-card" style={{flex:1}}>
              <span className="info-icon">📚</span>
              <div><strong>{roomData.selectedCategories?.length}</strong> Categorías</div>
            </div>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <div className={`info-card ${roomData.showClues ? 'active-green' : ''}`} style={{flex:1}}>
              <span className="info-icon">💡</span>
              <div>Pistas: <strong>{roomData.showClues ? 'SÍ' : 'NO'}</strong></div>
            </div>
            <div className={`info-card ${roomData.impostorMode ? 'active-purple' : ''}`} style={{flex:1}}>
              <span className="info-icon">😵</span>
              <div>Confusión: <strong>{roomData.impostorMode ? 'SÍ' : 'NO'}</strong></div>
            </div>
          </div>
        </div>

        {isHost ? (
          <div className="host-controls">
            <button onClick={() => setShowSettings(true)} className="btn btn-settings">⚙️ CONFIGURAR</button>
            <button onClick={handleStart} className="btn btn-start" disabled={roomData.players.length < 3 || isStarting}>
              {isStarting ? 'INICIANDO...' : '🚀 INICIAR PARTIDA'}
            </button>
          </div>
        ) : (
          <div className="waiting-message">⏳ Esperando al anfitrión...</div>
        )}
      </div>

      {showSettings && (
        <GameSettings
          roomData={roomData}
          onSave={(s) => updateRoomSettings(roomCode, s)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default WaitingRoom;
