import type { Language } from "./types";

/**
 * Minimal open word lists for gameplay validation.
 * Production should use full hunspell/ENABLE lexicons — see docs/README.md for copyright caveats.
 */
const ENGLISH_WORDS = new Set([
  "A", "AA", "AB", "AD", "AE", "AG", "AH", "AI", "AL", "AM", "AN", "AR", "AS", "AT", "AW", "AX", "AY",
  "BE", "BI", "BO", "BY", "DO", "GO", "HE", "HI", "HO", "IF", "IN", "IS", "IT", "ME", "MY", "NO", "OF",
  "ON", "OR", "OX", "PI", "SO", "TO", "UP", "US", "WE", "CAT", "DOG", "WORD", "PLAY", "GAME", "TILE",
  "SCORE", "BOARD", "HELLO", "WORLD", "QUIZ", "JAZZ", "PIZZA", "QUICK", "BROWN", "FOX", "JUMPS", "OVER",
  "LAZY", "SCRABBLE", "TILES", "RACK", "BINGO", "BLANK", "WILD", "LETTER", "POINTS", "VALID", "TEST",
  "HOUSE", "MOUSE", "STONE", "PHONE", "PLANE", "TRAIN", "WATER", "FIRE", "EARTH", "WIND", "CLOUD",
  "STAR", "MOON", "SUN", "TREE", "LEAF", "ROOT", "BRANCH", "FRUIT", "APPLE", "PEAR", "GRAPE", "BERRY",
  "CAKE", "MILK", "BREAD", "RICE", "MEAT", "FISH", "BIRD", "LION", "TIGER", "BEAR", "WOLF", "DEER",
  "HORSE", "SHEEP", "GOAT", "DUCK", "FROG", "SNAKE", "WHALE", "SHARK", "CRAB", "LOBSTER", "OCTOPUS",
  "SQUID", "JELLY", "CORAL", "SAND", "ROCK", "HILL", "MOUNT", "VALLEY", "RIVER", "LAKE", "OCEAN", "SEA",
  "BAY", "COAST", "BEACH", "ISLAND", "DESERT", "FOREST", "JUNGLE", "SWAMP", "MARSH", "FIELD", "FARM",
  "CITY", "TOWN", "VILLAGE", "STREET", "ROAD", "PATH", "BRIDGE", "TOWER", "CASTLE", "PALACE", "TEMPLE",
  "CHURCH", "SCHOOL", "COLLEGE", "LIBRARY", "MUSEUM", "THEATER", "CINEMA", "STADIUM", "ARENA", "PARK",
  "GARDEN", "FLOWER", "ROSE", "LILY", "TULIP", "DAISY", "ORCHID", "VIOLET", "IRIS", "LOTUS", "PALM",
  "OAK", "PINE", "MAPLE", "BIRCH", "CEDAR", "WILLOW", "ELM", "ASH", "FIR", "SPRUCE", "HEMLOCK", "YEW",
  "BOOK", "PAGE", "PEN", "PENCIL", "PAPER", "DESK", "CHAIR", "TABLE", "LAMP", "LIGHT", "DARK", "BRIGHT",
  "DIM", "WARM", "COLD", "HOT", "COOL", "WET", "DRY", "SOFT", "HARD", "SMOOTH", "ROUGH", "SHARP", "DULL",
  "FAST", "SLOW", "QUICK", "RAPID", "SWIFT", "SPEED", "RACE", "RUN", "WALK", "JUMP", "LEAP", "CLIMB",
  "FALL", "RISE", "FLY", "SWIM", "DIVE", "FLOAT", "SINK", "DROWN", "SAIL", "ROW", "PADDLE", "OAR",
  "BOAT", "SHIP", "YACHT", "CANOE", "KAYAK", "RAFT", "SUB", "JET", "ROCKET", "SPACE", "ORBIT", "MOON",
  "MARS", "VENUS", "EARTH", "PLUTO", "COMET", "METEOR", "ASTEROID", "GALAXY", "UNIVERSE", "COSMOS",
  "ATOM", "MOLECULE", "CELL", "GENE", "DNA", "RNA", "PROTEIN", "VIRUS", "BACTERIA", "FUNGUS", "YEAST",
  "ALGAE", "PLANT", "ANIMAL", "HUMAN", "PERSON", "PEOPLE", "MAN", "WOMAN", "CHILD", "BABY", "BOY", "GIRL",
  "FRIEND", "FAMILY", "MOTHER", "FATHER", "SISTER", "BROTHER", "SON", "DAUGHTER", "WIFE", "HUSBAND",
  "LOVE", "HATE", "LIKE", "WANT", "NEED", "HAVE", "GIVE", "TAKE", "MAKE", "DO", "SAY", "TELL", "ASK",
  "KNOW", "THINK", "FEEL", "SEE", "HEAR", "SMELL", "TASTE", "TOUCH", "HOLD", "GRAB", "PUSH", "PULL",
  "OPEN", "CLOSE", "LOCK", "KEY", "DOOR", "WINDOW", "WALL", "FLOOR", "ROOF", "CEILING", "ROOM", "HOME",
]);

