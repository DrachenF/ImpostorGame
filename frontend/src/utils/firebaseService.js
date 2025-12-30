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
import { categories } from './categories'; // ← IMPORTAR categories

export const deleteRoom = async (roomCode) => {
  try {
    await deleteDoc(doc(db, 'rooms', roomCode));
    console.log('🗑️ Sala eliminada:', roomCode);
    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando sala:', error);
    return { success: false, error: error.message };
  }
};

// Crear una nueva sala
export const createRoom = async (hostName, avatar) => {
  const roomCode = generateRoomCode();
  const playerId = generatePlayerId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 horas desde ahora
  
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
    selectedCategories: categories.map(cat => cat.id), // ← INICIALIZAR con todas las categorías
    impostorCount: 1, // ← INICIALIZAR con 1 impostor por defecto
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString() // ← Fecha de expiración
  };

  try {
    await setDoc(doc(db, 'rooms', roomCode), roomData);
    console.log('✅ Sala creada:', roomCode);
    console.log('⏰ Expira a las:', expiresAt.toLocaleTimeString());
    return { success: true, roomCode, playerId };
  } catch (error) {
    console.error('❌ Error creando sala:', error);
    return { success: false, error: error.message };
  }
};

// Unirse a una sala existente
export const joinRoom = async (roomCode, playerName, avatar) => {
  const playerId = generatePlayerId();
  
  try {
    const roomRef = doc(db, 'rooms', roomCode);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      return { success: false, error: 'Sala no encontrada' };
    }

    const roomData = roomSnap.data();
    
    // Verificar si la sala ha expirado
    if (roomData.expiresAt) {
      const expirationDate = new Date(roomData.expiresAt);
      const now = new Date();
      
      if (now >= expirationDate) {
        console.log('⏰ Sala expirada, eliminando...');
        await deleteDoc(roomRef);
        return { success: false, error: 'Esta sala ha expirado' };
      }
    }
    
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

    console.log('✅ Jugador unido a sala:', roomCode);
    return { success: true, roomCode, playerId };
  } catch (error) {
    console.error('❌ Error uniéndose a sala:', error);
    return { success: false, error: error.message };
  }
};

// Escuchar cambios en tiempo real de una sala
export const subscribeToRoom = (roomCode, callback) => {
  const roomRef = doc(db, 'rooms', roomCode);
  
  const unsubscribe = onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      
      // Verificar si la sala ha expirado
      if (data.expiresAt) {
        const expirationDate = new Date(data.expiresAt);
        const now = new Date();
        
        if (now >= expirationDate) {
          console.log('⏰ Sala expirada, eliminando...');
          // Eliminar la sala expirada
          deleteRoom(roomCode);
          callback(null); // Notificar que la sala ya no existe
          return;
        }
      }
      
      callback(data);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
};

// Actualizar configuración de la sala
export const updateRoomSettings = async (roomCode, settings) => {
  try {
    const roomRef = doc(db, 'rooms', roomCode);
    await updateDoc(roomRef, {
      selectedCategories: settings.selectedCategories,
      impostorCount: settings.impostorCount
    });
    console.log('✅ Configuración actualizada');
    return { success: true };
  } catch (error) {
    console.error('❌ Error actualizando configuración:', error);
    return { success: false, error: error.message };
  }
};

// Eliminar jugador de la sala
export const removePlayer = async (roomCode, playerIdToRemove) => {
  try {
    const roomRef = doc(db, 'rooms', roomCode);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return { success: false, error: 'Sala no encontrada' };
    }

    const roomData = roomSnap.data();
    const playerWasHost = roomData.players.some(p => p.id === playerIdToRemove && p.isHost);
    const remainingPlayers = roomData.players.filter(p => p.id !== playerIdToRemove);

    if (remainingPlayers.length === 0) {
      await deleteDoc(roomRef);
      console.log('ℹ️ Sala eliminada al quedar sin jugadores');
      return { success: true, roomDeleted: true };
    }

    let newHostId = roomData.host;
    const updatedPlayers = remainingPlayers.map(player => ({
      ...player,
      isHost: false
    }));

    if (playerWasHost || !remainingPlayers.some(p => p.id === roomData.host)) {
      newHostId = remainingPlayers[0].id;
      updatedPlayers[0].isHost = true;
    } else {
      const currentHostIndex = updatedPlayers.findIndex(p => p.id === roomData.host);
      if (currentHostIndex !== -1) {
        updatedPlayers[currentHostIndex].isHost = true;
      }
    }

    await updateDoc(roomRef, {
      players: updatedPlayers,
      host: newHostId
    });

    console.log('✅ Jugador eliminado');
    if (playerWasHost) {
      console.log(`👑 Nuevo host asignado: ${newHostId}`);
    }

    return { success: true, newHostId };
  } catch (error) {
    console.error('❌ Error eliminando jugador:', error);
    return { success: false, error: error.message };
  }
};

export const leaveRoom = async (roomCode, playerId) => {
  if (!roomCode || !playerId) {
    return { success: false, error: 'Datos de sala incompletos' };
  }

  return removePlayer(roomCode, playerId);
};