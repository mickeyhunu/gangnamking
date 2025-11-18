require('dotenv').config();

const path = require('path');
const express = require('express');
const languageMiddleware = require('./middleware/language');
const requestLoggingMiddleware = require('./middleware/requestLogger');
const ipBlockerMiddleware = require('./middleware/ipBlocker');
const shopRoutes = require('./routes/index');
const entryRoutes = require('./routes/entry');
const { initializeDataStore } = require('./services/dataStore');
const { getNaverMapCredentials } = require('./config/naver');

initializeDataStore();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggingMiddleware);
app.use(ipBlockerMiddleware);
app.use(languageMiddleware);
app.use((req, res, next) => {
  const { clientId } = getNaverMapCredentials();
  res.locals.naverMapClientId = clientId || '';
  next();
});
app.use('/entry', entryRoutes);
app.use('/', shopRoutes);

app.use((req, res) => {
  res.status(404).render('404', {
    pageTitle: (res.locals.t.notFound && res.locals.t.notFound.title) || 'Not Found',
    metaDescription: (res.locals.t.notFound && res.locals.t.notFound.description) || '',
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).send('Internal Server Error');
});

app.listen(PORT);
