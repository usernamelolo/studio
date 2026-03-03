const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.REDIS_URL,
  token: process.env.KV_REST_API_TOKEN
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  const keyTokens = 'auth_tokens';
  const userDataStr = await redis.hget(keyTokens, token);
  if (!userDataStr) return res.status(401).json({ error: 'Invalid token' });

  const { username } = JSON.parse(userDataStr);
  const { action, data } = req.body;

  const key = `generations:${username}`;

  if (action === 'save') {
    let generations = await redis.get(key) || [];
    generations.push({ ...data, date: new Date().toISOString() });
    await redis.set(key, generations);
    return res.status(200).json({ success: true });
  }

  if (action === 'get') {
    const generations = await redis.get(key) || [];
    return res.status(200).json(generations);
  }

  res.status(400).json({ error: 'Invalid action' });
};
