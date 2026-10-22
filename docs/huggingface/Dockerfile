# Hugging Face Space image: builds Suraksha straight from GitHub, so the Space repo stays tiny
# (no Git LFS for the 33 MB model). Full URL model, no lean mode: Spaces have ~16 GB RAM.
FROM alpine/git AS src
ARG REPO=https://github.com/MayankDoesCode/Suraksha.git
ARG BRANCH=ui-redesign-and-ml-hardening
# To deploy new code: bump CACHE_BUST (any new value) and commit; the clone layer is rebuilt.
ARG CACHE_BUST=1
RUN echo "build $CACHE_BUST" && git clone --depth 1 --branch ${BRANCH} ${REPO} /src

FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
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
COPY --from=src /src/frontend/package*.json ./
RUN npm ci
COPY --from=src /src/frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY --from=src /src/backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY --from=src /src/backend/ ./backend/
COPY --from=src /src/alembic.ini ./alembic.ini
RUN python backend/scripts/train_risk_model.py
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Spaces run the container as UID 1000; the app writes its SQLite file under /app.
RUN useradd -m -u 1000 user && chown -R user:user /app
USER user

ENV PORT=5000 FLASK_ENV=production PYTHONUNBUFFERED=1 PYTHONPATH=/app MALLOC_ARENA_MAX=2
EXPOSE 5000
CMD ["sh", "-c", "alembic -c alembic.ini upgrade head && exec gunicorn backend.run:app --bind 0.0.0.0:${PORT:-5000} --workers 1 --threads 4 --timeout 120"]
