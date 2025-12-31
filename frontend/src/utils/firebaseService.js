// src/utils/firebaseService.js
import { db } from '../config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { generateRoomCode, generatePlayerId } from './gameUtils';
import { categories } from './categories';

// Helper para normalizar códigos
const normalizeRoomCode = (code) =>
  (code ?? '').toString().trim().toUpperCase().replace(/\s+/g, '');

// Función para eliminar sala manualmente
export const deleteRoom = async (roomCode) => {
  const normalizedCode = normalizeRoomCode(roomCode);
  try {
    await deleteDoc(doc(db, 'rooms', normalizedCode));
    console.log('🗑️ Sala eliminada:', normalizedCode);
    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando sala:', error);
    return { success: false, error: error.message };
  }
};

// Crear una nueva sala
export const createRoom = async (hostName, avatar) => {
  const rawCode = generateRoomCode();
  const roomCode = normalizeRoomCode(rawCode);
  
  const playerId = generatePlayerId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); 

  const roomData = {
    code: roomCode,
    host: playerId,
    players: [
      {
        id: playerId,
        name: hostName,
        avatar: avatar,
        isHost: true,
        isImpostor: false,
        isAlive: true
      }
    ],
    status: 'waiting',
    word: null,
    currentRound: 0,
    selectedCategories: categories.map(cat => cat.id),
    impostorCount: 1,
    
    // 👇 AQUÍ FORZAMOS QUE NAZCAN APAGADOS
    showClues: false,     
    impostorMode: false,  
    
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  try {
    await setDoc(doc(db, 'rooms', roomCode), roomData);
    console.log('✅ Sala creada:', roomCode);
    return { success: true, roomCode, playerId };
  } catch (error) {
    console.error('❌ Error creando sala:', error);
    return { success: false, error: error.message };
  }
};

// Unirse a una sala existente
export const joinRoom = async (roomCode, playerName, avatar) => {
  const playerId = generatePlayerId();
  const normalizedCode = normalizeRoomCode(roomCode);

  try {
    const roomRef = doc(db, 'rooms', normalizedCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return { success: false, error: 'Sala no encontrada' };
    }

    const roomData = roomSnap.data();

    if (roomData.status !== 'waiting') {
      return { success: false, error: 'El juego ya comenzó' };
    }

    const nameExists = roomData.players.some(p => p.name === playerName);
    if (nameExists) {
      return { success: false, error: 'Ese nombre ya está en uso' };
    }

    const newPlayer = {
      id: playerId,
      name: playerName,
      avatar: avatar,
      isHost: false,
      isImpostor: false,
      isAlive: true
    };

    await updateDoc(roomRef, {
      players: arrayUnion(newPlayer)
    });

    return { success: true, roomCode: normalizedCode, playerId };
  } catch (error) {
    console.error('❌ Error uniéndose a sala:', error);
    return { success: false, error: error.message };
  }
};

// Escuchar cambios en tiempo real
export const subscribeToRoom = (roomCode, callback) => {
  const normalizedCode = normalizeRoomCode(roomCode);
  const roomRef = doc(db, 'rooms', normalizedCode);

  const unsubscribe = onSnapshot(roomRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
         deleteRoom(normalizedCode);
         callback(null);
         return;
      }
      callback(data);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
};

// Actualizar configuración
export const updateRoomSettings = async (roomCode, settings) => {
  try {
    const normalizedCode = normalizeRoomCode(roomCode);
    await updateDoc(doc(db, 'rooms', normalizedCode), {
      selectedCategories: settings.selectedCategories,
      impostorCount: settings.impostorCount,
      // 👇 GUARDAMOS LAS OPCIONES NUEVAS
      showClues: settings.showClues, 
      impostorMode: settings.impostorMode
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Eliminar jugador
export const removePlayer = async (roomCode, playerIdToRemove) => {
  try {
    const normalizedCode = normalizeRoomCode(roomCode);
    const roomRef = doc(db, 'rooms', normalizedCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) return { success: false, error: 'Sala no encontrada' };

    const roomData = roomSnap.data();
    const remainingPlayers = roomData.players.filter(p => p.id !== playerIdToRemove);

    if (remainingPlayers.length === 0) {
      await deleteDoc(roomRef);
      return { success: true, roomDeleted: true };
    }

    const playerWasHost = roomData.players.some(p => p.id === playerIdToRemove && p.isHost);
    let newHostId = roomData.host;
    const updatedPlayers = remainingPlayers.map(p => ({ ...p, isHost: false }));

    if (playerWasHost || !remainingPlayers.some(p => p.id === roomData.host)) {
      newHostId = remainingPlayers[0].id;
      updatedPlayers[0].isHost = true;
    } else {
      const currentHostIndex = updatedPlayers.findIndex(p => p.id === roomData.host);
      if (currentHostIndex !== -1) updatedPlayers[currentHostIndex].isHost = true;
    }

    await updateDoc(roomRef, { players: updatedPlayers, host: newHostId });
    return { success: true, newHostId };

  } catch (error) {
    console.error('❌ Error eliminando jugador:', error);
    return { success: false, error: error.message };
  }
};

export const leaveRoom = async (roomCode, playerId) => {
  if (!roomCode || !playerId) return { success: false };

  const normalizedCode = normalizeRoomCode(roomCode);
  const roomRef = doc(db, 'rooms', normalizedCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return { success: false, error: 'Sala no encontrada' };

  const roomData = roomSnap.data();
  const playerExists = roomData.players.some(p => p.id === playerId);
  if (!playerExists) return { success: false, error: 'Jugador no encontrado' };

  // Si el juego no ha comenzado, lo eliminamos completamente
  if (roomData.status === 'waiting') {
    return removePlayer(normalizedCode, playerId);
  }

  const updatedPlayers = roomData.players.map(p =>
    p.id === playerId ? { ...p, isAlive: false, hasLeft: true } : p
  );

  const updates = { players: updatedPlayers };

  // Si estaba votando y ya había emitido voto, lo eliminamos del conteo
  if (roomData.status === 'voting' && roomData.gameState?.votingPhase?.votes) {
    const newVotes = { ...roomData.gameState.votingPhase.votes };
    delete newVotes[playerId];
    updates['gameState.votingPhase.votes'] = newVotes;
  }

  const aliveImpostors = updatedPlayers.filter(p => p.isImpostor && p.isAlive !== false).length;
  const aliveCitizens = updatedPlayers.filter(p => !p.isImpostor && p.isAlive !== false).length;

  if (aliveImpostors === 0) {
    updates.status = 'voting';
    updates['gameState.votingPhase'] = {
      active: true,
      showResults: true,
      votes: {},
      forceGameOver: 'citizens_win'
    };
  } else if (aliveImpostors >= aliveCitizens) {
    updates.status = 'voting';
    updates['gameState.votingPhase'] = {
      active: true,
      showResults: true,
      votes: {},
      forceGameOver: 'impostors_win'
    };
  }

  await updateDoc(roomRef, updates);
  return { success: true };
};