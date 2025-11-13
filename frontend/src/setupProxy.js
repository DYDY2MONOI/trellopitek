const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const target = process.env.REACT_APP_DEV_API_PROXY || 'http://localhost:8080';
  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
    }),
  );
};
