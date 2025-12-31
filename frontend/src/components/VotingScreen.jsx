// Frontend/src/components/VotingScreen.jsx
import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './VotingScreen.css';

function VotingScreen({ roomId, playerId, roomData }) {
  const [selectedVote, setSelectedVote] = useState(null);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  
  const votingState = roomData.gameState?.votingPhase || {};
  const votes = votingState.votes || {};
  const showResults = votingState.showResults || false;
  const forceGameOver = votingState.forceGameOver;
  
  const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
  const myPlayer = roomData.players.find(p => p.id === playerId);
  const amIAlive = myPlayer?.isAlive !== false; 
  const myVote = votes[playerId];

  useEffect(() => {
    if (myVote) {
      setHasConfirmed(true);
      setSelectedVote(myVote);
    } else if (!myVote && hasConfirmed) {
      setHasConfirmed(false);
      setSelectedVote(null);
    }
  }, [myVote, hasConfirmed]);

  const confirmVote = async () => {
    if (!selectedVote || hasConfirmed || !amIAlive) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [`gameState.votingPhase.votes.${playerId}`]: selectedVote
      });
      setHasConfirmed(true);
    } catch (e) { console.error(e); }
  };

  // --- KICK PLAYER ---
  const handleKickPlayer = async (targetId) => {
    if (!window.confirm("¿Sacar a este jugador de la partida permanentemente?")) return;
    try {
      const updatedPlayers = roomData.players.map(p => {
        if (p.id === targetId) return { ...p, isAlive: false, isKicked: true };
        return p;
      });
      await updateDoc(doc(db, 'rooms', roomId), { players: updatedPlayers });
    } catch (error) { console.error(error); }
  };

  // Host revisa avance
  useEffect(() => {
    if (isHost && !showResults && !forceGameOver) {
      const alivePlayers = roomData.players.filter(p => p.isAlive !== false);
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
    return <ResultsView roomId={roomId} roomData={roomData} votes={votes} isHost={isHost} forceGameOver={forceGameOver} />;
  }

  return (
    <div className="voting-screen">
      <div className="voting-header">
        <h2>🗳️ VOTACIÓN</h2>
        <p className="subtitle">{amIAlive ? "¿Quién es el impostor?" : "Estás eliminado 👻"}</p>
      </div>

      <div className="players-voting-grid">
        {roomData.players.map(p => {
          // No mostramos a los kickeados NI a los que se fueron (hasLeft)
          if (p.isKicked || p.hasLeft) return null; 

          const isMe = p.id === playerId;
          const isSelected = selectedVote === p.id; 
          const isAlive = p.isAlive !== false;
          const hasPlayerVoted = votes[p.id] !== undefined;

          if (!isAlive) return null;

          return (
            <div key={p.id} className="vote-card-wrapper" style={{position: 'relative'}}>
              <button 
                onClick={() => amIAlive && !hasConfirmed && !isMe && setSelectedVote(p.id)}
                className={`player-vote-card ${isSelected ? 'selected' : ''} ${isMe || !amIAlive ? 'disabled' : ''}`}
                disabled={hasConfirmed || isMe || !amIAlive}
              >
                <img src={p.avatar.image} alt="avatar" className="player-vote-avatar" />
                <span className="player-vote-name">
                  {p.name} {isMe && '(Tú)'}
                </span>
                {hasPlayerVoted && <div className="voted-badge">✅ LISTO</div>}
                {isSelected && <div className="vote-indicator">🎯</div>}
              </button>

              {isHost && !isMe && (
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
          <button className="btn-confirm-vote" disabled={!selectedVote || !amIAlive} onClick={confirmVote}>
            {amIAlive ? "CONFIRMAR VOTO" : "ESPECTANDO..."}
          </button>
        )}
        <p className="vote-count" style={{marginTop: 20}}>
           {Object.keys(votes).length} votos recibidos
        </p>
      </div>
    </div>
  );
}

// --- RESULTADOS CON LIMPIEZA DE ABANDONOS ---
function ResultsView({ roomId, roomData, votes, isHost, forceGameOver }) {
  
  const backToLobby = async () => {
    // 🧹 LIMPIEZA MAESTRA 🧹
    // Filtramos: NO KICKEADOS y NO HAN ABANDONADO (hasLeft)
    const cleanPlayersList = roomData.players
      .filter(p => !p.isKicked && !p.hasLeft) 
      .map(p => ({ 
        ...p, 
        isAlive: true,        // Revivimos a los que quedaron
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
        <div className="eliminated-card" style={{borderColor: isCitizensWin ? '#3b82f6' : '#DC2626'}}>
          <div style={{fontSize: '4rem'}}>🏃💨</div>
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
  Object.values(votes).forEach(v => voteCounts[v] = (voteCounts[v] || 0) + 1);
  const sortedIds = Object.keys(voteCounts).sort((a,b) => voteCounts[b] - voteCounts[a]);
  let isTie = (sortedIds.length >= 2 && voteCounts[sortedIds[0]] === voteCounts[sortedIds[1]]) || sortedIds.length === 0;

  const loserId = sortedIds[0];
  const loserPlayer = roomData.players.find(p => p.id === loserId);
  const wasImpostor = loserPlayer?.isImpostor;

  const currentAliveImpostors = roomData.players.filter(p => p.isImpostor && p.isAlive !== false).length;
  const currentAliveCitizens = roomData.players.filter(p => !p.isImpostor && p.isAlive !== false).length;
  let nextAliveImp = currentAliveImpostors;
  let nextAliveCit = currentAliveCitizens;
  if (!isTie) { wasImpostor ? nextAliveImp-- : nextAliveCit--; }

  const citizensWin = !isTie && nextAliveImp === 0;
  const impostorsWin = !isTie && nextAliveImp >= nextAliveCit;

  const resetVoting = async () => updateDoc(doc(db, 'rooms', roomId), { 'gameState.votingPhase': { active: true, votes: {}, showResults: false } });
  
  const eliminateAndContinue = async () => {
    const updatedPlayers = roomData.players.map(p => p.id === loserId ? { ...p, isAlive: false } : p);
    await updateDoc(doc(db, 'rooms', roomId), { players: updatedPlayers, 'gameState.votingPhase': { active: true, votes: {}, showResults: false } });
  };

  if (isTie) return <div className="voting-results"><h2>🤝 EMPATE</h2>{isHost && <button onClick={resetVoting} className="btn-continue">REPETIR</button>}</div>;
  if (citizensWin) return <div className="voting-results"><h2>🎉 VICTORIA</h2><div className="eliminated-card"><img src={loserPlayer?.avatar.image} alt="loser" className="eliminated-avatar" /><h3>{loserPlayer?.name}</h3><div className="role-reveal impostor">🎭 ERA EL IMPOSTOR</div></div><div className="game-over victory"><h3>GANAN CIUDADANOS</h3></div>{isHost && <button onClick={backToLobby} className="btn-lobby">LOBBY</button>}</div>;
  if (impostorsWin) return <div className="voting-results"><h2>💀 GAME OVER</h2><div className="eliminated-card"><img src={loserPlayer?.avatar.image} alt="loser" className="eliminated-avatar" /><h3>{loserPlayer?.name}</h3><div className={`role-reveal ${wasImpostor ? 'impostor' : 'civil'}`}>{wasImpostor ? 'ERA IMPOSTOR' : 'ERA CIUDADANO'}</div></div><div className="game-over defeat"><h3>GANAN IMPOSTORES</h3></div>{isHost && <button onClick={backToLobby} className="btn-lobby">LOBBY</button>}</div>;

  return (
    <div className="voting-results">
      <h2>👋 ELIMINADO</h2>
      <div className="eliminated-card"><img src={loserPlayer?.avatar.image} alt="loser" className="eliminated-avatar" /><h3>{loserPlayer?.name}</h3><div className={`role-reveal ${wasImpostor ? 'impostor' : 'civil'}`}>{wasImpostor ? 'ERA IMPOSTOR' : 'ERA CIUDADANO'}</div></div>
      {isHost && <button onClick={eliminateAndContinue} className="btn-continue">CONTINUAR</button>}
    </div>
  );
}

export default VotingScreen;