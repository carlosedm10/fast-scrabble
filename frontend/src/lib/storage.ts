const TOKEN_KEY = "scrabble_token";
const NICKNAME_KEY = "scrabble_nickname";
const ROOM_KEY = "scrabble_room";

export function saveSession(token: string, nickname: string, roomCode: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(NICKNAME_KEY, nickname);
  localStorage.setItem(ROOM_KEY, roomCode);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getNickname(): string | null {
  return localStorage.getItem(NICKNAME_KEY);
}

export function getRoomCode(): string | null {
  return localStorage.getItem(ROOM_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(NICKNAME_KEY);
  localStorage.removeItem(ROOM_KEY);
}
