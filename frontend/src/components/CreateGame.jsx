// Frontend/src/components/CreateGame.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../utils/firebaseService';
import { avatars } from '../utils/avatars';
import { toastError } from '../utils/toast';
import './PlayerSetup.css';

function CreateGame() {
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

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('Por favor escribe tu nombre');
      toastError('Debes escribir tu nombre', {
        title: '⚠ Campo requerido',
        duration: 2500
      });
      return;
    }

    setLoading(true);
    setError('');
    
    const result = await createRoom(playerName.trim(), selectedAvatar);
    
    if (result.success) {
      localStorage.setItem('playerId', result.playerId);
      localStorage.setItem('playerName', playerName);
      localStorage.setItem('playerAvatar', JSON.stringify(selectedAvatar));
      
      navigate(`/room/${result.roomCode}`);
    } else {
      setError(result.error);
      toastError(result.error, {
        title: '❌ Error al crear',
        duration: 3000
      });
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

        <h1 className="setup-title">Crear Partida</h1>
        
        {error && (
          <div className="error-message">{error}</div>
        )}

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

        {/* Botón Crear */}
        <button 
          onClick={handleCreate}
          disabled={!playerName.trim() || loading}
          className="btn btn-primary"
        >
          {loading ? '⏳ Creando...' : '🎮 Crear Partida'}
        </button>
      </div>
    </div>
  );
}

export default CreateGame;