# Stage 1: Build Angular application
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies for caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build for production
# This uses the default configuration from angular.json
RUN npm run build -- --configuration production

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Default output for Angular applications using @angular/build:application is dist/<project-name>/browser
# We use a wildcard to capture the correct folder structure
COPY --from=build /app/dist/ketabi/browser /usr/share/nginx/html

# If the output is in /dist/ketabi instead (older Angular versions), uncomment below:
# COPY --from=build /app/dist/ketabi /usr/share/nginx/html

# Replace default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Internal to Docker network)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
