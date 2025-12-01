function getClientIp(req) {
  const cloudflareIp = req.headers['cf-connecting-ip'];
  if (cloudflareIp) {
    return cloudflareIp.split(',')[0].trim();
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

module.exports = getClientIp;
