// Frontend/src/utils/gameUtils.js
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { categories } from './categories';

/**
 * Generar código de sala aleatorio (6 caracteres)
 */
export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generar ID único para jugador
 */
export function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Inicia el juego asignando roles y configurando el estado inicial
 */
export async function startGame(roomId, roomData) {
  try {
    const players = roomData.players;
    const impostorCount = roomData.impostorCount || 1;
    const selectedCategories = roomData.selectedCategories || categories.map(cat => cat.id);
    
    // Mezclar jugadores aleatoriamente
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Seleccionar impostores aleatoriamente
    const impostorIndices = [];
    while (impostorIndices.length < impostorCount) {
      const randomIndex = Math.floor(Math.random() * shuffledPlayers.length);
      if (!impostorIndices.includes(randomIndex)) {
        impostorIndices.push(randomIndex);
      }
    }
    
    // Obtener palabra aleatoria de las categorías seleccionadas
    const availableWords = [];
    selectedCategories.forEach(catId => {
      const category = categories.find(cat => cat.id === catId);
      if (category) {
        availableWords.push(...category.words);
      }
    });
    
    const secretWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    
    // Asignar roles a cada jugador
    const playerRoles = {};
    shuffledPlayers.forEach((player, index) => {
      playerRoles[player.id] = {
        isImpostor: impostorIndices.includes(index),
        word: impostorIndices.includes(index) ? null : secretWord
      };
    });
    
    // Determinar jugador inicial y dirección
    const startingPlayerIndex = Math.floor(Math.random() * shuffledPlayers.length);
    const startingPlayer = shuffledPlayers[startingPlayerIndex];
    const direction = Math.random() < 0.5 ? 'left' : 'right';
    
    // Crear orden de jugadores según la dirección
    const playerOrder = [...shuffledPlayers];
    if (direction === 'right') {
      playerOrder.reverse();
    }
    
    // Actualizar el estado del juego en Firebase
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      'gameState.status': 'starting',
      'gameState.playerRoles': playerRoles,
      'gameState.secretWord': secretWord,
      'gameState.startingPlayer': {
        id: startingPlayer.id,
        name: startingPlayer.name
      },
      'gameState.direction': direction,
      'gameState.playerOrder': playerOrder.map(p => ({
        id: p.id,
        name: p.name
      })),
      'gameState.startedAt': new Date().toISOString()
    });
    
    console.log('✅ Game started successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error starting game:', error);
    throw error;
  }
}

/**
 * Inicia la fase de votación
 */
export async function initiateVoting(roomId) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      'gameState.votingPhase': {
        active: true,
        countdownStarted: false,
        votes: {},
        showResults: false
      }
    });
    
    console.log('✅ Voting initiated successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initiating voting:', error);
    throw error;
  }
}

/**
 * Reinicia el juego
 */
export async function resetGame(roomId) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      gameState: {
        status: 'waiting'
      }
    });
    console.log('✅ Game reset successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error resetting game:', error);
    throw error;
  }
}