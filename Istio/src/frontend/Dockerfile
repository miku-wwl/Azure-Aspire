# ── Stage 1: Build React App ──────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json .
RUN npm install
COPY public/ public/
COPY src/ src/
RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────────────────────
FROM nginx:alpine

# Custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built React app
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
