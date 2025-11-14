import { createServer } from 'http';

const server = createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  console.log(`${req.method} ${req.url}`);
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Route requests
  if (req.url === '/api/hello') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Hello from local test server!',
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      service: 'Local StudyFlow API'
    }));
  } else if (req.url === '/api/test') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Test endpoint working locally!');
  } else if (req.url === '/api/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 3333;
server.listen(PORT, () => {
  console.log(`
==========================================
🚀 Local API Server Running!
==========================================

Test endpoints:
- http://localhost:${PORT}/api/hello
- http://localhost:${PORT}/api/health  
- http://localhost:${PORT}/api/test
- http://localhost:${PORT}/api/ping

Press Ctrl+C to stop
==========================================
  `);
});
