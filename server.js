const http = require('http');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const sanitizeText = (value) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
};

const appendSubmission = async (fileName, payload) => {
  const filePath = path.join(DATA_DIR, fileName);
  let submissions = [];

  try {
    const existing = await fsp.readFile(filePath, 'utf-8');
    submissions = JSON.parse(existing);
    if (!Array.isArray(submissions)) {
      submissions = [];
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  submissions.push(payload);
  await fsp.writeFile(filePath, JSON.stringify(submissions, null, 2));
};

const readJsonBody = async (req) =>
  new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString('utf-8');
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });

const sendJson = (res, statusCode, data) => {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
};

const serveStaticFile = (res, filePath) => {
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      if (statError && statError.code !== 'ENOENT') {
        console.error('Failed to stat file:', filePath, statError);
      }
      const notFoundPath = path.join(ROOT_DIR, 'index.html');
      return serveStaticFile(res, notFoundPath);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', (streamError) => {
      console.error('Failed to read file:', filePath, streamError);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    });
  });
};

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURI(parsedUrl.pathname);

  if (method === 'OPTIONS' && pathname.startsWith('/api/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (method === 'POST' && pathname === '/api/discovery-call') {
    try {
      const body = await readJsonBody(req);
      const name = sanitizeText(body.name);
      const email = sanitizeText(body.email);
      const company = sanitizeText(body.company);
      const goals = sanitizeText(body.goals);
      const preferredDate = sanitizeText(body.preferredDate);
      const preferredTime = sanitizeText(body.preferredTime);

      if (!name || !email || !goals) {
        return sendJson(res, 400, { error: 'Name, email, and goals are required.' });
      }

      const submission = {
        name,
        email,
        company,
        goals,
        preferredDate,
        preferredTime,
        submittedAt: new Date().toISOString(),
      };

      await appendSubmission('discovery-requests.json', submission);
      console.log('Discovery call request received:', submission);
      return sendJson(res, 200, {
        message: 'Thanks! Our team will reach out within one business day to schedule your session.',
      });
    } catch (error) {
      console.error('Failed to process discovery call request:', error);
      return sendJson(res, 500, {
        error: 'We could not save your request. Please try again later or email hello@asebystudio.com.',
      });
    }
  }

  if (method === 'POST' && pathname === '/api/contact') {
    try {
      const body = await readJsonBody(req);
      const name = sanitizeText(body.name);
      const email = sanitizeText(body.email);
      const company = sanitizeText(body.company);
      const subject = sanitizeText(body.subject);
      const message = sanitizeText(body.message);

      if (!name || !email || !subject || !message) {
        return sendJson(res, 400, { error: 'Name, email, subject, and message are required.' });
      }

      const submission = {
        name,
        email,
        company,
        subject,
        message,
        submittedAt: new Date().toISOString(),
      };

      await appendSubmission('contact-messages.json', submission);
      console.log('Contact message received:', submission);
      return sendJson(res, 200, {
        message: 'Thanks for reaching out! We will respond within one business day.',
      });
    } catch (error) {
      console.error('Failed to process contact message:', error);
      return sendJson(res, 500, {
        error: 'We could not deliver your message. Please try again in a moment or email hello@asebystudio.com.',
      });
    }
  }

  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  let relativePath = pathname;
  if (relativePath === '/') {
    relativePath = '/index.html';
  }

  if (!path.extname(relativePath)) {
    relativePath = `${relativePath}.html`;
  }

  const safePath = path.normalize(relativePath).replace(/^\/+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Aseby Studio server listening on port ${PORT}`);
});
