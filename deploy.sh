#!/bin/sh

git checkout gh-pages
npm install
npm run build
cp -a build/. app/
cd app
git add .
git commit -m "Automatic build from HEAD."
git push origin
cd ..