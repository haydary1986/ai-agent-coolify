# Frontend Build Stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Backend Build Stage
FROM golang:1.24-alpine AS backend-builder
# Install GCC and musl-dev to support CGO for SQLite
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Enable CGO for SQLite
RUN CGO_ENABLED=1 GOOS=linux go build -o /app/api_server ./cmd/api

# Final Run Stage
FROM alpine:latest
# Install SQLite runtime libraries
RUN apk add --no-cache sqlite-libs
WORKDIR /app
# Copy backend binary
COPY --from=backend-builder /app/api_server .
# Copy frontend built files
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD ["./api_server"]
