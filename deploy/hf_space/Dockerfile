FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV SURAKSHA_EAGER_ML=1 PYTHONUNBUFFERED=1
EXPOSE 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "-w", "1", "--timeout", "120", "app:app"]
