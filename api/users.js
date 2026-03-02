import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { action, username, password, maxImages, maxVideos } = req.body || req.query;

  const key = 'all_users';

  if (action === 'get') {
    const users = await redis.get(key) || { admin: { password: 'admin123', role: 'admin', maxImages: 999, maxVideos: 999 } };
    return res.status(200).json(users);
  }

  if (action === 'add') {
    let users = await redis.get(key) || { admin: { password: 'admin123', role: 'admin', maxImages: 999, maxVideos: 999 } };
    if (users[username]) return res.status(400).json({ error: 'Пользователь уже существует' });
    users[username] = { password, role: 'user', maxImages: maxImages || 10, maxVideos: maxVideos || 5 };
    await redis.set(key, users);
    return res.status(200).json({ success: true });
  }

  if (action === 'delete') {
    let users = await redis.get(key) || {};
    if (username === 'admin') return res.status(400).json({ error: 'Админа удалить нельзя' });
    delete users[username];
    await redis.set(key, users);
    return res.status(200).json({ success: true });
  }

  res.status(400).json({ error: 'invalid action' });
}
