# --- Base image ---
FROM node:22 AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# --- Production build stage ---
FROM base AS build
ENV NODE_ENV=production
RUN npm run build

# --- Production server stage ---
FROM nginx:stable-alpine AS production

# Copy Vite build output (dist, not build)
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx.conf to enable SPA fallback routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
