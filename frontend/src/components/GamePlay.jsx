import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { initiateVoting } from '../utils/gameUtils';
import { categories } from '../utils/categories';
import RoleCard from './RoleCard';
import VotingScreen from './VotingScreen';
import { removePlayer, heartbeatPlayer, pruneInactivePlayers, leaveRoom } from '../utils/firebaseService';
import { toastInfo } from '../utils/toast';
import './GamePlay.css';

function GamePlay({ roomId, playerId }) {
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [roomExpired, setRoomExpired] = useState(false);
  const prevPlayersRef = useRef([]);
  const unsubscribeRef = useRef(null);
  const [wasKicked, setWasKicked] = useState(false);
  const lastCleanupRef = useRef(0);

  // 1. SUSCRIPCIÓN A LA SALA
  useEffect(() => {
    const roomRef = doc(db, 'rooms', roomId);

    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (!docSnap.exists()) {
        setRoomExpired(true);
        return;
      }

      const data = docSnap.data();
      const isExpired = Boolean(
        data.expiresAt && new Date() > new Date(data.expiresAt)
      );
      setRoomExpired(isExpired);

      const playersInSnapshot = data.players || [];
      setRoomData({ ...data, players: playersInSnapshot });

      if (prevPlayersRef.current.length > 0) {
        const departed = prevPlayersRef.current.filter(
          (p) => !playersInSnapshot.some((np) => np.id === p.id)
        );
        departed.forEach((p) => {
          toastInfo(`${p.name} salió de la partida`, {
            duration: 1800,
            title: 'Jugador desconectado',
            closable: false
          });
        });
      }
      prevPlayersRef.current = playersInSnapshot;

      // ✅ Esto deja intacto tu comportamiento original del contador
      if (data.status === 'playing' && countdown === null) {
        setCountdown(3);
      }

      const kickedPlayers = data.kickedPlayers || {};
      const currentPlayer = data.players.find(p => p.id === playerId);
      const isKicked = kickedPlayers[playerId]?.kicked || currentPlayer?.isKicked;

      if (!currentPlayer || isKicked) {
        if (!wasKicked) {
          setWasKicked(true);
          toastInfo('Has sido expulsado', { duration: 2200, title: 'Expulsado', closable: false });
        }
        unsubscribe();
        navigate('/');
        return;
      }

      setPlayerData(currentPlayer);
    });

    unsubscribeRef.current = unsubscribe;

    return () => unsubscribe();
  }, [roomId, playerId, countdown, navigate, wasKicked]);

  // ✅ PRESENCIA: heartbeat para saber si el jugador sigue con el juego abierto
  useEffect(() => {
    const beat = () => heartbeatPlayer(roomId, playerId).catch(() => {});
    beat();
    const intervalId = setInterval(beat, 12000);
    return () => clearInterval(intervalId);
  }, [roomId, playerId]);

  useEffect(() => {
    if (!roomData) return;
    const now = Date.now();
    if (now - lastCleanupRef.current < 10000) return;
    const me = roomData.players.find((p) => p.id === playerId && !p.isKicked && !p.hasLeft);
    const hostMissing = !roomData.players.some((p) => p.id === roomData.host && p.isHost && !p.hasLeft && !p.isKicked);
    const shouldClean = me && (me.isHost || hostMissing);
    if (!shouldClean) return;
    lastCleanupRef.current = now;
    pruneInactivePlayers(roomId).catch(() => {});
  }, [roomData, roomId, playerId]);

  // 🚨 2. AUTO-ELIMINACIÓN SOLO AL SALIR REAL 🚨
  useEffect(() => {
    const markPlayerAsDisconnected = async () => {
      try {
        await removePlayer(roomId, playerId);
      } catch (e) {
        console.error('Error marcando salida del jugador:', e);
      }
    };

    const onBeforeUnload = () => markPlayerAsDisconnected();
    const onPageHide = () => markPlayerAsDisconnected();

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [roomId, playerId]);

  useEffect(() => {
    return () => {
      if (!wasKicked) leaveRoom(roomId, playerId);
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [roomId, playerId, wasKicked]);

  // 3. ÁRBITRO (FIN DE PARTIDA)
  useEffect(() => {
    if (!roomData || !playerData || !playerData.isHost) return;

    const isGameActive =
      roomData.status === 'playing' ||
      (roomData.status === 'voting' && !roomData.gameState?.votingPhase?.showResults);

    if (!isGameActive) return;

    const impostorsAlive = roomData.players.filter(
      p => p.isImpostor && p.isAlive !== false && !p.isKicked && !p.hasLeft
    ).length;

    const citizensAlive = roomData.players.filter(
      p => !p.isImpostor && p.isAlive !== false && !p.isKicked && !p.hasLeft
    ).length;

    if (impostorsAlive === 0) {
      finishGameByAbandonment('citizens_win');
    } else if (impostorsAlive >= citizensAlive) {
      finishGameByAbandonment('impostors_win');
    }
  }, [roomData, playerData]);

  // 4. COUNTDOWN (esto es lo que hace 3-2-1)
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 5. HERENCIA DEL HOST
  useEffect(() => {
    if (!roomData || !playerData) return;

    const currentHost = roomData.players.find(p => p.isHost);
    if (currentHost && !currentHost.hasLeft && !currentHost.isKicked) return;

    const orderedPlayers = [...roomData.players].sort((a, b) => {
      const aJoined = a.joinedAt || 0;
      const bJoined = b.joinedAt || 0;
      if (aJoined === bJoined) return a.id.localeCompare(b.id);
      return aJoined - bJoined;
    });

    const nextHost = orderedPlayers.find(
      p => !p.isKicked && !p.hasLeft
    );

    if (nextHost && nextHost.id === playerId) {
      const updatedPlayers = roomData.players.map(p => ({
        ...p,
        isHost: p.id === playerId
      }));

      updateDoc(doc(db, 'rooms', roomId), { players: updatedPlayers, host: playerId }).catch(
        e => console.error('Error heredando host:', e)
      );
    }
  }, [roomData, playerData, playerId, roomId]);

  const finishGameByAbandonment = async (reason) => {
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'voting',
        'gameState.votingPhase': {
          active: true,
          showResults: true,
          votes: {},
          forceGameOver: reason
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ FIX: el botón de iniciar votación YA NO saca jugadores
  const handleInitiateVoting = async () => {
    const isHost = roomData?.players.find(p => p.id === playerId)?.isHost;
    if (!isHost) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const players = data.players || [];

      // Solo limpiar votos inválidos (si existieran)
      const currentVotes = data.gameState?.votingPhase?.votes || {};
      const blockedIds = new Set(
        players
          .filter(p => p.hasLeft || p.isKicked || p.isAlive === false)
          .map(p => p.id)
      );

      const cleanedVotes = {};
      for (const [voterId, targetId] of Object.entries(currentVotes)) {
        if (blockedIds.has(voterId)) continue;
        if (blockedIds.has(targetId)) continue;
        cleanedVotes[voterId] = targetId;
      }

      await updateDoc(roomRef, {
        'gameState.votingPhase.votes': cleanedVotes
      });

      await initiateVoting(roomId);
    } catch (error) {
      console.error(error);
    }
  };

  if (roomExpired) {
    return (
      <div className="gameplay-container">
        <div className="expired-overlay">
          <h2>Sala cerrada</h2>
          <button onClick={() => navigate('/')}>Salir</button>
        </div>
      </div>
    );
  }

  if (!roomData || !playerData) return null;

  if (roomData.status === 'voting') {
    return <VotingScreen roomId={roomId} playerId={playerId} roomData={roomData} />;
  }

  const startingPlayerName = roomData.gameState?.startingPlayerName || 'Aleatorio';
  const direction = roomData.gameState?.direction || 'right';
  const isHost = roomData.players.find(p => p.id === playerId)?.isHost;

  return (
    <div className="gameplay-container">
      {countdown !== null && countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-circle">
            <span className="countdown-number">{countdown}</span>
          </div>
          <p className="countdown-text">Preparando...</p>
        </div>
      )}

      {countdown === 0 && (
        <RoleCard
          playerData={playerData}
          role={playerData.isImpostor ? 'impostor' : 'citizen'}
          startingPlayerName={startingPlayerName}
          direction={direction}
          onInitiateVoting={handleInitiateVoting}
          isHost={isHost}
          impostorMode={roomData.impostorMode}
        />
      )}
    </div>
  );
}

export default GamePlay;
