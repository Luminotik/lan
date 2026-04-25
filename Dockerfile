FROM node:22-alpine AS client-builder

WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build


FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=client-builder /app/client/dist ./client/dist

COPY .env.example .env.example

EXPOSE 3001

CMD ["node", "server/index.js"]
