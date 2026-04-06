const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.DASHBOARD_PASSWORD;

if (!PASSWORD) {
  console.error('DASHBOARD_PASSWORD environment variable is not set');
  process.exit(1);
}

const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

http.createServer((req, res) => {
  const authHeader = req.headers['authorization'];
  let authorized = false;

  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const pw = credentials.split(':').slice(1).join(':');
    authorized = pw === PASSWORD;
  }

  if (!authorized) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Dashboard"',
      'Content-Type': 'text/plain'
    });
    res.end('Unauthorized');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
