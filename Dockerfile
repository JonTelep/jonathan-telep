FROM docker.io/library/nginx:alpine

# Remove the default Nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy your custom Nginx config template
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/
COPY content/ /usr/share/nginx/html/content/

RUN chown -R nginx:nginx /usr/share/nginx/html/ && \
    chmod -R 755 /usr/share/nginx/html/

EXPOSE 3000

CMD ["/bin/sh", "-c", "envsubst '${POSTGRES_HOST}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]