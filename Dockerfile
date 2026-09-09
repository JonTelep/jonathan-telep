FROM docker.io/library/node:22-alpine AS tools-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/postgres/frontend/package.json ./apps/postgres/frontend/package.json
RUN npm ci
COPY apps/postgres/frontend/ ./apps/postgres/frontend/
RUN npm run build --workspace=@telep/postgres

FROM docker.io/library/python:3.11-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends nginx tini \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log
WORKDIR /app
COPY apps/postgres/backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY apps/postgres/backend/*.py /app/backend/
COPY scripts/production.py /app/production.py
COPY scripts/inquiry.py /app/inquiry.py

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

ARG CACHEBUST=1
COPY index.html request.html /usr/share/nginx/html/
COPY llms.txt llms-full.txt robots.txt about.md resume.md /usr/share/nginx/html/
COPY terminal.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY landing.css /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/
COPY public/ /usr/share/nginx/html/public/
COPY apps/jsonify/index.html /usr/share/nginx/html/jsonify/index.html
COPY apps/jsonify/public/ /usr/share/nginx/html/jsonify/public/
COPY --from=tools-build /app/apps/postgres/frontend/dist/ /usr/share/nginx/html/postgres/

EXPOSE 3000

ENV FRED_API_KEY=""
ENV RESEND_API_KEY=""
ENV RESEND_FROM_EMAIL=""
ENV TELEP_CONTACT_URL=""
ENV PYTHONUNBUFFERED=1
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import json, urllib.request; r=urllib.request.urlopen('http://127.0.0.1:3000/postgres/api/health', timeout=3); assert json.load(r)['status'] == 'healthy'"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "/app/production.py"]
