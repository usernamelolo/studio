import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // === CORS для браузера ===
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action, username, password, maxImages = 10, maxVideos = 5 } = req.body || req.query;

    const key = 'all_users';

    if (action === 'get') {
      let users = await redis.get(key);
      if (!users) {
        users = {
          admin: { password: 'admin123', role: 'admin', maxImages: 999, maxVideos: 999 }
        };
        await redis.set(key, users);
      }
      return res.status(200).json(users);
    }

    if (action === 'add') {
      let users = await redis.get(key) || {
        admin: { password: 'admin123', role: 'admin', maxImages: 999, maxVideos: 999 }
      };

      if (users[username]) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
      }

      users[username] = {
        password: password,
        role: 'user',
        maxImages: parseInt(maxImages),
        maxVideos: parseInt(maxVideos)
      };

      await redis.set(key, users);
      return res.status(200).json({ success: true });
    }

    if (action === 'delete') {
      let users = await redis.get(key) || {};
      if (username === 'admin' || username === 'nysp') {
        return res.status(400).json({ error: 'Админа удалить нельзя' });
      }
      delete users[username];
      await redis.set(key, users);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Неизвестное действие' });

  } catch (error) {
    console.error('Ошибка в /api/users:', error);
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера', 
      message: error.message 
    });
  }
}
