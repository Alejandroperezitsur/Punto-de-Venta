FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies including Prisma
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
