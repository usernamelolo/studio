import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.REDIS_URL,
  token: process.env.KV_REST_API_TOKEN
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const tokenKey = `token:${token}`;
    const userDataStr = await redis.get(tokenKey);
    console.log(`Type of userDataStr in generations: ${typeof userDataStr}`);
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    if (!userData) return res.status(401).json({ error: 'Invalid token' });

    const { username } = userData;
    const { action, data } = req.body;

    const key = `generations:${username}`;

    if (action === 'save') {
      let generationsStr = await redis.get(key);
      console.log(`Type of generationsStr: ${typeof generationsStr}`);
      let generations = generationsStr ? JSON.parse(generationsStr) : [];
      generations.push({ ...data, date: new Date().toISOString() });
      await redis.set(key, JSON.stringify(generations));
      return res.status(200).json({ success: true });
    }

    if (action === 'get') {
      let generationsStr = await redis.get(key);
      const generations = generationsStr ? JSON.parse(generationsStr) : [];
      return res.status(200).json(generations);
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Error in /api/generations:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
