# Tool sources. Coolify builds this file with no extra flags, so the default
# stages clone the public tool repositories at the pinned refs below. Local
# builds override them with sibling checkouts (see `make build`):
#   --build-context postgres=../visualize-postgres --build-context jsonify=../jsonify
ARG POSTGRES_REF=b0ed258
ARG JSONIFY_REF=b2d8f1b

FROM docker.io/alpine/git:2.47.2 AS tool-sources
ARG POSTGRES_REF
ARG JSONIFY_REF
RUN git clone --quiet https://github.com/JonTelep/visualize-postgres.git /src/postgres \
    && git -C /src/postgres checkout --quiet "$POSTGRES_REF" \
    && git clone --quiet https://github.com/JonTelep/jsonify.git /src/jsonify \
    && git -C /src/jsonify checkout --quiet "$JSONIFY_REF" \
    && rm -rf /src/postgres/.git /src/jsonify/.git

FROM scratch AS postgres
COPY --from=tool-sources /src/postgres/ /

FROM scratch AS jsonify
COPY --from=tool-sources /src/jsonify/ /

FROM docker.io/library/node:22-alpine AS tools-build
WORKDIR /app
COPY --from=postgres frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY --from=postgres frontend/ ./
RUN npm run build

FROM docker.io/library/python:3.11-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends nginx tini \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log
WORKDIR /app
COPY --from=postgres backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY --from=postgres backend/*.py /app/backend/
COPY scripts/production.py /app/production.py

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

ARG CACHEBUST=1
COPY index.html /usr/share/nginx/html/
COPY terminal.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY landing.css /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/
COPY public/ /usr/share/nginx/html/public/
COPY --from=jsonify index.html /usr/share/nginx/html/jsonify/index.html
COPY --from=jsonify public/ /usr/share/nginx/html/jsonify/public/
COPY --from=tools-build /app/dist/ /usr/share/nginx/html/postgres/

EXPOSE 3000

ENV FRED_API_KEY=""
ENV PYTHONUNBUFFERED=1
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import json, urllib.request; r=urllib.request.urlopen('http://127.0.0.1:3000/postgres/api/health', timeout=3); assert json.load(r)['status'] == 'healthy'"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "/app/production.py"]
