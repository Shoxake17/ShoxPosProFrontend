# Stage 1: Build
FROM node:20-alpine as build
WORKDIR /app

# Keshdan foydalanish uchun package fayllarni ko'chiramiz
COPY package*.json ./

# MUHIM: Alpine Linux uchun kerakli Rollup binar faylini majburiy o'rnatish
# Shuningdek --include=optional bayrog'ini qo'shamiz
RUN npm install --include=optional && \
    npm install @rollup/rollup-linux-x64-musl
COPY .env .env.production
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]