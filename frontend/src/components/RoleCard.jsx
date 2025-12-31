// Frontend/src/components/RoleCard.jsx
import { useState } from 'react';
import './RoleCard.css';

function RoleCard({ playerData, role, startingPlayer, direction, isHost, onInitiateVoting }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const isImpostor = role.isImpostor;
  const word = role.word;

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="rolecard-overlay">
      <div className="tap-instruction">
        <p>Toca la tarjeta para revelar tu rol</p>
        <div className="tap-icon">👆</div>
      </div>

      <div 
        className={`flip-card-container ${isFlipped ? 'flipped' : ''}`}
        onClick={handleCardClick}
      >
        {/* FRENTE - Avatar y nombre */}
        <div className="flip-card-front">
          <div className="player-card-content">
            <img 
              src={playerData.avatar.image} 
              alt={playerData.avatar.name}
              className="player-card-avatar"
            />
            <h3 className="player-card-name">{playerData.name}</h3>
            <p className="player-card-subtitle">{playerData.avatar.name}</p>
          </div>
          
          <div className="tap-indicator">
            <div className="tap-bar"></div>
          </div>
        </div>

        {/* REVERSO - Información del rol */}
        <div className={`flip-card-back ${isImpostor ? 'impostor' : 'civil'}`}>
          <div className="rolecard-header">
            <h2>{isImpostor ? '🎭 ERES EL IMPOSTOR' : '👤 ERES CIVIL'}</h2>
          </div>

          <div className="rolecard-body">
            {isImpostor ? (
              <>
                <p className="role-description">
                  Tu misión es descubrir la palabra secreta sin que te identifiquen.
                </p>
                <div className="word-box impostor-box">
                  <span className="word-label">Tu palabra:</span>
                  <span className="word-text">???</span>
                  <p className="word-hint">No conoces la palabra secreta</p>
                </div>
              </>
            ) : (
              <>
                <p className="role-description">
                  Tu misión es identificar al impostor. Todos ustedes conocen la palabra.
                </p>
                <div className="word-box civil-box">
                  <span className="word-label">Palabra secreta:</span>
                  <span className="word-text">{word}</span>
                </div>
              </>
            )}

            <div className="game-info">
              <div className="info-item">
                <span className="info-icon">🎯</span>
                <span className="info-text">
                  Inicia: <strong>{startingPlayer.name}</strong>
                </span>
              </div>
              <div className="info-item">
                <span className="info-icon">↻</span>
                <span className="info-text">
                  Dirección: <strong>{direction === 'left' ? '← Izquierda' : '→ Derecha'}</strong>
                </span>
              </div>
            </div>

            <div className="tap-back-hint">
              Toca para volver
            </div>
          </div>
        </div>
      </div>

      {/* Botón de iniciar votación solo para el HOST */}
      {isHost && onInitiateVoting && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onInitiateVoting();
          }}
          className="btn-vote-floating"
        >
          🗳️ Iniciar Votación
        </button>
      )}
    </div>
  );
}

export default RoleCard;