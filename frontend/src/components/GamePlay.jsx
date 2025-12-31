import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { initiateVoting } from '../utils/gameUtils';
import { categories } from '../utils/categories';
import RoleCard from './RoleCard';
import VotingScreen from './VotingScreen';
import './GamePlay.css';

function GamePlay({ roomId, playerId }) {
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [roomExpired, setRoomExpired] = useState(false);

  // 1. SUSCRIPCIÓN A LA SALA
  useEffect(() => {
    const roomRef = doc(db, 'rooms', roomId);

    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (!docSnap.exists()) {
        setRoomExpired(true);
        return;
      }

      const data = docSnap.data();
      setRoomData(data);

      // ✅ Esto deja intacto tu comportamiento original del contador
      if (data.status === 'playing' && countdown === null) {
        setCountdown(3);
      }

      const currentPlayer = data.players.find(p => p.id === playerId);
      if (!currentPlayer) {
        navigate('/');
        return;
      }

      setPlayerData(currentPlayer);

      if (currentPlayer.isKicked) {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [roomId, playerId, countdown, navigate]);

  // ✅ PRESENCIA: heartbeat para saber si el jugador sigue con el juego abierto
  useEffect(() => {
    let intervalId = null;

    const beat = async () => {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const players = data.players || [];
        const me = players.find(p => p.id === playerId);
        if (!me) return;

        // No marcamos presencia si ya salió / kick / muerto
        if (me.hasLeft || me.isKicked || me.isAlive === false) return;

        const updatedPlayers = players.map(p =>
          p.id === playerId ? { ...p, lastSeen: Date.now() } : p
        );

        await updateDoc(roomRef, { players: updatedPlayers });
      } catch (e) {
        // silencioso
      }
    };

    // primer beat inmediato
    beat();
    intervalId = setInterval(beat, 8000); // cada 8s

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [roomId, playerId]);

  // 🚨 2. AUTO-ELIMINACIÓN SOLO AL SALIR REAL 🚨
  useEffect(() => {
    const markPlayerAsDisconnected = async () => {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const isGameActive = data.status === 'playing' || data.status === 'voting';
        if (!isGameActive) return;

        const players = data.players || [];
        const me = players.find(p => p.id === playerId);
        if (!me) return;

        if (me.isAlive === false || me.hasLeft) return;

        const updatedPlayers = players.map(p =>
          p.id === playerId ? { ...p, isAlive: false, hasLeft: true } : p
        );

        const updates = { players: updatedPlayers };

        const votes = data.gameState?.votingPhase?.votes;
        if (votes && votes[playerId]) {
          const newVotes = { ...votes };
          delete newVotes[playerId];
          updates['gameState.votingPhase.votes'] = newVotes;
        }

        await updateDoc(roomRef, updates);
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
      // ❌ NO llamar markPlayerAsDisconnected aquí
    };
  }, [roomId, playerId]);

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
    if (currentHost && currentHost.isAlive !== false && !currentHost.hasLeft && !currentHost.isKicked) return;

    const nextHost = roomData.players.find(
      p => p.isAlive !== false && !p.isKicked && !p.hasLeft
    );

    if (nextHost && nextHost.id === playerId) {
      const updatedPlayers = roomData.players.map(p => ({
        ...p,
        isHost: p.id === playerId
      }));

      updateDoc(doc(db, 'rooms', roomId), { players: updatedPlayers }).catch(
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
