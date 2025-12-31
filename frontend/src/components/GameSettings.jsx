// src/components/GameSettings.jsx
import { useState, useEffect } from 'react';
import { categories } from '../utils/categories';
import './GameSettings.css';

function GameSettings({ roomData, onSave, onClose }) {
  // Estados iniciales
  const [selectedCategories, setSelectedCategories] = useState(
    roomData.selectedCategories || categories.map(cat => cat.id)
  );
  const [impostorCount, setImpostorCount] = useState(roomData.impostorCount || 1);

  // 👇 INICIAR SIEMPRE EN FALSE (APAGADO)
  const [showClues, setShowClues] = useState(false);
  const [impostorMode, setImpostorMode] = useState(false);

  // Cargar configuración guardada
  useEffect(() => {
    if (roomData) {
      // 👇 AQUÍ ESTÁ EL ARREGLO: Usamos '?? false'
      // Si el dato viene vacío, lo fuerza a APAGADO.
      setShowClues(roomData.showClues ?? false);       
      setImpostorMode(roomData.impostorMode ?? false); 
    }
  }, [roomData]);

  // --- LÓGICA: UNO APAGA AL OTRO ---
  const toggleClues = () => {
    const newValue = !showClues;
    setShowClues(newValue);
    if (newValue) setImpostorMode(false); // Si activas pistas, desactivas confusión
  };

  const toggleImpostorMode = () => {
    const newValue = !impostorMode;
    setImpostorMode(newValue);
    if (newValue) setShowClues(false); // Si activas confusión, desactivas pistas
  };

  // --- LÓGICA DE CATEGORÍAS ---
  const playerCount = roomData.players ? roomData.players.length : 1;
  const maxImpostors = Math.max(1, Math.floor(playerCount / 3)); 
  const minImpostors = 1; 

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const selectAllCategories = () => setSelectedCategories(categories.map(cat => cat.id));
  const deselectAllCategories = () => setSelectedCategories([]);
  
  const decreaseImpostors = () => {
    if (impostorCount > minImpostors) setImpostorCount(impostorCount - 1);
  };

  const increaseImpostors = () => {
    if (impostorCount < maxImpostors) setImpostorCount(impostorCount + 1);
  };

  const handleSave = () => {
    if (selectedCategories.length === 0) {
      alert('⚠️ Debes seleccionar al menos una categoría');
      return;
    }
    
    // Guardar cambios
    onSave({
      selectedCategories,
      impostorCount,
      showClues,      
      impostorMode    
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
          
          {/* 1. NÚMERO DE IMPOSTORES */}
          <div className="setting-section">
            <h3>🎭 Número de Impostores</h3>
            <div className="impostor-selector-arrows">
              <button onClick={decreaseImpostors} disabled={impostorCount <= minImpostors} className="arrow-btn">◀</button>
              <div className="impostor-count-display">{impostorCount}</div>
              <button onClick={increaseImpostors} disabled={impostorCount >= maxImpostors} className="arrow-btn">▶</button>
            </div>
            <p className="setting-info">
              {impostorCount} impostor(es) vs {playerCount - impostorCount} civil(es)
            </p>
          </div>

          {/* 2. MODO DE JUEGO (NUEVO) */}
          <div className="setting-section">
            <h3>🎮 Modo de Juego</h3>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                
                {/* OPCIÓN A: PISTAS */}
                <div 
                    onClick={toggleClues}
                    style={{
                        flex: 1,
                        minWidth: '140px',
                        padding: '15px',
                        border: showClues ? '2px solid #22c55e' : '2px solid #e5e7eb',
                        backgroundColor: showClues ? '#f0fdf4' : 'white',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <div>
                        <div style={{fontWeight: 'bold', color: '#1f2937'}}>💡 Con Pistas</div>
                        <div style={{fontSize: '0.75rem', color: '#6b7280'}}>Ayuda visual</div>
                    </div>
                    {showClues && <span style={{color: '#22c55e', fontWeight: 'bold', fontSize: '1.2rem'}}>✓</span>}
                </div>

                {/* OPCIÓN B: CONFUSIÓN */}
                <div 
                    onClick={toggleImpostorMode}
                    style={{
                        flex: 1,
                        minWidth: '140px',
                        padding: '15px',
                        border: impostorMode ? '2px solid #9333ea' : '2px solid #e5e7eb',
                        backgroundColor: impostorMode ? '#faf5ff' : 'white',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <div>
                        <div style={{fontWeight: 'bold', color: '#1f2937'}}>😵 Confusión</div>
                        <div style={{fontSize: '0.75rem', color: '#6b7280'}}>Palabra similar</div>
                    </div>
                    {impostorMode && <span style={{color: '#9333ea', fontWeight: 'bold', fontSize: '1.2rem'}}>✓</span>}
                </div>
            </div>
          </div>

          {/* 3. CATEGORÍAS */}
          <div className="setting-section">
            <div className="categories-header">
              <h3>📚 Categorías</h3>
              <div className="categories-actions">
                <button onClick={selectAllCategories} className="btn-action btn-select-all" disabled={selectedCategories.length === categories.length}>✓ Todas</button>
                <button onClick={deselectAllCategories} className="btn-action btn-deselect-all" disabled={selectedCategories.length === 0}>✕ Ninguna</button>
              </div>
            </div>
            
            <p className="setting-info">Seleccionadas: {selectedCategories.length} / {categories.length}</p>
            
            <div className="categories-grid">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`category-card ${selectedCategories.includes(category.id) ? 'selected' : ''}`}
                >
                  {category.image && <img src={category.image} alt={category.name} className="category-image" />}
                  <span className="category-name">{category.name}</span>
                  {selectedCategories.includes(category.id) && <span className="check-icon">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="btn-cancel">Cancelar</button>
          <button onClick={handleSave} className="btn-save">Guardar</button>
        </div>
      </div>
    </div>
  );
}

export default GameSettings;