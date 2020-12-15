# 1) Clone orion-broker

git clone https://github.com/orionprotocol/orion-broker &&

# 2) Install dependencies (NodeJS 12.x, NPM, TypeScript 3.2.2)

sudo apt update &&

sudo apt install nodejs npm -y &&

curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - &&
sudo apt-get install -y nodejs &&

sudo npm install --global typescript@3.2.2 --force &&

# 3) Compile broker-frontend code

cd orion-broker/broker-frontend &&

npm install &&

npm run build &&

# 4) Compile broker code

cd .. &&

cp config.template.json data/config.json &&

npm install &&

tsc &&

cp src/*.png dist/ &&

# 5) Run

nodejs dist/main.js
