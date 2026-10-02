// A tiny static file server for the bot tests: the game is served over http like it is in production
// (painted backgrounds and sounds then load as same-origin files, which the WebGL lighting needs).
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2' };
exports.start = root => new Promise(resolve => {
  const srv = http.createServer((req, res) => {
    const f = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\.\./g, ''));
    fs.readFile(fs.existsSync(f) && fs.statSync(f).isDirectory() ? path.join(f, 'index.html') : f, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(data);
    });
  }).listen(0, '127.0.0.1', () => resolve({ url: 'http://127.0.0.1:' + srv.address().port + '/index.html', close: () => srv.close() }));
});
