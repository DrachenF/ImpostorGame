// Frontend/src/components/RoleCard.jsx
import { useState } from 'react';
import './RoleCard.css';

function RoleCard({ 
  playerData, 
  role, 
  startingPlayerName, 
  direction, 
  isHost, 
  onInitiateVoting,
  impostorMode 
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Leemos directo de playerData para evitar errores
  const isImpostorReal = playerData.isImpostor; 
  const isImpostorVisual = impostorMode ? false : isImpostorReal;
  
  const word = playerData.word || "Error"; 
  const clue = playerData.clue;

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleVoteClick = (e) => {
    e.stopPropagation();
    if (onInitiateVoting) onInitiateVoting();
  };

  return (
    <div className="rolecard-overlay">
      <div className="role-card-wrapper">
        
        <div 
          className={`flip-card-container ${isFlipped ? 'flipped' : ''}`}
          onClick={handleCardClick}
        >
          <div className="flip-card-inner">
            
            <div className="flip-card-front">
              <div className="card-face-content">
                <div className="tap-icon">👆</div>
                <h2>TOCA PARA REVELAR</h2>
                <div className="player-badge">
                  <img src={playerData.avatar.image} alt="avatar" />
                  <span>{playerData.name}</span>
                </div>
                {impostorMode && (
                  <div className="confusion-badge-front">⚠️ MODO CONFUSIÓN ACTIVO</div>
                )}
              </div>
            </div>

            <div className={`flip-card-back ${isImpostorVisual ? 'impostor-theme' : 'civil-theme'}`}>
              <div className="card-face-content content-scrollable">
                
                <div className="role-header">
                  <span className="role-icon">{isImpostorVisual ? '🤫' : '👤'}</span>
                  <h3>{isImpostorVisual ? 'ERES EL IMPOSTOR' : 'ERES CIVIL'}</h3>
                </div>

                {impostorMode && (
                  <div className="confusion-warning-banner">
                    ⚠️ ALERTA: MODO CONFUSIÓN ⚠️
                    <small>Tu rol visual y palabra pueden ser una trampa.</small>
                  </div>
                )}

                <div className="word-section">
                  <p className="label-small">TU PALABRA SECRETA:</p>
                  <h1 className="main-word">{word}</h1>
                </div>

                {clue && (
                  <div className="clue-container">
                    <div className="clue-icon">💡</div>
                    <div className="clue-info">
                      <span className="clue-label">PISTA VISUAL</span>
                      <span className="clue-value">{clue}</span>
                    </div>
                  </div>
                )}

                <p className="instruction-text">
                  {isImpostorReal
                    ? '¡Engaña a todos! Nadie sabe que eres tú.'
                    : 'Encuentra al mentiroso. ¡Haz buenas preguntas!'}
                </p>

                <div className="turn-info-box">
                  <div className="turn-row">
                    <span>🎯 Inicia:</span>
                    <strong>{startingPlayerName || 'Aleatorio'}</strong>
                  </div>
                  <div className="turn-row">
                    <span>↻ Sentido:</span>
                    <strong>{direction === 'left' ? '← Izquierda' : '→ Derecha'}</strong>
                  </div>
                </div>

                <p className="tap-hint">(Toca para ocultar)</p>
              </div>
            </div>
          </div>
        </div>

        {isHost && (
          <button 
            onClick={handleVoteClick} 
            className={`btn-start-voting-fixed ${isFlipped ? 'btn-on-red' : 'btn-on-white'}`}
          >
            🗳️ Iniciar Votación
          </button>
        )}
      </div>
    </div>
  );
}

export default RoleCard;