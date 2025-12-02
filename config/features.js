const DEFAULT_SECURITY_GUARDS_ENABLED = true;

function parseBooleanEnv(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  return defaultValue;
}

function isSecurityGuardsEnabled() {
  return parseBooleanEnv(process.env.SECURITY_GUARDS_ENABLED, DEFAULT_SECURITY_GUARDS_ENABLED);
}

module.exports = {
  isSecurityGuardsEnabled,
};
