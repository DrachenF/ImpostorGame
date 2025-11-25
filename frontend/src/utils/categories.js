// Importar las imágenes
import animalesImg from '../assets/categorias/animales.png';
import comidaImg from '../assets/categorias/comida.png';
import deportesImg from '../assets/categorias/deportes.png';
import profesionesImg from '../assets/categorias/profesiones.png';
import paisesImg from '../assets/categorias/paises.png';
import objetosImg from '../assets/categorias/objetos.png';
// Agrega más imports según las categorías que tengas

export const categories = [
  {
    id: 'animales',
    name: 'Animales',
    image: animalesImg,
    words: ['perro', 'gato', 'elefante', 'león', 'tigre', 'jirafa', 'cebra', 'mono', 'oso', 'lobo']
  },
  {
    id: 'comida',
    name: 'Comida',
    image: comidaImg,
    words: ['pizza', 'hamburguesa', 'tacos', 'sushi', 'pasta', 'helado', 'ensalada', 'sopa', 'sandwich', 'burrito']
  },
  {
    id: 'deportes',
    name: 'Deportes',
    image: deportesImg,
    words: ['fútbol', 'basketball', 'tenis', 'voleibol', 'natación', 'atletismo', 'boxeo', 'ciclismo', 'golf', 'hockey']
  },
  {
    id: 'profesiones',
    name: 'Profesiones',
    image: profesionesImg,
    words: ['doctor', 'ingeniero', 'profesor', 'chef', 'policía', 'bombero', 'abogado', 'arquitecto', 'programador', 'artista']
  },
  {
    id: 'paises',
    name: 'Países',
    image: paisesImg,
    words: ['México', 'España', 'Argentina', 'Brasil', 'Francia', 'Italia', 'Japón', 'Alemania', 'China', 'India']
  },
  {
    id: 'objetos',
    name: 'Objetos',
    image: objetosImg,
    words: ['silla', 'mesa', 'lámpara', 'libro', 'reloj', 'teléfono', 'computadora', 'bolígrafo', 'llave', 'botella']
  },
  // Agrega más categorías según necesites
];