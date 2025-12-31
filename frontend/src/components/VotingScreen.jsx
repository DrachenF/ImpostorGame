// Frontend/src/components/VotingScreen.jsx
import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import './VotingScreen.css';

function VotingScreen({ roomId, playerId, roomData, gameState }) {
  const [countdown, setCountdown] = useState(3);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);

  const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
  const votingPhase = gameState.votingPhase;
  const myVote = votingPhase?.votes?.[playerId];

  // Verificar victoria del impostor ANTES de la votación
  useEffect(() => {
    if (votingPhase?.active && !votingPhase?.countdownStarted && isHost) {
      // Contar impostores y civiles actuales
      const impostorCount = roomData.players.filter(p => 
        gameState.playerRoles[p.id]?.isImpostor
      ).length;
      const civilCount = roomData.players.length - impostorCount;

      // REGLA: Si impostores >= civiles, gana impostor
      if (impostorCount >= civilCount) {
        const markImpostorVictory = async () => {
          const roomRef = doc(db, 'rooms', roomId);
          await updateDoc(roomRef, {
            'gameState.votingPhase.impostorVictory': true,
            'gameState.votingPhase.showResults': true
          });
        };
        markImpostorVictory();
        return; // No iniciar countdown
      }

      // Si no hay victoria automática, iniciar countdown
      const startCountdown = async () => {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, {
          'gameState.votingPhase.countdownStarted': true
        });
        setCountdownStarted(true);
      };
      startCountdown();
    }
  }, [votingPhase?.active, countdownStarted, isHost, roomId, roomData, gameState]);

  // Countdown de votación
  useEffect(() => {
    if (votingPhase?.countdownStarted && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, votingPhase?.countdownStarted]);

  // Verificar si ya voté
  useEffect(() => {
    if (myVote) {
      setHasVoted(true);
      setSelectedPlayer(myVote);
    }
  }, [myVote]);

  const handleVote = async (targetPlayerId) => {
    if (hasVoted || targetPlayerId === playerId) return;
    
    setSelectedPlayer(targetPlayerId);
  };

  const handleConfirmVote = async () => {
    if (!selectedPlayer || hasVoted) return;
    
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      [`gameState.votingPhase.votes.${playerId}`]: selectedPlayer
    });
    
    setHasVoted(true);
  };

  // Calcular votos
  const voteCounts = {};
  if (votingPhase?.votes) {
    Object.values(votingPhase.votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });
  }

  const totalVotes = Object.keys(votingPhase?.votes || {}).length;
  const allVoted = totalVotes === roomData.players.length;

  // Si todos votaron, mostrar resultados
  if (allVoted && votingPhase?.showResults) {
    return <VotingResults roomId={roomId} playerId={playerId} roomData={roomData} gameState={gameState} />;
  }

  // Si hay victoria automática del impostor, mostrar resultados
  if (votingPhase?.impostorVictory && votingPhase?.showResults) {
    return <VotingResults roomId={roomId} playerId={playerId} roomData={roomData} gameState={gameState} />;
  }

  // Si todos votaron pero aún no se muestran resultados
  if (allVoted && !votingPhase?.showResults && isHost) {
    setTimeout(async () => {
      const roomRef = doc(db, 'rooms', roomId);
      await updateDoc(roomRef, {
        'gameState.votingPhase.showResults': true
      });
    }, 1000);
  }

  return (
    <div className="voting-screen">
      <div className="voting-header">
        <h2>🗳️ Votación</h2>
      </div>

      {votingPhase?.countdownStarted && countdown > 0 && (
        <div className="voting-countdown">
          <div className="countdown-number">{countdown}</div>
          <p>{countdown === 1 ? '¡Voten!' : '¡Prepárense para votar!'}</p>
        </div>
      )}

      {(countdown === 0 || (votingPhase?.countdownStarted && countdown <= 0)) && (
        <>
          <div className="voting-instruction">
            <p>👉 Vota por quien crees que es el impostor</p>
            <p className="vote-count">{totalVotes} / {roomData.players.length} votos</p>
          </div>

          <div className="players-voting-grid">
            {roomData.players.map(player => {
              const isMe = player.id === playerId;
              const isSelected = selectedPlayer === player.id;
              const voteCount = voteCounts[player.id] || 0;
              
              return (
                <button
                  key={player.id}
                  onClick={() => handleVote(player.id)}
                  disabled={isMe || hasVoted}
                  className={`player-vote-card ${isMe ? 'disabled' : ''} ${isSelected ? 'selected' : ''} ${hasVoted && myVote === player.id ? 'voted' : ''}`}
                >
                  <img 
                    src={player.avatar.image} 
                    alt={player.avatar.name}
                    className="player-vote-avatar"
                  />
                  <p className="player-vote-name">
                    {player.name}
                    {isMe && ' (Tú)'}
                  </p>
                  {isSelected && !hasVoted && (
                    <div className="vote-indicator">✓</div>
                  )}
                  {hasVoted && myVote === player.id && (
                    <div className="vote-indicator voted">✓ Tu voto</div>
                  )}
                  {voteCount > 0 && hasVoted && (
                    <div className="vote-badge">{voteCount}</div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedPlayer && !hasVoted && (
            <button onClick={handleConfirmVote} className="btn-confirm-vote">
              Confirmar voto
            </button>
          )}

          {hasVoted && (
            <div className="waiting-votes">
              <p>✅ Has votado. Esperando a los demás...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VotingResults({ roomId, playerId, roomData, gameState }) {
  const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
  const votingPhase = gameState.votingPhase;
  
  // Verificar si es victoria automática del impostor
  if (votingPhase?.impostorVictory) {
    return <ImpostorAutoVictory roomId={roomId} playerId={playerId} isHost={isHost} />;
  }

  // Calcular al jugador más votado
  const voteCounts = {};
  Object.values(votingPhase.votes).forEach(vote => {
    voteCounts[vote] = (voteCounts[vote] || 0) + 1;
  });
  
  const maxVotes = Math.max(...Object.values(voteCounts));
  const eliminatedPlayerId = Object.keys(voteCounts).find(id => voteCounts[id] === maxVotes);
  const eliminatedPlayer = roomData.players.find(p => p.id === eliminatedPlayerId);
  
  const wasImpostor = gameState.playerRoles[eliminatedPlayerId]?.isImpostor;
  
  // Contar impostores y civiles DESPUÉS de eliminar al votado
  const remainingPlayers = roomData.players.filter(p => p.id !== eliminatedPlayerId);
  const remainingImpostors = remainingPlayers.filter(p => 
    gameState.playerRoles[p.id]?.isImpostor
  ).length;
  const remainingCivils = remainingPlayers.length - remainingImpostors;

  // REGLA: Si después de eliminar queda 1v1 o impostores >= civiles, gana impostor
  const impostorWins = remainingImpostors >= remainingCivils && remainingImpostors > 0;
  
  // REGLA: Si no quedan impostores, ganan civiles
  const civilsWin = remainingImpostors === 0;

  const handleContinuePlaying = async () => {
    if (!isHost) return;
    
    // Actualizar estado: continuar jugando, eliminar al jugador votado
    const roomRef = doc(db, 'rooms', roomId);
    const updatedPlayers = roomData.players.filter(p => p.id !== eliminatedPlayerId);
    
    await updateDoc(roomRef, {
      players: updatedPlayers,
      'gameState.votingPhase': {
        active: false
      }
    });
  };

  const handleBackToLobby = async () => {
    if (!isHost) return;
    
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      gameState: {
        status: 'waiting'
      }
    });
  };

  return (
    <div className="voting-results">
      <h2>📊 Resultados</h2>
      
      <div className="eliminated-card">
        <img 
          src={eliminatedPlayer.avatar.image} 
          alt={eliminatedPlayer.avatar.name}
          className="eliminated-avatar"
        />
        <h3>{eliminatedPlayer.name}</h3>
        <p className="eliminated-votes">{maxVotes} votos</p>
        <div className={`role-reveal ${wasImpostor ? 'impostor' : 'civil'}`}>
          {wasImpostor ? '🎭 ERA EL IMPOSTOR' : '👤 ERA CIVIL'}
        </div>
      </div>

      {/* VICTORIA CIVILES: Eliminaron a todos los impostores */}
      {civilsWin && (
        <div className="game-over victory">
          <h3>🎉 ¡Los civiles ganaron!</h3>
          <p>Eliminaron a todos los impostores</p>
        </div>
      )}

      {/* VICTORIA IMPOSTOR: Igualdad o superioridad numérica */}
      {impostorWins && (
        <div className="game-over defeat">
          <h3>🎭 ¡El impostor ganó!</h3>
          <p>Los impostores son mayoría o están en empate</p>
        </div>
      )}

      {/* CONTINUAR JUGANDO: Aún no hay ganador definitivo */}
      {!civilsWin && !impostorWins && (
        <div className="game-continue">
          <h3>⚠️ {wasImpostor ? 'Eliminaron a un impostor' : 'Eliminaron a un civil'}</h3>
          <p>Aún hay {remainingImpostors} impostor(es) vs {remainingCivils} civil(es)</p>
        </div>
      )}

      {isHost && (
        <div className="host-decisions">
          {/* Solo permitir continuar si no hay ganador */}
          {!civilsWin && !impostorWins && (
            <button onClick={handleContinuePlaying} className="btn-continue">
              ▶️ Continuar jugando
            </button>
          )}
          <button onClick={handleBackToLobby} className="btn-lobby">
            🏠 Volver al lobby
          </button>
        </div>
      )}

      {!isHost && (
        <div className="waiting-host">
          <p>⏳ Esperando decisión del host...</p>
        </div>
      )}
    </div>
  );
}

function ImpostorAutoVictory({ roomId, playerId, isHost }) {
  const handleBackToLobby = async () => {
    if (!isHost) return;
    
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      gameState: {
        status: 'waiting'
      }
    });
  };

  return (
    <div className="voting-results">
      <div className="game-over defeat">
        <h2>🎭 ¡El impostor ganó!</h2>
        <h3>Victoria Automática</h3>
        <p>Los impostores son mayoría</p>
      </div>

      {isHost && (
        <div className="host-decisions">
          <button onClick={handleBackToLobby} className="btn-lobby">
            🏠 Volver al lobby
          </button>
        </div>
      )}

      {!isHost && (
        <div className="waiting-host">
          <p>⏳ Esperando decisión del host...</p>
        </div>
      )}
    </div>
  );
}

export default VotingScreen;