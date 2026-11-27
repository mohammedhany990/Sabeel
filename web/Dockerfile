FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-support-email.sh /docker-entrypoint.d/40-support-email.sh
RUN chmod +x /docker-entrypoint.d/40-support-email.sh
COPY --from=build /app/dist/sabeel-web/browser /usr/share/nginx/html
EXPOSE 80
