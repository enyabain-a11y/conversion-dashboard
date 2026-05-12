const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.DASHBOARD_PASSWORD;

if (!PASSWORD) {
  console.error('DASHBOARD_PASSWORD environment variable is not set');
  process.exit(1);
}

// Token derived from password — no need to store sessions
const TOKEN = crypto.createHmac('sha256', PASSWORD).update('auth').digest('hex');

const dashboardHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard Login</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f1f3f4; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .box { background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); padding: 36px 40px; text-align: center; min-width: 300px; }
  h2 { font-size: 15px; font-weight: bold; color: #1e8449; margin-bottom: 6px; }
  p { font-size: 11px; color: #666; margin-bottom: 20px; }
  input { width: 100%; padding: 8px 10px; font-size: 13px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 10px; outline: none; }
  input:focus { border-color: #1e8449; }
  button { width: 100%; padding: 9px; background: #1e8449; color: #fff; font-size: 13px; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; }
  button:hover { background: #176038; }
  .error { color: #c0392b; font-size: 11px; margin-top: 8px; }
</style>
</head>
<body>
<div class="box">
  <h2>Eval to Subscription Conversion Dashboard</h2>
  <p>Enter the password to continue</p>
  <form method="POST" action="/auth">
    <input type="password" name="password" placeholder="Password" autofocus />
    <button type="submit">Enter</button>
  </form>
  {{ERROR}}
</div>
</body>
</html>`;

function getCookie(req, name) {
  const header = req.headers['cookie'] || '';
  const match = header.split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : null;
}

function isAuthenticated(req) {
  return getCookie(req, 'auth') === TOKEN;
}

function parseBody(req, cb) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => cb(body));
}

http.createServer((req, res) => {
  // Revenue forecast API — public, no auth needed
  if (req.method === 'GET' && req.url === '/api/revenue-forecast') {
    const forecast = [
      { month: '2026-05', gross_revenue: 2149579 },
      { month: '2026-06', gross_revenue: 2120871 },
      { month: '2026-07', gross_revenue: 2307543 },
    ];
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(forecast));
    return;
  }

  // Handle login POST
  if (req.method === 'POST' && req.url === '/auth') {
    parseBody(req, body => {
      const params = new URLSearchParams(body);
      const pw = params.get('password');
      if (pw === PASSWORD) {
        res.writeHead(302, {
          'Set-Cookie': `auth=${TOKEN}; HttpOnly; Path=/; SameSite=Strict`,
          'Location': '/'
        });
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(loginHtml.replace('{{ERROR}}', '<p class="error">Incorrect password. Please try again.</p>'));
      }
    });
    return;
  }

  // All other requests require auth
  if (!isAuthenticated(req)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(loginHtml.replace('{{ERROR}}', ''));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(dashboardHtml);
}).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
