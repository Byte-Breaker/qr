# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Expose port 6001
EXPOSE 6001

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 