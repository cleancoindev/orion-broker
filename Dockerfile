FROM node:14-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

RUN mkdir dist/data
RUN cp config.template.json dist/data/config.json
RUN cp emulator_balances.json dist/emulator_balances.json
RUN cp src/logo.png dist/logo.png
RUN cp src/icon.png dist/icon.png

WORKDIR dist

CMD [ "node", "main.js" ]
