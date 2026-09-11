FROM oven/bun:1.4.2

WORKDIR /app

COPY backend/package.json backend/bun.lock* ./

RUN bun install --frozen-lockfile

COPY backend/ .

EXPOSE 8000

CMD ["bun", "run", "start"]