const SPANISH_WORDS = new Set([
  "A", "AL", "EL", "LA", "LO", "LE", "ME", "MI", "NO", "OS", "SE", "SI", "SU", "TE", "UN", "YA", "YO",
  "CASA", "PERRO", "GATO", "JUEGO", "PALABRA", "LETRA", "FICHA", "TABLERO", "PUNTO", "JUGAR", "GANAR",
  "PERDER", "TURNO", "RACK", "BOLSA", "BLANCA", "COMER", "BEBER", "DORMIR", "CORRER", "CAMINAR", "SALTAR",
  "CIELO", "TIERRA", "MAR", "RIO", "LAGO", "MONTE", "VALLE", "BOSQUE", "CAMPO", "CIUDAD", "PUEBLO",
  "CALLE", "PLAZA", "PARQUE", "JARDIN", "FLOR", "ARBOL", "HOJA", "RAIZ", "FRUTA", "MANZANA", "PERA",
  "UVA", "NARANJA", "LIMON", "PLATANO", "FRESA", "CEREZA", "MELON", "SANDIA", "PAN", "LECHE", "AGUA",
  "VINO", "CERVEZA", "CARNE", "PESCADO", "POLLO", "CERDO", "VACA", "OVEJA", "CABRA", "CABALLO", "PATO",
  "RANA", "SERPIENTE", "LEON", "TIGRE", "OSO", "LOBO", "ZORRO", "CIERVO", "RATON", "CONEJO", "ARDILLA",
  "PAJARO", "AGUILA", "BUHO", "CUERVO", "GOLONDRINA", "GORRION", "LORO", "TUCAN", "FLAMENCO", "CISNE",
  "LIBRO", "HOJA", "PAPEL", "LAPIZ", "MESA", "SILLA", "SILLON", "CAMA", "PUERTA", "VENTANA", "TECHO",
  "SUELO", "PARED", "LAMPARA", "LUZ", "OSCURO", "CLARO", "CALIENTE", "FRIO", "TIBIO", "HUMEDO", "SECO",
  "SUAVE", "DURO", "RAPIDO", "LENTO", "ALTO", "BAJO", "GRANDE", "PEQUENO", "LARGO", "CORTO", "ANCHO",
  "ESTRECHO", "GORDO", "DELGADO", "FUERTE", "DEBIL", "BUENO", "MALO", "BONITO", "FEO", "NUEVO", "VIEJO",
  "JOVEN", "MAYOR", "MENOR", "PRIMERO", "ULTIMO", "MEJOR", "PEOR", "MUCHO", "POCO", "TODOS", "NADIE",
  "ALGO", "NADA", "AQUI", "ALLI", "AHORA", "ANTES", "DESPUES", "SIEMPRE", "NUNCA", "TAMBIEN", "TAMPOCO",
  "PERO", "PORQUE", "CUANDO", "DONDE", "COMO", "QUIEN", "QUE", "CUAL", "CUANTO", "MUCHOS", "POCOS",
  "AMOR", "ODIO", "MIEDO", "ALEGRIA", "TRISTEZA", "RABIA", "PAZ", "GUERRA", "VIDA", "MUERTE", "TIEMPO",
  "DIA", "NOCHE", "MANANA", "TARDE", "SEMANA", "MES", "ANO", "HORA", "MINUTO", "SEGUNDO", "MOMENTO",
  "SCRABBLE", "FICHAS", "JUGADA", "VALIDA", "INVALIDA", "PUNTUACION", "BINGO", "CAMBIO", "PASAR",
  "CH", "LL", "RR", "Ñ", "CHICO", "CHICA", "CHILE", "CHOCOLATE", "LLAVE", "LLAMAR", "LLORAR", "LLENO",
  "PERRO", "CARRO", "BARRO", "TIERRA", "GUERRA", "SIERRA", "HERRAMIENTA", "ÑOÑO", "CAÑA", "MAÑANA",
  "PEQUEÑO", "NIÑO", "NIÑA", "SEÑOR", "SEÑORA", "AÑO", "ESPAÑOL", "ESPAÑA", "MEXICO", "ARGENTINA",
]);

const dictionaries: Record<Language, Set<string>> = {
  en: ENGLISH_WORDS,
  es: SPANISH_WORDS,
};

export function normalizeWord(language: Language, word: string): string {
  return language === "es" ? word.toUpperCase() : word.toUpperCase();
}

export function isValidWord(language: Language, word: string): boolean {
  const normalized = normalizeWord(language, word);
  if (normalized.length < 1) return false;
  return dictionaries[language].has(normalized);
}

export function getDictionarySize(language: Language): number {
  return dictionaries[language].size;
}
