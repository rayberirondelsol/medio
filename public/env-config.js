(function initialiseRuntimeEnv() {
  if (typeof window === 'undefined') {
    return;
  }

  window.__ENV__ = window.__ENV__ || {};

  // For proxy mode: use empty string for relative URLs (same origin)
  // This makes all API calls go to the same origin where the app is served
  var apiUrl = '';
  var looksLikePlaceholder = typeof apiUrl === 'string' && apiUrl.indexOf('REACT_APP_API_URL') !== -1;

  if (apiUrl && !looksLikePlaceholder && apiUrl !== 'undefined' && apiUrl !== 'null') {
    window.__ENV__.REACT_APP_API_URL = apiUrl.trim();
  }
})();
