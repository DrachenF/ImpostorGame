import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { removePlayer, kickPlayer, heartbeatPlayer, pruneInactivePlayers, leaveRoom } from '../utils/firebaseService';
import { toastWarning } from '../utils/toast';
import './VotingScreen.css';

function VotingScreen({ roomId, playerId, roomData }) {
  const [selectedVote, setSelectedVote] = useState(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [kickedNotified, setKickedNotified] = useState(false);
  const lastCleanupRef = useRef(0);
  const navigate = useNavigate();

  const votingState = roomData.gameState?.votingPhase || {};
  const votes = votingState.votes || {};
  const showResults = votingState.showResults || false;
  const forceGameOver = votingState.forceGameOver;

  const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
  const myPlayer = roomData.players.find(p => p.id === playerId);
  const kickedPlayers = roomData.kickedPlayers || {};
  const isKicked = kickedPlayers[playerId]?.kicked || myPlayer?.isKicked;

  const amIAlive =
    myPlayer?.isAlive !== false &&
    !myPlayer?.hasLeft &&
    !myPlayer?.isKicked &&
    !isKicked;

  const myVote = votes[playerId];

  useEffect(() => {
    if (!isKicked && myPlayer) return;
    if (!kickedNotified) {
      setKickedNotified(true);
      toastWarning('Has sido expulsado', { duration: 2200, title: 'Expulsado', closable: false });
    }
    navigate('/');
  }, [isKicked, navigate, myPlayer, kickedNotified]);

  useEffect(() => {
    if (myVote) {
      setHasConfirmed(true);
      setSelectedVote(myVote);
    } else if (!myVote && hasConfirmed) {
      setHasConfirmed(false);
      setSelectedVote(null);
    }
  }, [myVote, hasConfirmed]);

  useEffect(() => {
    const beat = () => heartbeatPlayer(roomId, playerId).catch(() => {});
    beat();
    const id = setInterval(beat, 12000);
    return () => clearInterval(id);
  }, [roomId, playerId]);

  useEffect(() => {
    if (!isHost) return;

    const activePlayerIds = roomData.players
      .filter(p => !p.isKicked && !p.hasLeft)
      .map(p => p.id);

    const cleanedVotes = {};
    let changed = false;

    for (const [voterId, targetId] of Object.entries(votes)) {
      if (voterId === targetId) { changed = true; continue; }
      if (!activePlayerIds.includes(voterId) || !activePlayerIds.includes(targetId)) {
        changed = true;
        continue;
      }
      cleanedVotes[voterId] = targetId;
    }

    if (changed) {
      updateDoc(doc(db, 'rooms', roomId), {
        'gameState.votingPhase.votes': cleanedVotes
      }).catch(console.error);
    }
  }, [votes, isHost, roomData.players, roomId]);

  // ✅ AUTO-ELIMINACIÓN + LIMPIEZA DE VOTOS AL SALIR EN VOTACIÓN
  useEffect(() => {
    const markPlayerAsDisconnected = async () => {
      try {
        await removePlayer(roomId, playerId);
      } catch (e) {
        console.error('Error marcando salida en votación:', e);
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

  useEffect(() => {
    return () => {
      if (!kickedNotified) leaveRoom(roomId, playerId);
    };
  }, [roomId, playerId, kickedNotified]);

  const confirmVote = async () => {
    if (!selectedVote || hasConfirmed || !amIAlive) return;
    if (selectedVote === playerId) return;

    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [`gameState.votingPhase.votes.${playerId}`]: selectedVote
      });
      setHasConfirmed(true);
    } catch (e) {
      console.error(e);
    }
  };

  // --- KICK PLAYER ---
  const handleKickPlayer = async (targetId) => {
    if (!window.confirm("¿Sacar a este jugador de la partida permanentemente?")) return;
    try {
      await kickPlayer(roomId, targetId, playerId);
    } catch (error) {
      console.error(error);
    }
  };

  // ✅ HOST: recalcula ganador automáticamente durante votación si alguien se fue
  useEffect(() => {
    if (!isHost) return;
    if (showResults || forceGameOver) return;
    if (roomData.status !== 'voting') return;

    const alivePlayers = roomData.players.filter(p =>
      p.isAlive !== false && !p.isKicked && !p.hasLeft
    );

    const aliveImpostors = alivePlayers.filter(p => p.isImpostor).length;
    const aliveCitizens = alivePlayers.filter(p => !p.isImpostor).length;

    if (alivePlayers.length > 0) {
      if (aliveImpostors === 0) {
        updateDoc(doc(db, 'rooms', roomId), {
          'gameState.votingPhase.forceGameOver': 'citizens_win',
          'gameState.votingPhase.showResults': true
        }).catch(console.error);
        return;
      }
      if (aliveImpostors >= aliveCitizens) {
        updateDoc(doc(db, 'rooms', roomId), {
          'gameState.votingPhase.forceGameOver': 'impostors_win',
          'gameState.votingPhase.showResults': true
        }).catch(console.error);
        return;
      }
    }
  }, [roomData, isHost, showResults, forceGameOver, roomId]);

  // Host revisa avance (cuándo mostrar resultados normales)
  useEffect(() => {
    if (isHost && !showResults && !forceGameOver) {
      const alivePlayers = roomData.players.filter(p =>
        p.isAlive !== false && !p.isKicked && !p.hasLeft
      );

      const totalVotes = Object.keys(votes).length;

      if (totalVotes >= alivePlayers.length && alivePlayers.length > 0) {
        setTimeout(async () => {
          await updateDoc(doc(db, 'rooms', roomId), {
            'gameState.votingPhase.showResults': true
          });
        }, 1500);
      }
    }
  }, [votes, isHost, showResults, roomData, roomId, forceGameOver]);

  if (showResults || forceGameOver) {
    return (
      <ResultsView
        roomId={roomId}
        roomData={roomData}
        votes={votes}
        isHost={isHost}
        forceGameOver={forceGameOver}
      />
    );
  }

  return (
    <div className="voting-screen">
      <div className="voting-header">
        <h2>🗳️ VOTACIÓN</h2>
        <p className="subtitle">{amIAlive ? "¿Quién es el impostor?" : "Estás eliminado 👻"}</p>
      </div>

      <div className="players-voting-grid">
        {roomData.players.map(p => {
          // kick = fuera permanente (lo ocultamos)
          if (p.isKicked) return null;

          const isMe = p.id === playerId;
          const isSelected = selectedVote === p.id;
          const hasPlayerVoted = votes[p.id] !== undefined;

          const isDead = p.isAlive === false;
          const hasLeft = !!p.hasLeft;

          // Solo se puede votar por jugadores vivos/presentes (no yo, no muertos, no salidos)
          const canBeVoted = !isMe && !isDead && !hasLeft;

          return (
            <div key={p.id} className="vote-card-wrapper" style={{ position: 'relative' }}>
              <button
                onClick={() => amIAlive && !hasConfirmed && canBeVoted && setSelectedVote(p.id)}
                className={`player-vote-card ${isSelected ? 'selected' : ''} ${(isMe || !amIAlive || !canBeVoted) ? 'disabled' : ''} ${isMe ? 'self-card' : ''}`}
                disabled={hasConfirmed || !amIAlive || !canBeVoted}
                style={{
                  opacity: isMe ? 0.35 : (isDead || hasLeft) ? 0.45 : 1,
                  filter: (isDead || hasLeft) ? 'grayscale(1)' : 'none'
                }}
              >
                <img src={p.avatar.image} alt="avatar" className="player-vote-avatar" />
                <span className="player-vote-name">
                  {p.name} {isMe && '(Tú)'}
                </span>

                {hasLeft && <div className="voted-badge">🚪 SALIÓ</div>}
                {!hasLeft && isDead && <div className="voted-badge">☠️ MUERTO</div>}

                {hasPlayerVoted && !hasLeft && !isDead && <div className="voted-badge">✅ LISTO</div>}
                {isSelected && <div className="vote-indicator">🎯</div>}
              </button>

              {isHost && !isMe && !hasLeft && !isDead && (
                <button
                  className="btn-kick-ghost"
                  onClick={() => handleKickPlayer(p.id)}
                  style={{ opacity: hasPlayerVoted ? 0.3 : 1 }}
                  title="Eliminar inactivo"
                >
                  💀
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="footer-action">
        {hasConfirmed ? (
          <div className="waiting-votes"><p>Esperando a los demás...</p></div>
        ) : (
          <button
            className="btn-confirm-vote"
            disabled={!selectedVote || !amIAlive}
            onClick={confirmVote}
          >
            {amIAlive ? "CONFIRMAR VOTO" : "ESPECTANDO..."}
          </button>
        )}

        <p className="vote-count" style={{ marginTop: 20 }}>
          {Object.keys(votes).length} votos recibidos
        </p>
      </div>
    </div>
  );
}

// --- RESULTADOS CON LIMPIEZA DE ABANDONOS ---
function ResultsView({ roomId, roomData, votes, isHost, forceGameOver }) {
  const backToLobby = async () => {
    // Filtramos: NO KICKEADOS y NO HAN ABANDONADO (hasLeft)
    const cleanPlayersList = roomData.players
      .filter(p => !p.isKicked && !p.hasLeft)
      .map(p => ({
        ...p,
        isAlive: true,
        isImpostor: false,
        word: '',
        clue: ''
      }));

    await updateDoc(doc(db, 'rooms', roomId), {
      status: 'waiting',
      gameState: { status: 'waiting' },
      players: cleanPlayersList
    });
  };

  if (forceGameOver) {
    const isCitizensWin = forceGameOver === 'citizens_win';
    return (
      <div className="voting-results">
        <h2>🚨 JUEGO TERMINADO</h2>
        <div className="eliminated-card" style={{ borderColor: isCitizensWin ? '#3b82f6' : '#DC2626' }}>
          <div style={{ fontSize: '4rem' }}>🏃💨</div>
          <h3>{isCitizensWin ? 'Impostor huyó' : 'Ciudadanos huyeron'}</h3>
        </div>
        <div className={`game-over ${isCitizensWin ? 'victory' : 'defeat'}`}>
          <h3>{isCitizensWin ? 'VICTORIA CIUDADANA' : 'VICTORIA IMPOSTORA'}</h3>
        </div>
        {isHost && <button onClick={backToLobby} className="btn-lobby">🏠 VOLVER AL LOBBY</button>}
      </div>
    );
  }

  const voteCounts = {};
  Object.values(votes).forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });
  const sortedIds = Object.keys(voteCounts).sort((a, b) => voteCounts[b] - voteCounts[a]);

  const isTie =
    (sortedIds.length >= 2 && voteCounts[sortedIds[0]] === voteCounts[sortedIds[1]]) ||
    sortedIds.length === 0;

  const loserId = sortedIds[0];
  const loserPlayer = roomData.players.find(p => p.id === loserId);
  const wasImpostor = loserPlayer?.isImpostor;

  const currentAliveImpostors = roomData.players.filter(
    p => p.isImpostor && p.isAlive !== false && !p.isKicked && !p.hasLeft
  ).length;

  const currentAliveCitizens = roomData.players.filter(
    p => !p.isImpostor && p.isAlive !== false && !p.isKicked && !p.hasLeft
  ).length;

  let nextAliveImp = currentAliveImpostors;
  let nextAliveCit = currentAliveCitizens;
  if (!isTie && loserPlayer) {
    wasImpostor ? nextAliveImp-- : nextAliveCit--;
  }

  const citizensWin = !isTie && nextAliveImp === 0;
  const impostorsWin = !isTie && nextAliveImp >= nextAliveCit;

  const resetVoting = async () =>
    updateDoc(doc(db, 'rooms', roomId), {
      'gameState.votingPhase': { active: true, votes: {}, showResults: false }
    });

  const eliminateAndContinue = async () => {
    if (!loserPlayer) return resetVoting();
    const updatedPlayers = roomData.players.map(p => p.id === loserId ? { ...p, isAlive: false } : p);

    await updateDoc(doc(db, 'rooms', roomId), {
      players: updatedPlayers,
      'gameState.votingPhase': { active: true, votes: {}, showResults: false }
    });
  };

  if (isTie) {
    return (
      <div className="voting-results">
        <h2>🤝 EMPATE</h2>
        {isHost && <button onClick={resetVoting} className="btn-continue">REPETIR</button>}
      </div>
    );
  }

  if (citizensWin) {
    return (
      <div className="voting-results">
        <h2>🎉 VICTORIA</h2>
        <div className="eliminated-card">
          <img src={loserPlayer?.avatar.image} alt="loser" className="eliminated-avatar" />
          <h3>{loserPlayer?.name}</h3>
          <div className="role-reveal impostor">🎭 ERA EL IMPOSTOR</div>
        </div>
        <div className="game-over victory"><h3>GANAN CIUDADANOS</h3></div>
        {isHost && <button onClick={backToLobby} className="btn-lobby">LOBBY</button>}
      </div>
    );
  }

  if (impostorsWin) {
    return (
      <div className="voting-results">
        <h2>💀 GAME OVER</h2>
        <div className="eliminated-card">
          <img src={loserPlayer?.avatar.image} alt="loser" className="eliminated-avatar" />
          <h3>{loserPlayer?.name}</h3>
          <div className={`role-reveal ${wasImpostor ? 'impostor' : 'civil'}`}>
            {wasImpostor ? 'ERA IMPOSTOR' : 'ERA CIUDADANO'}
          </div>
        </div>
        <div className="game-over defeat"><h3>GANAN IMPOSTORES</h3></div>
        {isHost && <button onClick={backToLobby} className="btn-lobby">LOBBY</button>}
      </div>
    );
  }

  return (
    <div className="voting-results">
      <h2>👋 ELIMINADO</h2>
      <div className="eliminated-card">
        <img src={loserPlayer?.avatar.image} alt="loser" className="eliminated-avatar" />
        <h3>{loserPlayer?.name}</h3>
        <div className={`role-reveal ${wasImpostor ? 'impostor' : 'civil'}`}>
          {wasImpostor ? 'ERA IMPOSTOR' : 'ERA CIUDADANO'}
        </div>
      </div>
      {isHost && <button onClick={eliminateAndContinue} className="btn-continue">CONTINUAR</button>}
    </div>
  );
}

export default VotingScreen;
