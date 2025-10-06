const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Load shop data
const shopsPath = path.join(__dirname, 'data', 'shops.json');
let shops = [];

function loadShops() {
  try {
    const raw = fs.readFileSync(shopsPath, 'utf-8');
    shops = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load shop data:', error);
    shops = [];
  }
}

loadShops();

fs.watchFile(shopsPath, { interval: 1000 }, () => {
  console.log('Detected change in shop data. Reloading...');
  loadShops();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const areas = [...new Set(shops.map((shop) => shop.area))];
  const categories = [...new Set(shops.map((shop) => shop.category))];

  res.render('index', {
    shops,
    areas,
    categories
  });
});

app.get('/shops/:id', (req, res, next) => {
  const shop = shops.find((item) => item.id === req.params.id);

  if (!shop) {
    return next();
  }

  res.render('shop', {
    shop
  });
});

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
