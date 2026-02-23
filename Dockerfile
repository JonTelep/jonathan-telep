FROM docker.io/library/nginx:alpine

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

ARG CACHEBUST=1
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/
COPY public/ /usr/share/nginx/html/public/

EXPOSE 3000

ENV FRED_API_KEY=""
ENV POSTGRES_HOST=""

CMD ["/bin/sh", "-c", "envsubst '${FRED_API_KEY} ${POSTGRES_HOST}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
