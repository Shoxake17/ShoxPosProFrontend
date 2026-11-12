# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Keshdan foydalanish uchun package fayllarni ko'chiramiz
COPY package*.json ./


# MUHIM: Alpine Linux uchun kerakli Rollup binar faylini majburiy o'rnatish
# Shuningdek --include=optional bayrog'ini qo'shamiz
RUN npm install --include=optional && \
    npm install @rollup/rollup-linux-x64-musl
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
# Bazaviy image'dagi OS paketlarini eng so'nggi xavfsizlik yamoqlariga ko'tarish
# (2026-11-12: libxslt 1.1.43-r3 da 3 ta HIGH, r4 da tuzatilgan - Trivy deploy'ni
# to'xtatdi). OnDex web image'i bilan bir xil yondashuv.
RUN apk upgrade --no-cache
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]