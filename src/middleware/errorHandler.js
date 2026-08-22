export function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status,
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
}
