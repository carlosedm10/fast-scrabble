import { io, type Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : window.location.origin);

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const path = import.meta.env.PROD ? "/scrabble/socket.io" : "/socket.io";
    socket = io(SOCKET_URL, {
      path,
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
