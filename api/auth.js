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

    // Инициализация админа из env, если не существует или пароль не задан
    const adminUser = process.env.SITE_USERNAME || 'nysp';
    const adminPass = process.env.SITE_PASSWORD;
    let usersStr = await redis.get(keyUsers);
    console.log(`Type of usersStr: ${typeof usersStr}`);
    let users = (typeof usersStr === 'string') ? JSON.parse(usersStr) : (usersStr || {});
    if (adminPass && (!users[adminUser] || users[adminUser].password !== adminPass)) {
      console.log(`Initializing or updating admin ${adminUser}`);
      users[adminUser] = { password: adminPass, role: 'admin', maxImages: 999, maxVideos: 999 };
      await redis.set(keyUsers, JSON.stringify(users));
    }

    if (req.method === 'POST') {
      if (action === 'login') {
        console.log(`Login attempt for ${username}`);
        if (users[username] && users[username].password === password) {
          const authToken = `${username}_${Date.now()}`;
          const tokenKey = `token:${authToken}`;
          await redis.set(tokenKey, JSON.stringify({ username, role: users[username].role, limits: { maxImages: users[username].maxImages, maxVideos: users[username].maxVideos } }), { ex: 3600 });
          console.log(`Login success for ${username}, token: ${authToken}`);
          return res.status(200).json({ success: true, authToken });
        }
        console.log(`Invalid credentials for ${username}`);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      } else if (action === 'logout') {
        if (token) {
          const tokenKey = `token:${token}`;
          await redis.del(tokenKey);
          return res.status(200).json({ success: true });
        }
        return res.status(400).json({ error: 'No token provided' });
      }
    } else if (req.method === 'GET' && req.query.validate) {
      if (token) {
        const tokenKey = `token:${token}`;
        let userDataStr = await redis.get(tokenKey);
        console.log(`Type of userDataStr: ${typeof userDataStr}`);
        const userData = (typeof userDataStr === 'string') ? JSON.parse(userDataStr) : (userDataStr || null);
        if (userData) {
          console.log(`Validate success for token ${token}, user: ${userData.username}`);
          return res.status(200).json(userData);
        } else {
          console.log(`Validate failed for token ${token}: no data`);
        }
      }
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in /api/auth:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
