#!/bin/sh

git checkout gh-pages
git rebase prod
npm install
npm run build
cp -a build/. app/
cd app
git add .
git commit -m "Automatic build from HEAD."
git push origin
cd ..
git checkout prod