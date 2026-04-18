FROM node:22-alpine

WORKDIR /app

# Install server dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client ./client
RUN cd client && npm run build

# Copy server source
COPY server ./server

# Copy env example (actual .env provided at runtime)
COPY .env.example .env.example

EXPOSE 3001

CMD ["node", "server/index.js"]