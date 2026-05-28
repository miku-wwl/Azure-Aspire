FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json .
RUN npm install --production

# Copy application code
COPY server.js .

EXPOSE 3001

USER node

CMD ["node", "server.js"]
