import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  // === CORS ===
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) {
      return res.status(500).json({ error: 'XAI_API_KEY не найден в Environment Variables Vercel' });
    }

    // Получаем путь после /api/proxy/
    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname.replace('/api/proxy', '');

    const targetUrl = `https://api.x.ai${path}`;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text(); // сначала текст, чтобы не падало на не-JSON

    try {
      const json = JSON.parse(data);
      return res.status(response.status).json(json);
    } catch {
      return res.status(response.status).json({ raw: data });
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({
      error: 'Proxy server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
