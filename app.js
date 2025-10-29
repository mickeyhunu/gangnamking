const path = require('path');
const express = require('express');
const languageMiddleware = require('./middleware/language');
const shopRoutes = require('./routes/index');
const { initializeDataStore } = require('./services/dataStore');

initializeDataStore();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(languageMiddleware);
app.use((req, res, next) => {
  res.locals.naverMapClientId = process.env.NAVER_MAP_API_KEY_ID || '';
  next();
});
app.use('/', shopRoutes);

app.use((req, res) => {
  res.status(404).render('404', {
    pageTitle: (res.locals.t.notFound && res.locals.t.notFound.title) || 'Not Found',
    metaDescription: (res.locals.t.notFound && res.locals.t.notFound.description) || '',
  });
});

app.use((err, req, res, next) => {
  console.error('Unexpected error', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
