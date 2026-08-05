FROM python:3.11-slim

WORKDIR /app

# ONNX runtime system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/backend/

ENV PORT=8080
EXPOSE 8080

# Run from /app/backend so that storage/, etc. relative paths resolve correctly.
# Changing dir after WORKDIR is set does not persist across CMD shell form.
CMD sh -c 'cd /app/backend && python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT'
