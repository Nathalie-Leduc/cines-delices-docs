FROM node:22-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --ignore-workspace --ignore-scripts
COPY . .
RUN node_modules/.bin/prisma generate
EXPOSE 8080
CMD ["node", "src/app.js"]
