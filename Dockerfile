FROM node:22-alpine

# Copy the custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the static website files into the Nginx server
COPY . /usr/share/nginx/html/

# Set proper permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html/
RUN chmod -R 755 /usr/share/nginx/html/

# List the contents of /usr/share/nginx/html/ to the console
ENTRYPOINT ["/bin/sh", "-c", "ls -la /usr/share/nginx/html/ && exec nginx -g 'daemon off;'"]

# Expose port 80
EXPOSE 80
