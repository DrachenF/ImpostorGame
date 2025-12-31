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

// Función para eliminar sala manual
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

// Crear sala
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

// Unirse a sala
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

// Suscribirse a cambios
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

export const updateRoomSettings = async (roomCode, settings) => {
  try {
    const normalizedCode = normalizeRoomCode(roomCode);
    await updateDoc(doc(db, 'rooms', normalizedCode), {
      selectedCategories: settings.selectedCategories,
      impostorCount: settings.impostorCount
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Eliminar jugador (AHORA SÍ BORRA LA SALA SI QUEDA VACÍA)
export const removePlayer = async (roomCode, playerIdToRemove) => {
  try {
    const normalizedCode = normalizeRoomCode(roomCode);
    const roomRef = doc(db, 'rooms', normalizedCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) return { success: false, error: 'Sala no encontrada' };

    const roomData = roomSnap.data();
    const remainingPlayers = roomData.players.filter(p => p.id !== playerIdToRemove);

    // --- AQUÍ ESTÁ EL CAMBIO: REACTIVAMOS LA LIMPIEZA ---
    if (remainingPlayers.length === 0) {
      await deleteDoc(roomRef); // ¡Ahora sí borramos la sala!
      console.log('🗑️ Sala eliminada al quedar vacía');
      return { success: true, roomDeleted: true };
    }
    // ----------------------------------------------------

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
  return removePlayer(roomCode, playerId);
};