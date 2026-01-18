FROM node:24-alpine AS builder
WORKDIR /app/apps/web

COPY apps/web/package*.json ./
RUN npm ci --no-audit --no-fund

COPY apps/web/ ./
RUN npm run build

FROM nginx:stable-alpine AS runner

RUN mkdir -p /usr/share/nginx/html/api/models

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
