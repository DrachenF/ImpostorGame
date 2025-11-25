// Frontend/src/components/JoinGame.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../utils/firebaseService';
import { avatars } from '../utils/avatars';
import './PlayerSetup.css';

function JoinGame() {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const selectedAvatar = avatars[currentAvatarIndex];

  const handlePrevAvatar = () => {
    setCurrentAvatarIndex((prev) => 
      prev === 0 ? avatars.length - 1 : prev - 1
    );
  };

  const handleNextAvatar = () => {
    setCurrentAvatarIndex((prev) => 
      prev === avatars.length - 1 ? 0 : prev + 1
    );
  };

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      setError('Por favor ingresa el código de sala');
      return;
    }
    if (!playerName.trim()) {
      setError('Por favor escribe tu nombre');
      return;
    }

    setLoading(true);
    setError('');
    
    const result = await joinRoom(roomCode.toUpperCase(), playerName.trim(), selectedAvatar);
    
    if (result.success) {
      localStorage.setItem('playerId', result.playerId);
      localStorage.setItem('playerName', playerName);
      localStorage.setItem('playerAvatar', JSON.stringify(selectedAvatar));
      
      navigate(`/room/${result.roomCode}`);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <button 
          onClick={() => navigate('/')} 
          className="btn-back"
        >
          ← Volver
        </button>

        <h1 className="setup-title">Unirse a Partida</h1>
        
        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* Input Código */}
        <div className="section">
          <label>Código de sala:</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Ejemplo: ABC123"
            maxLength={6}
            disabled={loading}
            className="input-code"
          />
        </div>

        {/* Selector de Avatar con Carrusel */}
        <div className="section">
          <label>Elige tu personaje:</label>
          <div className="avatar-carousel">
            <button 
              onClick={handlePrevAvatar}
              className="carousel-btn carousel-btn-left"
              disabled={loading}
              type="button"
            >
              ←
            </button>
            
            <div className="avatar-display">
              <img 
                src={selectedAvatar.image} 
                alt={selectedAvatar.name}
                className="avatar-main-image"
              />
            </div>
            
            <button 
              onClick={handleNextAvatar}
              className="carousel-btn carousel-btn-right"
              disabled={loading}
              type="button"
            >
              →
            </button>
          </div>
          <p className="avatar-name">{selectedAvatar.name}</p>
          <p className="avatar-counter">{currentAvatarIndex + 1} / {avatars.length}</p>
        </div>

        {/* Input de Nombre */}
        <div className="section">
          <label>Tu nombre:</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Escribe tu nombre"
            maxLength={15}
            disabled={loading}
            className="input-name"
          />
        </div>

        {/* Botón Unirse */}
        <button 
          onClick={handleJoin}
          disabled={!roomCode.trim() || !playerName.trim() || loading}
          className="btn btn-primary"
        >
          {loading ? '⏳ Uniéndose...' : '🚪 Unirse'}
        </button>
      </div>
    </div>
  );
}

export default JoinGame;