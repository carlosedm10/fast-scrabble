import pg from "pg";
import type { GameRoom } from "./game/types";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      code VARCHAR(8) PRIMARY KEY,
      language VARCHAR(2) NOT NULL,
      status VARCHAR(16) NOT NULL,
      state JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function saveRoom(room: GameRoom): Promise<void> {
  await pool.query(
    `INSERT INTO rooms (code, language, status, state, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (code) DO UPDATE SET
       status = EXCLUDED.status,
       state = EXCLUDED.state,
       updated_at = NOW()`,
    [room.code, room.language, room.status, JSON.stringify(room)],
  );
}

export async function loadRoom(code: string): Promise<GameRoom | null> {
  const result = await pool.query(
    `SELECT state FROM rooms WHERE code = $1`,
    [code.toUpperCase()],
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].state as GameRoom;
}

export async function listRoomsUpdatedBefore(cutoff: Date): Promise<GameRoom[]> {
  const result = await pool.query(
    `SELECT state FROM rooms WHERE updated_at < $1`,
    [cutoff.toISOString()],
  );
  return result.rows.map((row) => row.state as GameRoom);
}

export async function deleteRoom(code: string): Promise<void> {
  await pool.query(`DELETE FROM rooms WHERE code = $1`, [code.toUpperCase()]);
}

export { pool };
