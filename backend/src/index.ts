import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import { bootstrapDb } from "./socket";
import { registerSocketHandlers } from "./socket";
import { getDictionarySize } from "./game/dictionary";

const PORT = Number(process.env.PORT ?? 8000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
const BASE_PATH = process.env.BASE_PATH ?? "";

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
  credentials: true,
});

const health = async () => ({ status: "ok" });
fastify.get("/health", health);
fastify.get("/api/health", health);
if (BASE_PATH) {
  fastify.get(`${BASE_PATH}/api/health`, health);
}

const infoHandler = async () => ({
  name: "fast-scrabble",
  version: "1.0.0",
  dictionaries: {
    en: getDictionarySize("en"),
    es: getDictionarySize("es"),
  },
});
fastify.get("/api/info", infoHandler);
if (BASE_PATH) {
  fastify.get(`${BASE_PATH}/api/info`, infoHandler);
}

await bootstrapDb();

const server = fastify.server;
const socketPath = BASE_PATH ? `${BASE_PATH}/socket.io` : "/socket.io";
const io = new Server(server, {
  path: socketPath,
  cors: {
    origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  },
});

registerSocketHandlers(io);

await fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log(`Server listening on port ${PORT}`);
