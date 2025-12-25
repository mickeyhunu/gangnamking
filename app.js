require('dotenv').config();

const path = require('path');
const express = require('express');
const languageMiddleware = require('./middleware/language');
const requestLoggingMiddleware = require('./middleware/requestLogger');
const abuseProtectorMiddleware = require('./middleware/abuseProtector');
const ipBlockerMiddleware = require('./middleware/ipBlocker');
const corsGuardMiddleware = require('./middleware/corsGuard');
const referrerGuardMiddleware = require('./middleware/referrerGuard');
const shopRoutes = require('./routes/index');
const entryRoutes = require('./routes/entry');
const protectedEntryRoutes = require('./routes/protectedEntries');
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
app.use((req, _res, next) => {
  const rawCookieHeader = req.headers.cookie || '';
  const cookies = {};

  rawCookieHeader.split(';').forEach((segment) => {
    const [name, ...rest] = segment.trim().split('=');
    if (!name) {
      return;
    }
    cookies[name] = rest.join('=').trim();
  });

  req.cookies = cookies;
  next();
});
app.use(requestLoggingMiddleware);
app.use(corsGuardMiddleware);
app.use(referrerGuardMiddleware);
app.use(abuseProtectorMiddleware);
app.use(ipBlockerMiddleware);
app.use(languageMiddleware);
app.use((req, res, next) => {
  const { clientId } = getNaverMapCredentials();
  res.locals.naverMapClientId = clientId || '';
  next();
});
app.use('/shops', protectedEntryRoutes);
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

  console.error(
    `[Error] ${req.method} ${req.originalUrl}:`,
    err && err.stack ? err.stack : err
  );

  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
