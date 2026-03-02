import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv(); // автоматически берёт KV_URL + KV_REST_API_TOKEN из твоего скрина

export default async function handler(req, res) {
  const { user, action, data } = req.body || req.query;

  if (action === 'save') {
    const key = `results:${user}`;
    let list = await redis.get(key) || [];
    list.unshift({ ...data, id: Date.now(), date: new Date().toISOString() });
    await redis.set(key, list.slice(0, 300)); // храним последние 300 записей
    return res.status(200).json({ success: true });
  }

  if (action === 'get') {
    const key = `results:${user}`;
    const list = await redis.get(key) || [];
    return res.status(200).json(list);
  }

  res.status(400).json({ error: 'invalid action' });
}
