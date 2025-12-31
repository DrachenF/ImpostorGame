// src/utils/firebaseService.js
import { db } from '../config/firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  deleteDoc,
  runTransaction,
  serverTimestamp
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
        isAlive: true,
        joinedAt: Date.now(),
        lastSeenAt: serverTimestamp()
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

    if (roomData.expiresAt && new Date() > new Date(roomData.expiresAt)) {
      return { success: false, error: 'Sala expirada' };
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
      isAlive: true,
      joinedAt: Date.now(),
      lastSeenAt: serverTimestamp()
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
      const isExpired = Boolean(
        data.expiresAt && new Date() > new Date(data.expiresAt)
      );

      callback({ ...data, isExpired });
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
export const removePlayer = async (roomCode, playerIdToRemove, options = {}) => {
  const { reason = 'leave', kickedBy = null } = options;
  try {
    const normalizedCode = normalizeRoomCode(roomCode);
    const roomRef = doc(db, 'rooms', normalizedCode);
    let result = { success: false };

    await runTransaction(db, async (transaction) => {
      const roomSnap = await transaction.get(roomRef);
      if (!roomSnap.exists()) {
        result = { success: false, error: 'Sala no encontrada' };
        return;
      }

      const roomData = roomSnap.data();
      const players = roomData.players || [];
      const targetPlayer = players.find(p => p.id === playerIdToRemove);
      if (!targetPlayer) {
        result = { success: true };
        return;
      }

      const remainingPlayers = players.filter(p => p.id !== playerIdToRemove);

      if (remainingPlayers.length === 0) {
        transaction.delete(roomRef);
        result = { success: true, roomDeleted: true };
        return;
      }

      let updatedPlayers = remainingPlayers.map(p => ({ ...p, isHost: false }));

      const hostStillPresent = updatedPlayers.some(p => p.id === roomData.host);
      const needsNewHost = !hostStillPresent || targetPlayer.isHost;
      let newHostId = roomData.host;

      if (needsNewHost) {
        const ordered = [...updatedPlayers].sort((a, b) => {
          const aJoined = a.joinedAt || 0;
          const bJoined = b.joinedAt || 0;
          if (aJoined === bJoined) return a.id.localeCompare(b.id);
          return aJoined - bJoined;
        });
        const candidate = ordered.find(p => !p.hasLeft && !p.isKicked) || ordered[0];
        if (candidate) {
          newHostId = candidate.id;
        }
      }

      updatedPlayers = updatedPlayers.map(p => ({
        ...p,
        isHost: p.id === newHostId
      }));

      const updates = {
        players: updatedPlayers,
        host: newHostId
      };

      if (reason === 'kick') {
        const kickedPlayers = roomData.kickedPlayers || {};
        updates.kickedPlayers = {
          ...kickedPlayers,
          [playerIdToRemove]: {
            kicked: true,
            kickedAt: Date.now(),
            kickedBy
          }
        };
      }

      const votingPhase = roomData.gameState?.votingPhase;
      if (votingPhase?.votes) {
        const cleanedVotes = {};
        for (const [voterId, targetId] of Object.entries(votingPhase.votes)) {
          if (voterId === playerIdToRemove || targetId === playerIdToRemove) continue;
          if (!remainingPlayers.some(p => p.id === voterId)) continue;
          if (!remainingPlayers.some(p => p.id === targetId)) continue;
          cleanedVotes[voterId] = targetId;
        }
        updates['gameState.votingPhase.votes'] = cleanedVotes;
      }

      transaction.update(roomRef, updates);
      result = { success: true, newHostId };
    });

    return result;
  } catch (error) {
    console.error('❌ Error eliminando jugador:', error);
    return { success: false, error: error.message };
  }
};

export const leaveRoom = async (roomCode, playerId) => {
  if (!roomCode || !playerId) return { success: false };
  return removePlayer(roomCode, playerId);
};

export const kickPlayer = async (roomCode, playerId, kickedBy) => {
  return removePlayer(roomCode, playerId, { reason: 'kick', kickedBy });
};

const getLastSeenMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number') return value;
  return 0;
};

