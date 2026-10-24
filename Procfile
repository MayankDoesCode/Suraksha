web: alembic -c alembic.ini upgrade head && gunicorn backend.run:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120
