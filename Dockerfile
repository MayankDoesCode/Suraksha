# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Build arguments for Vite frontend static compilation
ARG VITE_API_BASE_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_FIREBASE_FIRESTORE_DATABASE_ID

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID \
    VITE_FIREBASE_FIRESTORE_DATABASE_ID=$VITE_FIREBASE_FIRESTORE_DATABASE_ID

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# Stage 2: Production Python WSGI Application
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code and migration config
COPY backend/ ./backend/
COPY alembic.ini ./alembic.ini

# Verify or generate versioned ML risk classification model artifact
RUN python backend/scripts/train_risk_model.py

# Copy compiled frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (default 5000 or $PORT)
ENV PORT=5000
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV MALLOC_ARENA_MAX=2
# Small hosts (512 MB): keep 1 of 3 URL-model calibration folds. Remove for the full ensemble.
ENV SURAKSHA_LEAN_URL_MODEL=1

EXPOSE 5000

# Health check against API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1

# Run database migrations safely and start production server with Gunicorn
CMD ["sh", "-c", "alembic -c alembic.ini upgrade head && exec gunicorn backend.run:app --bind 0.0.0.0:${PORT:-5000} --workers 1 --threads 4 --timeout 120"]