const chooseHost = (players, currentHostId, excludedIds = new Set()) => {
  const ordered = [...players].sort((a, b) => {
    const aJoined = a.joinedAt || 0;
    const bJoined = b.joinedAt || 0;
    if (aJoined === bJoined) return a.id.localeCompare(b.id);
    return aJoined - bJoined;
  });

  const candidate = ordered.find(
    (p) => !p.hasLeft && !p.isKicked && !excludedIds.has(p.id)
  );
  return candidate ? candidate.id : currentHostId;
};

export const heartbeatPlayer = async (roomCode, playerId) => {
  if (!roomCode || !playerId) return;

  const normalizedCode = normalizeRoomCode(roomCode);
  const roomRef = doc(db, 'rooms', normalizedCode);

  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) return;

    const roomData = roomSnap.data();
    const players = roomData.players || [];
    const exists = players.some((p) => p.id === playerId && !p.isKicked && !p.hasLeft);
    if (!exists) return;

    const updatedPlayers = players.map((p) =>
      p.id === playerId
        ? { ...p, lastSeenAt: serverTimestamp(), hasLeft: false }
        : p
    );

    transaction.update(roomRef, { players: updatedPlayers });
  });
};

export const pruneInactivePlayers = async (roomCode, thresholdMs = 30000) => {
  if (!roomCode) return { success: false };

  const normalizedCode = normalizeRoomCode(roomCode);
  const roomRef = doc(db, 'rooms', normalizedCode);
  let result = { success: false };

  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) return;

    const roomData = roomSnap.data();
    const players = roomData.players || [];
    const now = Date.now();

    const stalePlayers = players.filter((p) => {
      const seen = getLastSeenMillis(p.lastSeenAt || p.lastSeen);
      return !p.isKicked && !p.hasLeft && seen > 0 && now - seen > thresholdMs;
    });

    if (!stalePlayers.length) {
      result = { success: true, removed: 0 };
      return;
    }

    const staleIds = new Set(stalePlayers.map((p) => p.id));
    const remainingPlayers = players.filter((p) => !staleIds.has(p.id));

    if (!remainingPlayers.length) {
      transaction.delete(roomRef);
      result = { success: true, roomDeleted: true, removed: stalePlayers.length };
      return;
    }

    const newHostId = chooseHost(remainingPlayers, roomData.host);
    const updatedPlayers = remainingPlayers.map((p) => ({
      ...p,
      isHost: p.id === newHostId
    }));

    const updates = {
      players: updatedPlayers,
      host: newHostId
    };

    const votingPhase = roomData.gameState?.votingPhase;
    if (votingPhase?.votes) {
      const cleanedVotes = {};
      for (const [voterId, targetId] of Object.entries(votingPhase.votes)) {
        if (staleIds.has(voterId) || staleIds.has(targetId)) continue;
        if (!remainingPlayers.some((p) => p.id === voterId)) continue;
        if (!remainingPlayers.some((p) => p.id === targetId)) continue;
        cleanedVotes[voterId] = targetId;
      }
      updates['gameState.votingPhase.votes'] = cleanedVotes;
    }

    transaction.update(roomRef, updates);
    result = { success: true, removed: stalePlayers.length, newHostId };
  });

  return result;
};

export const transferHost = async (roomCode, targetPlayerId) => {
  if (!roomCode || !targetPlayerId) return { success: false };

  const normalizedCode = normalizeRoomCode(roomCode);
  const roomRef = doc(db, 'rooms', normalizedCode);
  let result = { success: false };

  await runTransaction(db, async (transaction) => {
    const roomSnap = await transaction.get(roomRef);
    if (!roomSnap.exists()) return;

    const roomData = roomSnap.data();
    const players = roomData.players || [];
    const target = players.find(
      (p) => p.id === targetPlayerId && !p.isKicked && !p.hasLeft
    );
    if (!target) {
      result = { success: false, error: 'Jugador no válido' };
      return;
    }

    const updatedPlayers = players.map((p) => ({
      ...p,
      isHost: p.id === targetPlayerId
    }));

    transaction.update(roomRef, {
      players: updatedPlayers,
      host: targetPlayerId
    });
    result = { success: true, newHostId: targetPlayerId };
  });

  return result;
};