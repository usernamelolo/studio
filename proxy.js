// api/proxy.js
const https = require('https');

const XAI_API_KEY = process.env.XAI_API_KEY; // ← Добавь в Vercel Environment Variables

const XAI_BASE = 'https://api.x.ai';

module.exports = async (req, res) => {
  // === CORS ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // === Специальный прокси для видео (для РФ) ===
  if (req.url.startsWith('/api/proxy/video')) {
    const url = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    console.log('Proxy video:', url);

    try {
      const videoRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (!videoRes.ok) throw new Error('Failed to fetch video');

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return videoRes.body.pipe(res);
    } catch (e) {
      console.error('Video proxy error:', e);
      return res.status(502).json({ error: 'Cannot load video' });
    }
  }

  // === Основной прокси для всех xAI API ===
  let targetUrl = XAI_BASE + req.url.replace('/api/proxy', '');

  // Убираем /api/proxy из начала
  if (req.url.startsWith('/api/proxy')) {
    targetUrl = XAI_BASE + req.url.substring('/api/proxy'.length);
  }

  console.log(`→ Proxying to: ${targetUrl}`);

  try {
    const body = req.method === 'POST' ? JSON.stringify(req.body) : null;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'User-Agent': 'xAI-Proxy/1.0'
      },
      body: body
    });

    const data = await response.json().catch(() => ({}));

    // Пробрасываем статус и заголовки
    res.status(response.status);

    // Специально для видео — иногда приходит другой формат
    if (data.video?.url || data.url) {
      console.log('Video URL received:', data.video?.url || data.url);
    }

    res.json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(502).json({
      error: 'Proxy error',
      message: error.message
    });
  }
};
