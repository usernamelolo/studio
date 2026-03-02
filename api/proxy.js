export default async function handler(req, res) {
  // === CORS ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const xaiKey = process.env.XAI_API_KEY;
    if (!xaiKey) {
      return res.status(500).json({ 
        error: 'XAI_API_KEY не найден в Environment Variables Vercel' 
      });
    }

    // Получаем путь после /api/proxy/
    const path = req.url.replace('/api/proxy', '');
    const targetUrl = `https://api.x.ai${path}`;

    // ТЕЛО ОТПРАВЛЯЕМ ТОЛЬКО ДЛЯ POST (GET/HEAD не могут иметь body)
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${xaiKey}`,
        'Content-Type': 'application/json',
      }
    };

    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      return res.status(response.status).json(json);
    } catch {
      return res.status(response.status).json({ rawResponse: text });
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Proxy server error', 
      message: error.message 
    });
  }
}
