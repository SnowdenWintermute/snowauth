# just download production deps, we'll copy them into the next step as well as the final step
FROM node:alpine AS deployDeps
WORKDIR /app

COPY package.json .

RUN npm install --production

# Get dev deps because they are needed to build the app (tailwind)
FROM node:alpine AS buildDeps
WORKDIR /app

COPY --from=deployDeps /app/node_modules ./node_modules
COPY package.json .

RUN npm install

# build app
FROM node:latest as builder
WORKDIR /
RUN npm install -g typescript -y

WORKDIR /app
COPY --from=buildDeps /app/package.json ./package.json
COPY --from=buildDeps /app/node_modules ./node_modules

COPY /src ./src
COPY tsconfig.json .

RUN tsc && echo compiled typescript

FROM node:alpine
WORKDIR /app
COPY package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=deployDeps /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]


