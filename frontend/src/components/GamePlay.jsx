// Frontend/src/components/GamePlay.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { leaveRoom } from '../utils/firebaseService';
import { initiateVoting } from '../utils/gameUtils';
import { categories } from '../utils/categories';
import RoleCard from './RoleCard';
import VotingScreen from './VotingScreen';
import './GamePlay.css';

function GamePlay({ roomId, playerId }) {
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [roomExpired, setRoomExpired] = useState(false);

  // 1. Suscripción a la Sala
  useEffect(() => {
    const roomRef = doc(db, 'rooms', roomId);
    
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoomData(data);
        
        const currentStatus = data.status;

        if (currentStatus === 'playing' && countdown === null) {
          setCountdown(3);
        }
        
        const currentPlayer = data.players.find(p => p.id === playerId);
        if (currentPlayer) {
          setPlayerData(currentPlayer);
          if (currentPlayer.isKicked) {
             navigate('/');
          }
        } else {
            navigate('/');
        }
      } else {
        setRoomExpired(true);
      }
    });

    return () => unsubscribe();
  }, [roomId, playerId, countdown, navigate]);


  // 🚨 2. AUTO-ELIMINACIÓN AL SALIR (MODIFICADO) 🚨
  useEffect(() => {
    const handlePlayerExit = async () => {
      if (!roomData || !playerData) return;
      const isGameActive = roomData.status === 'playing' || roomData.status === 'voting';

      if (isGameActive && playerData.isAlive) {
        try {
          await leaveRoom(roomId, playerId);
        } catch (e) {
          console.error("No pude marcarme como muerto al salir:", e);
        }
      }
    };

    const onBeforeUnload = (e) => {
        handlePlayerExit();
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [roomId, playerId, roomData, playerData]);


  // 3. Lógica de ÁRBITRO
  useEffect(() => {
    if (!roomData || !playerData || !playerData.isHost) return;
    
    const isGameActive = roomData.status === 'playing' || (roomData.status === 'voting' && !roomData.gameState?.votingPhase?.showResults);
    
    if (isGameActive) {
      const activeImpostors = roomData.players.filter(p => p.isImpostor && p.isAlive !== false).length;
      const activeCitizens = roomData.players.filter(p => !p.isImpostor && p.isAlive !== false).length;

      if (activeImpostors === 0) {
        finishGameByAbandonment('citizens_win');
      }
      else if (activeImpostors >= activeCitizens) {
        finishGameByAbandonment('impostors_win');
      }
    }
  }, [roomData]); 

  // 4. Timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 5. HERENCIA DEL TRONO
  useEffect(() => {
    if (!roomData || !playerData) return;

    const currentHost = roomData.players.find(p => p.isHost);
    
    // Si NO hay host O el host actual está muerto/eliminado/fuera
    if (!currentHost || currentHost.isAlive === false) {
       
       const nextKing = roomData.players.find(p => p.isAlive !== false && !p.isKicked && !p.hasLeft);

       if (nextKing && nextKing.id === playerId && playerData.isAlive !== false) {
         console.log("👑 El Rey ha caído. ¡Yo soy el nuevo Host!");
         
         const newPlayersList = roomData.players.map(p => ({
           ...p,
           isHost: p.id === playerId
         }));
         
         updateDoc(doc(db, 'rooms', roomId), { players: newPlayersList })
           .catch(e => console.error("Error heredando trono:", e));
       }
    }
  }, [roomData, playerId, playerData]);

  const finishGameByAbandonment = async (reason) => {
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'voting',
        'gameState.votingPhase': { 
            active: true, 
            showResults: true,
            votes: {}, 
            forceGameOver: reason 
        }
      });
    } catch (e) { console.error(e); }
  };

  const handleInitiateVoting = async () => {
    const isHost = roomData?.players.find(p => p.id === playerId)?.isHost;
    if (!isHost) return;
    try {
      await initiateVoting(roomId);
    } catch (error) { console.error(error); }
  };

  if (roomExpired) {
    return (
      <div className="gameplay-container"><div className="expired-overlay"><h2>Sala Cerrada</h2><button onClick={() => navigate('/')}>Salir</button></div></div>
    );
  }

  if (!roomData || !playerData) return null;

  if (roomData.status === 'voting') {
    return <VotingScreen roomId={roomId} playerId={playerId} roomData={roomData} />;
  }

  const currentCategoryObj = categories.find(c => c.id === roomData.currentCategory);
  const isHost = roomData.players.find(p => p.id === playerId)?.isHost;
  const startingPlayerName = roomData.gameState?.startingPlayerName || "Aleatorio";
  const direction = roomData.gameState?.direction || "right";

  return (
    <div className="gameplay-container">
      {countdown !== null && countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-circle"><span className="countdown-number">{countdown}</span></div>
          <p className="countdown-text">Preparando...</p>
        </div>
      )}

      {countdown === 0 && (
        <RoleCard 
          playerData={playerData}
          role={playerData.isImpostor ? 'impostor' : 'citizen'}
          startingPlayerName={startingPlayerName}
          direction={direction}
          onInitiateVoting={handleInitiateVoting}
          isHost={isHost}
          impostorMode={roomData.impostorMode}
        />
      )}
    </div>
  );
}

export default GamePlay;