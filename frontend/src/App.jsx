// Frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import CreateGame from './components/CreateGame';
import JoinGame from './components/JoinGame';
import WaitingRoom from './components/WaitingRoom';
import './App.css';
import '../src/utils/toast.css'; // Importar estilos del toast

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateGame />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/room/:roomCode" element={<WaitingRoom />} />
      </Routes>
    </Router>
  );
}

export default App;