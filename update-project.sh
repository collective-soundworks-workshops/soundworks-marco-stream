#!/bin/bash

git pull origin master
rm -Rf node_modules
rm -Rf package-lock.json
npm install
rm -Rf package-lock.json
