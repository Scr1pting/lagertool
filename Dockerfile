# --- Base image ---
FROM node:18 AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- Development stage ---
FROM base AS development
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "start"]

# --- Production build stage ---
FROM base AS build
ENV NODE_ENV=production
RUN npm run build

# --- Production server stage ---
FROM nginx:stable-alpine AS production

# Replace default nginx config so nginx listens on port 3000 and supports SPA routing
RUN printf 'server {\n    listen 3000;\n    server_name _;\n    root /usr/share/nginx/html;\n    index index.html;\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n}\n' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
