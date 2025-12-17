FROM docker.io/library/nginx:alpine

# Copy the custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the static website files into the Nginx server
COPY . /usr/share/nginx/html/

# Set proper permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html/
RUN chmod -R 755 /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
