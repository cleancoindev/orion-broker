git pull origin master &&

cd broker-frontend &&

npm install &&

npm run build &&

cd .. &&

npm install &&

tsc &&

cp src/*.png dist/