require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Simple test proxy
const proxy = createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  filter: (pathname, req) => {
    console.log(`[FILTER CALLED] pathname: ${pathname}`);
    return pathname.startsWith('/api');
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY REQ] ${req.method} ${req.path} -> ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY RES] ${req.method} ${req.path} <- ${proxyRes.statusCode}`);
  }
});

app.use(proxy);

app.listen(8080, () => {
  console.log('Test proxy on :8080');
  console.log('Try: curl http://localhost:8080/api/csrf-token');
});
