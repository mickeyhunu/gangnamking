const ROBOT_HEADER_VALUE = 'noindex, nofollow, noarchive, nosnippet';

function entryCrawlerBlocker(_req, res, next) {
  res.set('X-Robots-Tag', ROBOT_HEADER_VALUE);
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');

  if (!res.locals) {
    res.locals = {};
  }

  res.locals.robotsMeta = ROBOT_HEADER_VALUE;

  return next();
}

module.exports = entryCrawlerBlocker;
