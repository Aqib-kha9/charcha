FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Cloud Run expects the app to listen on the port defined by the PORT environment variable
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
