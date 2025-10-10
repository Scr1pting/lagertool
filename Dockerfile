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
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
