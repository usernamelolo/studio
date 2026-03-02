import { Redis } from '@upstash/redis'; // если используешь Redis, иначе можно убрать

export default async function handler(req, res) {
  // CORS
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
      return res.status(500).json({ error: 'XAI_API_KEY не найден в Environment Variables' });
    }

    // Получаем путь после /api/proxy/
    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname.replace('/api/proxy', '');

    const targetUrl = `https://api.x.ai${path}`;

    const body = req.method === 'POST' ? req.body : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}
