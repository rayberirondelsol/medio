(function initialiseRuntimeEnv() {
  if (typeof window === 'undefined') {
    return;
  }

  window.__ENV__ = window.__ENV__ || {};

  var apiUrl = '$REACT_APP_API_URL';
  var looksLikePlaceholder = typeof apiUrl === 'string' && apiUrl.indexOf('REACT_APP_API_URL') !== -1;

  if (apiUrl && !looksLikePlaceholder && apiUrl !== 'undefined' && apiUrl !== 'null') {
    window.__ENV__.REACT_APP_API_URL = apiUrl.trim();
  }
})();
