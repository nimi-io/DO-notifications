FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY assets ./assets
# Weekly snapshots live here; mount a volume so they survive restarts
VOLUME ["/app/data"]
USER node
CMD ["node", "src/index.js"]
