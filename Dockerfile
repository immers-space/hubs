FROM node:14

WORKDIR /usr/src/hubs
COPY package*.json ./
RUN npm ci

WORKDIR /usr/src/hubs/admin
COPY admin/package*.json ./
RUN npm ci

WORKDIR /usr/src/hubs
COPY . .

CMD [ "/bin/bash", "dockerdeploy.sh" ]
