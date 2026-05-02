# Frontend Build Stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Backend Build Stage
FROM golang:1.24-bookworm AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Enable CGO for SQLite
RUN CGO_ENABLED=1 GOOS=linux go build -o /app/api_server ./cmd/api

# Final Run Stage
FROM debian:bookworm-slim

# Install SQLite, curl, zstd, and Ollama dependencies
RUN apt-get update && apt-get install -y curl sqlite3 ca-certificates zstd \
    && curl -fsSL https://ollama.com/install.sh | sh \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/api_server .
# Copy frontend built files
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create entrypoint script
RUN echo '#!/bin/bash\n\
echo "Starting Ollama service in background..."\n\
ollama serve &\n\
echo "Waiting for Ollama to initialize..."\n\
sleep 5\n\
echo "Starting Go API Server..."\n\
exec ./api_server\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 8000
EXPOSE 11434

# Use the entrypoint script
CMD ["/app/entrypoint.sh"]
