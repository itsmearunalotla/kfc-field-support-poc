FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY package.json ./
COPY app ./app
USER node
EXPOSE 3000
CMD ["node", "app/server.js"]
