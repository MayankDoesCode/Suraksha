# Separate free Render service for the URL phishing model only (see deploy/url_service/app.py).
# Build context: repository root.
FROM python:3.12-slim
WORKDIR /app
# Only what inference needs; scikit-learn/joblib pinned to the versions that wrote the artifact
RUN pip install --no-cache-dir flask "gunicorn>=23.0.0" scikit-learn==1.9.1 joblib==1.6.0
COPY deploy/url_service/app.py ./app.py
# the one backend module the pickled pipeline references (numpy + scikit-learn only)
COPY backend/app/ml/url_host_features.py ./url_host_features.py
COPY backend/app/ml/models/url_phishing_pipeline_slim.joblib ./models/url_phishing_pipeline.joblib
COPY backend/app/ml/models/url_phishing_slim_manifest.json ./models/url_phishing_manifest.json
ENV PYTHONUNBUFFERED=1 MALLOC_ARENA_MAX=2 PORT=10000
EXPOSE 10000
CMD ["sh", "-c", "exec gunicorn app:app --bind 0.0.0.0:${PORT:-10000} --workers 1 --threads 2 --timeout 120"]
