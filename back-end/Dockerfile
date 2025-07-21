# Use official Node.js LTS image
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN npx prisma generate --schema=./prisma

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"] 