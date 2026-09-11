FROM oven/bun:1.2.5

WORKDIR /app

COPY backend/package.json backend/bun.lock* ./

RUN bun install --frozen-lockfile

COPY backend/ .

EXPOSE 8000

CMD ["bun", "run", "start"]
