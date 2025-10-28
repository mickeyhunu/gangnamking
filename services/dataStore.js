const fs = require('fs');
const path = require('path');

const shopsPath = path.join(__dirname, '..', 'data', 'shops.json');
const translationsPath = path.join(__dirname, '..', 'data', 'translations.json');

let shops = [];
let translations = {};
let isWatching = false;

function readJsonFile(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read JSON file at ${filePath}`, error);
    return fallback;
  }
}

function loadShops() {
  shops = readJsonFile(shopsPath, []);
  return shops;
}

function loadTranslations() {
  translations = readJsonFile(translationsPath, {});
  return translations;
}

function initializeWatchers() {
  if (isWatching) {
    return;
  }

  fs.watchFile(shopsPath, { interval: 1000 }, () => {
    console.log('Detected change in shop data. Reloading...');
    loadShops();
  });

  fs.watchFile(translationsPath, { interval: 1000 }, () => {
    console.log('Detected change in translations. Reloading...');
    loadTranslations();
  });

  isWatching = true;
}

function initializeDataStore() {
  loadShops();
  loadTranslations();
  initializeWatchers();
}

function getShops() {
  return shops;
}

function getTranslations() {
  return translations;
}

module.exports = {
  initializeDataStore,
  getShops,
  getTranslations,
};
