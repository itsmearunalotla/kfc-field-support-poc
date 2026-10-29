FROM node:22-alpine

# Pin npm to a release with updated bundled dependencies.
RUN npm install --global npm@11.21.1

ENV NODE_ENV=production PORT=3000

WORKDIR /app
COPY package.json ./
COPY app ./app

USER node
EXPOSE 3000
CMD ["node", "app/server.js"]