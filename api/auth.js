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
    const { action, username, password } = req.body || req.query;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    const keyUsers = 'all_users';
    const keyTokens = 'auth_tokens';

    // Инициализация админа из env, если не существует
    const adminUser = process.env.SITE_USERNAME || 'nysp';
    const adminPass = process.env.SITE_PASSWORD;
    let users = await redis.get(keyUsers) || {};
    if (adminPass && !users[adminUser]) {
      users[adminUser] = { password: adminPass, role: 'admin', maxImages: 999, maxVideos: 999 };
      await redis.set(keyUsers, users);
    }

    if (req.method === 'POST') {
      if (action === 'login') {
        if (users[username] && users[username].password === password) {
          const authToken = `${username}_${Date.now()}`;
          await redis.hset(keyTokens, authToken, JSON.stringify({ username, role: users[username].role, limits: { maxImages: users[username].maxImages, maxVideos: users[username].maxVideos } }));
          await redis.expire(keyTokens, 3600); // 1 час
          return res.status(200).json({ success: true, authToken });
        }
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      } else if (action === 'logout') {
        if (token) {
          await redis.hdel(keyTokens, token);
          return res.status(200).json({ success: true });
        }
        return res.status(400).json({ error: 'No token provided' });
      }
    } else if (req.method === 'GET' && req.query.validate) {
      if (token) {
        const userData = await redis.hget(keyTokens, token);
        if (userData) {
          return res.status(200).json(JSON.parse(userData));
        }
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
