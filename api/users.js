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
    console.log(`Type of userDataStr in users: ${typeof userDataStr}`);
    const userData = userDataStr ? JSON.parse(userDataStr) : null;
    if (!userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { action, username, password, maxImages = 10, maxVideos = 5 } = req.body || req.query;

    const key = 'all_users';

    let usersStr = await redis.get(key);
    console.log(`Type of usersStr in users: ${typeof usersStr}`);
    let users = usersStr ? JSON.parse(usersStr) : {};

    if (action === 'get') {
      return res.status(200).json(users);
    }

    if (action === 'get_limits') {
      if (users && users[username]) {
        return res.status(200).json({ maxImages: users[username].maxImages, maxVideos: users[username].maxVideos });
      }
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (action === 'add') {
      if (users[username]) return res.status(400).json({ error: 'Пользователь уже существует' });

      users[username] = { password, role: 'user', maxImages: parseInt(maxImages), maxVideos: parseInt(maxVideos) };
      await redis.set(key, JSON.stringify(users));
      return res.status(200).json({ success: true });
    }

    if (action === 'update') {
      if (!users[username]) return res.status(404).json({ error: 'Пользователь не найден' });
      users[username].maxImages = parseInt(maxImages);
      users[username].maxVideos = parseInt(maxVideos);
      await redis.set(key, JSON.stringify(users));
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      if (username === process.env.SITE_USERNAME) return res.status(400).json({ error: 'Админа удалить нельзя' });
      delete users[username];
      await redis.set(key, JSON.stringify(users));
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Неизвестное действие' });
  } catch (error) {
    console.error('Error in /api/users:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
