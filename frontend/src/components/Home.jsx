// Frontend/src/components/Home.jsx
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1 className="home-title">🎭 Juego del Impostor</h1>
      
      <p className="subtitle">¿Quién es el impostor?</p>

      <div className="section-create">
        <button 
          onClick={() => navigate('/create')}
          className="btn btn-create"
        >
          Crear Nueva Partida
        </button>
      </div>

      <hr className="divider" />

      <div className="section-join">
        <button 
          onClick={() => navigate('/join')}
          className="btn btn-join"
        >
          Unirse a Partida
        </button>
      </div>
    </div>
  );
}

export default Home;