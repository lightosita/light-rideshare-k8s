# Stage 1: Build the Go binary
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git

ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    GO111MODULE=on

WORKDIR /app

# Copy Go modules & download
COPY go.mod go.sum ./
RUN go mod download

# Copy source
COPY . .

# Build binary
RUN go build -ldflags="-s -w" -o matching-service .

# Stage 2: Minimal runtime image
FROM alpine:latest

RUN apk --no-cache add ca-certificates

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -u 1001 -G appgroup appuser

WORKDIR /app

# Copy binary
COPY --from=builder --chown=appuser:appgroup /app/matching-service /app/matching-service

USER appuser

EXPOSE 3004

# Healthcheck optional
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /app/matching-service health || exit 1

CMD ["/app/matching-service"]
