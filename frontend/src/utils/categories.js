// Importar las imágenes
import animalesImg from '../assets/categorias/animales.png';
import comidaImg from '../assets/categorias/comida.png';
import deportesImg from '../assets/categorias/deportes.png';
import profesionesImg from '../assets/categorias/profesiones.png';
import paisesImg from '../assets/categorias/paises.png';
import objetosImg from '../assets/categorias/objetos.png';
import redesImg from '../assets/categorias/redes.png';
import bibliaImg from '../assets/categorias/biblia.png';
import famososImg from '../assets/categorias/famosos.png';
import peliculasImg from '../assets/categorias/peliculas-series.png';
import transportesImg from '../assets/categorias/trasportes.png';
import feoImg from '../assets/categorias/CosasQueHuelenFeo.png';
import verguenzaImg from '../assets/categorias/CosasQueDanVerguenza.png';
import escondidasImg from '../assets/categorias/CosasQueLaGenteHaceAEscondidas.png';

export const categories = [
  {
    id: 'animales',
    name: 'Animales',
    image: animalesImg,
    words: [
      'perro', 'gato', 'elefante', 'león', 'tigre', 'jirafa', 'cebra', 'mono', 'oso', 'lobo',
      'panda', 'hipopótamo', 'cocodrilo', 'serpiente', 'águila', 'halcón', 'pingüino', 'ballena', 'delfín', 'zorro',
      'koala', 'rinoceronte', 'camello', 'caballo', 'burro', 'ardilla', 'mapache', 'mariposa', 'araña', 'ciervo'
    ]
  },
  {
    id: 'comida',
    name: 'Comida',
    image: comidaImg,
    words: [
      'pizza', 'hamburguesa', 'tacos', 'sushi', 'pasta', 'helado', 'ensalada', 'sopa', 'sandwich', 'burrito',
      'pollo frito', 'nuggets', 'frijoles', 'arroz', 'steak', 'filete', 'pescado', 'camarones', 'donas', 'hot dog',
      'quesadilla', 'nachos', 'ensalada cesar', 'manzana', 'mango', 'piña', 'uvas', 'brownie', 'gelatina', 'cereal',
      'tamales', 'churros', 'arepas', 'empanadas', 'ceviche', 'gazpacho', 'paella', 'fondue', 'crepas', 'Chuchitos',
      'pupusas'
    ]
  },
  {
    id: 'deportes',
    name: 'Deportes',
    image: deportesImg,
    words: [
      'fútbol', 'basketball', 'tenis', 'voleibol', 'natación', 'atletismo', 'boxeo', 'ciclismo', 'golf', 'hockey',
      'béisbol', 'karate', 'taekwondo', 'surf', 'skateboard', 'parkour', 'halterofilia', 'remo', 'rugby', 'ping pong',
      'bádminton', 'ajedrez', 'automovilismo', 'motocross', 'patinaje', 'gimnasia', 'triatlón', 'kickboxing', 'paintball', 'cricket'
    ]
  },
  {
    id: 'profesiones',
    name: 'Profesiones',
    image: profesionesImg,
    words: [
      'doctor', 'ingeniero', 'profesor', 'chef', 'policía', 'bombero', 'abogado', 'arquitecto', 'programador', 'artista',
      'enfermero', 'piloto', 'cantante', 'actor', 'diseñador', 'electricista', 'plomero', 'psicólogo', 'dentista', 'científico',
      'astronauta', 'periodista', 'fotógrafo', 'mecánico', 'soldado', 'veterinario', 'carpintero', 'panadero', 'barbero', 'contador'
    ]
  },
  {
    id: 'paises',
    name: 'Países',
    image: paisesImg,
    words: [
      'México', 'España', 'Argentina', 'Brasil', 'Francia', 'Italia', 'Japón', 'Alemania', 'China', 'India',
      'Portugal', 'Chile', 'Perú', 'Colombia', 'Canadá', 'Rusia', 'Egipto', 'Sudáfrica', 'Australia', 'Grecia',
      'Corea del Sur', 'Filipinas', 'Noruega', 'Suecia', 'Finlandia', 'Irlanda', 'Holanda', 'Polonia', 'Marruecos', 'Venezuela'
    ]
  },
  {
    id: 'objetos',
    name: 'Objetos',
    image: objetosImg,
    words: [
      'silla', 'mesa', 'lámpara', 'libro', 'reloj', 'teléfono', 'computadora', 'bolígrafo', 'llave', 'botella',
      'caja', 'cuchara', 'tenedor', 'plato', 'control remoto', 'cartera', 'lentes', 'cargador', 'tarjeta', 'cable',
      'monitor', 'audífonos', 'mouse', 'teclado', 'calculadora', 'borrador', 'cuaderno', 'ventilador', 'escoba', 'cepillo'
    ]
  },
  {
    id: 'redes',
    name: 'Redes Sociales',
    image: redesImg,
    words: [
      'Facebook', 'Instagram', 'Twitter', 'TikTok', 'YouTube', 'WhatsApp', 'Telegram', 'Snapchat', 'Discord', 'Reddit',
      'LinkedIn', 'Twitch', 'Pinterest',  'Messenger'
    ]
  },
  {
    id: 'biblia',
    name: 'Biblia',
    image: bibliaImg,
    words: [
      'Jesús', 'Moisés', 'Noé', 'David', 'Goliat', 'Jonás', 'Adán', 'Eva', 'Abraham', 'Pablo',
      'Pedro', 'José', 'María', 'Elías', 'Satanás', 'Apocalipsis', 'Salmos', 'Genesis', 'Éxodo', 'Arca de Noé'
    ]
  },
  {
    id: 'famosos',
    name: 'Famosos',
    image: famososImg,
    words: [
      'Messi', 'Cristiano', 'Bad Bunny', 'Kim Kardashian', 'Shakira', 'The Rock', 'Eminem', 'Taylor Swift', 'Selena Gomez', 'Lionel Messi',
      'Will Smith', 'Dwayne Johnson', 'Jennifer Lopez', 'Michael Jackson', 'Drake', 'Rihanna', 'Keanu Reeves', 'Jackie Chan', 'Tom Holland', 'Billie Eilish'
    ]
  },
  {
    id: 'peliculas-series',
    name: 'Películas y Series',
    image: peliculasImg,
    words: [
      'Titanic', 'Avatar', 'Harry Potter', 'Star Wars', 'The Avengers', 'Matrix', 'Breaking Bad', 'Game of Thrones', 'Friends', 'Stranger Things',
      'Naruto', 'Dragon Ball', 'Peaky Blinders', 'Shrek', 'Jurassic Park', 'Toy Story', 'El Rey León', 'Rápidos y Furiosos', 'Narnia', 'Terminator'
    ]
  },
  {
    id: 'transportes',
    name: 'Transportes',
    image: transportesImg,
    words: [
      'avión', 'barco', 'tren', 'moto', 'helicóptero', 'camión', 'tractor', 'submarino', 'scooter', 'autobús',
      'patineta', 'limusina', 'metro', 'globo aerostático', 'lancha', 'triciclo', 'trimarán', 'yate', 'dron', 'jet privado'
    ]
  },
  {
    id: 'CosasQueHuelenFeo',
    name: 'Cosas Que Huelen Feo',
    image: feoImg,
    words: [
      'axila', 'calcetín sudado', 'queso podrido', 'huevo podrido', 'baño público', 'pez muerto', 'zapato viejo', 'pescado', 'basura', 'perro mojado',
      'pedo', 'moho', 'alcantarilla', 'leche cortada', 'sudor', 'cebolla cruda', 'pate', 'pañal sucio', 'camiseta sudada', 'pescadería'
    ]
  },
  {
    id: 'CosasQueDanVerguenza',
    name: 'Cosas Que Dan Vergüenza',
    image: verguenzaImg,
    words: [
      'caerse en público', 'confundir a alguien', 'decir un chiste malo', 'saludar y no te responden', 'llamar maestro a tu mamá', 'pedorrearte',
      'que te regañen en público', 'que te revisen el historial de Google', 'que se te salga un gallo al hablar', 'olvidar el nombre de alguien',
      'tener mal aliento', 'piso mojado y te caes', 'hacer un TikTok', 'subir una foto vergonzosa', 'que te etiqueten en una mala foto',
      'mandar mensaje al chat equivocado', 'roncar', 'llegar tarde', 'quedarte dormido hablando', 'que te vean cantando solo'
    ]
  },
  {
    id: 'CosasQueLaGenteHaceAEscondidas',
    name: 'Cosas Que La Gente Hace a Escondidas',
    image: escondidasImg,
    words: [
      'oler su propio olor', 'mirarse el espejo mucho', 'stalkeo en redes', 'espiar conversaciones', 'leer chats ajenos', 'rascarse la nalga',
      'comer a escondidas', 'mentir', 'agarrar comida extra', 'robar wifi', 'revisar el celular del otro', 'mover cosas y negar', 'revisar WhatsApp Web',
      'revisar el historial del otro', 'buscar memes raros', 'criticar', 'hablar solo', 'tomarse selfies', 'practicar respuestas sociales', 'verse videos raros en internet'
    ]
  }
];
