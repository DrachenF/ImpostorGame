// Frontend/src/components/RoleCard.jsx
import { useState } from 'react';
import './RoleCard.css';

function RoleCard({ playerData, role, startingPlayer, direction, isHost, onInitiateVoting }) {
  const [swipeStartY, setSwipeStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const isImpostor = role.isImpostor;
  const word = role.word;

  // Calcular el porcentaje de revelado (0 a 100)
  const revealPercentage = Math.min(100, (currentY / 150) * 100);

  const handleTouchStart = (e) => {
    setSwipeStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentTouchY = e.touches[0].clientY;
    const deltaY = swipeStartY - currentTouchY;
    
    // Solo permitir deslizar hacia arriba (deltaY positivo)
    if (deltaY > 0) {
      setCurrentY(Math.min(deltaY, 300)); // Limitar a 300px máximo
    } else {
      setCurrentY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Al soltar, siempre volver a 0
    setCurrentY(0);
  };

  // Para mouse (desktop)
  const handleMouseDown = (e) => {
    setSwipeStartY(e.clientY);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaY = swipeStartY - e.clientY;
    
    if (deltaY > 0) {
      setCurrentY(Math.min(deltaY, 300));
    } else {
      setCurrentY(0);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setCurrentY(0);
  };

  return (
    <div className="rolecard-overlay">
      <div className="swipe-instruction">
        <p>Mantén presionado y desliza hacia arriba para ver tu rol</p>
        <div className="arrow-up">↑</div>
      </div>

      <div 
        className="player-card-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          transform: `translateY(-${currentY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease'
        }}
      >
        {/* Tarjeta superior - Avatar y nombre */}
        <div className="player-card-swipeable">
          <div className="player-card-content">
            <img 
              src={playerData.avatar.image} 
              alt={playerData.avatar.name}
              className="player-card-avatar"
            />
            <h3 className="player-card-name">{playerData.name}</h3>
            <p className="player-card-subtitle">{playerData.avatar.name}</p>
          </div>
          
          <div className="swipe-indicator">
            <div className="swipe-bar"></div>
          </div>
        </div>

        {/* Información revelada debajo */}
        <div 
          className={`role-info-hidden ${isImpostor ? 'impostor' : 'civil'}`}
          style={{
            opacity: revealPercentage / 100,
            pointerEvents: 'none'
          }}
        >
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
          </div>
        </div>
      </div>

      {/* Botón de iniciar votación solo para el HOST */}
      {isHost && onInitiateVoting && (
        <button 
          onClick={onInitiateVoting}
          className="btn-vote-floating"
        >
          🗳️ Iniciar Votación
        </button>
      )}
    </div>
  );
}

export default RoleCard;