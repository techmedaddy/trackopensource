FROM rust:bookworm AS builder

WORKDIR /usr/src/app

COPY . .

# Force SQLx to use offline cached queries instead of needing a live database
ENV SQLX_OFFLINE=true

# Build the production binaries
RUN cargo build --release --bin backend
RUN cargo build --release --bin collector
RUN cargo build --release --bin ranker

FROM debian:bookworm-slim

WORKDIR /usr/src/app

# Install OpenSSL and libpq (required by rust and sqlx)
RUN apt-get update && apt-get install -y openssl libpq5 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/target/release/backend /usr/local/bin/backend
COPY --from=builder /usr/src/app/target/release/collector /usr/local/bin/collector
COPY --from=builder /usr/src/app/target/release/ranker /usr/local/bin/ranker

# Copy migrations so they can be run on startup if needed
COPY --from=builder /usr/src/app/migrations ./migrations

EXPOSE 8080

CMD ["backend"]
