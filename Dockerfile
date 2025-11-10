FROM node:18-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./frontend/
WORKDIR /app/frontend

RUN npm install

COPY frontend/ ./

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/frontend/build /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
