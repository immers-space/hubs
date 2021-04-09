FROM node:14

WORKDIR /usr/src/hubs/admin
COPY package*.json ./
RUN npm ci

WORKDIR /usr/src/hubs
COPY package*.json ./
RUN npm ci

COPY . .

CMD [ "dockerdeploy.sh" ]
