// src/utils/gameUtils.js
import { db } from '../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore'; 
import { categories } from './categories';

// --- Generadores ---
export const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generatePlayerId = () => {
  return 'player-' + Math.random().toString(36).substr(2, 9);
};

// --- Lógica de Palabras (CORREGIDA) ---
export const getRandomWord = (categoryId) => {
  const category = categories.find(c => c.id === categoryId);
  if (!category || !category.words || category.words.length === 0) return null;

  const selectedObj = category.words[Math.floor(Math.random() * category.words.length)];
  const clueType = Math.random() < 0.5 ? 'easy' : 'hard'; 

  // Buscamos la propiedad correcta (word, text o name)
  const realWord = selectedObj.word || selectedObj.text || selectedObj.name || "Error";

  return {
    word: realWord,
    similar: selectedObj.similar || "Palabra Similar",
    clue: selectedObj.clues ? selectedObj.clues[clueType] : "Sin pista"
  };
};

// --- INICIAR JUEGO (Blindado) ---
export const startGame = async (roomCode, oldRoomData) => {
  try {
    // 1. Obtener datos frescos de la BD
    const roomRef = doc(db, 'rooms', roomCode);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) throw new Error("La sala no existe");
    const freshRoomData = roomSnap.data();

    const availableCategories = freshRoomData.selectedCategories;
    if (!availableCategories || availableCategories.length === 0) throw new Error("Sin categorías");

    // 2. Configuración
    const isConfusionMode = freshRoomData.impostorMode === true;
    const isCluesMode = freshRoomData.showClues === true;

    // 3. Palabra
    const randomCatId = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    const wordData = getRandomWord(randomCatId);
    if (!wordData) throw new Error("Error obteniendo palabra");

    const activeClue = isCluesMode && !isConfusionMode ? wordData.clue : null;

    // 4. Preparar Jugadores (COPIA PROFUNDA)
    const players = freshRoomData.players.map(p => ({ ...p }));
    
    // Calcular impostores
    let impostorCount = freshRoomData.impostorCount || 1;
    if (impostorCount >= players.length) impostorCount = Math.max(1, Math.floor(players.length / 3));

    // Resetear a todos
    players.forEach(p => {
      p.isImpostor = false;
      p.word = wordData.word; 
      p.clue = null;
      p.isAlive = true; 
    });

    // 5. Asignar Impostores
    let assignedImpostors = 0;
    const playerIndices = players.map((_, index) => index); 
    
    while (assignedImpostors < impostorCount && playerIndices.length > 0) {
      const randomIndex = Math.floor(Math.random() * playerIndices.length);
      const originalIndex = playerIndices.splice(randomIndex, 1)[0];
      
      players[originalIndex].isImpostor = true;
      
      if (isConfusionMode) {
        players[originalIndex].word = wordData.similar;
        players[originalIndex].clue = null; 
      } else {
        players[originalIndex].word = "ERES EL IMPOSTOR";
        players[originalIndex].clue = activeClue; 
      }
      assignedImpostors++;
    }

    // 6. Generar Quién Inicia (CORREGIDO PARA EVITAR "ALEATORIO")
    let startName = "Jugador 1";
    if (players.length > 0) {
        const randomStartPlayer = players[Math.floor(Math.random() * players.length)];
        startName = randomStartPlayer.name; // Usamos el nombre real
    }
    
    const direction = Math.random() < 0.5 ? 'left' : 'right';

    // 7. Guardar en Firebase
    await updateDoc(roomRef, {
      status: 'playing',
      currentCategory: randomCatId,
      players: players, 
      startTime: new Date().toISOString(),
      gameState: {
        status: 'playing',
        startingPlayerName: startName, 
        direction: direction,
        votingPhase: { active: false, showResults: false, votes: {} }
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error start:", error);
    return { success: false, error: error.message };
  }
};

export const initiateVoting = async (roomCode) => {
  try {
    const roomRef = doc(db, 'rooms', roomCode);
    await updateDoc(roomRef, {
      status: 'voting',
      'gameState.votingPhase': {
        active: true,
        votes: {},
        showResults: false,
        forceGameOver: null 
      }
    });
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
};

export const resetGame = async (roomCode) => {
  try {
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'waiting',
      gameState: { status: 'waiting' }
    });
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
};