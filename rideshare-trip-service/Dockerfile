# ----------------------------------------------------
# STAGE 1: Build Stage
# ----------------------------------------------------
FROM python:3.11-slim as builder

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && \
    apt-get install --no-install-recommends -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ----------------------------------------------------
# STAGE 2: Final Image
# ----------------------------------------------------
FROM python:3.11-slim

# Install supervisord + runtime deps
RUN apt-get update && \
    apt-get install --no-install-recommends -y \
    supervisor \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN adduser --system --no-create-home appuser

WORKDIR /app

# Copy Python packages
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy app code
COPY . .

# Create supervisord config
RUN mkdir -p /etc/supervisor/conf.d

# Copy supervisord config (you'll create this next)
COPY supervisord.conf /etc/supervisor/supervisord.conf

# Expose both ports
EXPOSE 3005 3006

# WebSocket port

USER appuser

# Let supervisord start both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]