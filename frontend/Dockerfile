# Stage 1: Build Angular application
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit

COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx Alpine
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
