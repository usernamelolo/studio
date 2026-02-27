module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.XAI_API_KEY) {
    return res.status(500).json({ error: 'API-ключ не найден. Добавь XAI_API_KEY в Vercel Settings → Environment Variables' });
  }

  const targetUrl = 'https://api.x.ai' + req.url.replace('/api/proxy', '');

  const fetchOptions = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
    }
  };

  if (req.body && Object.keys(req.body).length > 0) {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
