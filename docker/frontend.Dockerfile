FROM oven/bun:1.4.2 AS builder

WORKDIR /code

COPY frontend/package.json frontend/bun.lock* ./

RUN bun install --frozen-lockfile

COPY frontend/ .

ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_PUBLIC_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_PUBLIC_URL=$VITE_PUBLIC_URL

RUN bun run build

FROM oven/bun:1.4.2

WORKDIR /code

COPY frontend/package.json frontend/bun.lock* ./

RUN bun install --frozen-lockfile

COPY frontend/ .
COPY --from=builder /code/dist ./dist

EXPOSE 5173

CMD ["bun", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
