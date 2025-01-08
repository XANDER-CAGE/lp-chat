FROM node:20-bullseye AS development

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma ./prisma/

RUN npm install husky --save-dev --force
RUN npm install --force

RUN npx prisma generate

COPY . .

RUN npm run build

FROM node:20-bullseye AS production

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --only=production --force

COPY --from=development /usr/src/app/prisma ./prisma
COPY --from=development /usr/src/app/node_modules ./node_modules
COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/main"]
