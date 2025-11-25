// Frontend/src/components/GameSettings.jsx
import { useState } from 'react';
import { categories } from '../utils/categories';
import './GameSettings.css';

function GameSettings({ roomData, onSave, onClose }) {
  const [selectedCategories, setSelectedCategories] = useState(
    roomData.selectedCategories || categories.map(cat => cat.id)
  );
  const [impostorCount, setImpostorCount] = useState(roomData.impostorCount || 1);

  // Calcular máximo de impostores: 1 por cada 3 jugadores
  const playerCount = roomData.players.length;
  const maxImpostors = Math.max(1, Math.floor(playerCount / 3)); // Mínimo 1 impostor
  const minImpostors = 1; // Siempre debe haber al menos 1 impostor

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        // Permitir deseleccionar todas
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories.map(cat => cat.id));
  };

  const deselectAllCategories = () => {
    // Deseleccionar todas las categorías
    setSelectedCategories([]);
  };

  const decreaseImpostors = () => {
    if (impostorCount > minImpostors) {
      setImpostorCount(impostorCount - 1);
    }
  };

  const increaseImpostors = () => {
    if (impostorCount < maxImpostors) {
      setImpostorCount(impostorCount + 1);
    }
  };

  const handleSave = () => {
    // Validar que haya al menos una categoría seleccionada
    if (selectedCategories.length === 0) {
      alert('⚠️ Debes seleccionar al menos una categoría');
      return;
    }
    
    onSave({
      selectedCategories,
      impostorCount
    });
    onClose();
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ Configuración</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div className="settings-content">
          {/* Número de Impostores */}
          <div className="setting-section">
            <h3>🎭 Número de Impostores</h3>
            <div className="impostor-selector-arrows">
              <button 
                onClick={decreaseImpostors}
                disabled={impostorCount <= minImpostors}
                className="arrow-btn"
              >
                ◀
              </button>
              <div className="impostor-count-display">
                {impostorCount}
              </div>
              <button 
                onClick={increaseImpostors}
                disabled={impostorCount >= maxImpostors}
                className="arrow-btn"
              >
                ▶
              </button>
            </div>
            <p className="setting-info">
              {impostorCount} impostor(es) vs {playerCount - impostorCount} civil(es)
            </p>
            <p className="setting-hint">
              💡 1 impostor por cada 3 jugadores (máximo: {maxImpostors})
            </p>
          </div>

          {/* Categorías */}
          <div className="setting-section">
            <div className="categories-header">
              <h3>📚 Categorías de Palabras</h3>
              <div className="categories-actions">
                <button 
                  onClick={selectAllCategories}
                  className="btn-action btn-select-all"
                  disabled={selectedCategories.length === categories.length}
                >
                  ✓ Todas
                </button>
                <button 
                  onClick={deselectAllCategories}
                  className="btn-action btn-deselect-all"
                  disabled={selectedCategories.length === 0}
                >
                  ✕ Ninguna
                </button>
              </div>
            </div>
            
            <p className="setting-info">
              Seleccionadas: {selectedCategories.length} / {categories.length}
            </p>
            
            <div className="categories-grid">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`category-card ${selectedCategories.includes(category.id) ? 'selected' : ''}`}
                >
                  {category.image && (
                    <img 
                      src={category.image} 
                      alt={category.name}
                      className="category-image"
                    />
                  )}
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">
                    {category.words.length} palabras
                  </span>
                  {selectedCategories.includes(category.id) && (
                    <span className="check-icon">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="btn-cancel">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-save">
            Guardar {selectedCategories.length === 0 && '⚠️'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameSettings;