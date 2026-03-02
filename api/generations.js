xport default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    if (!KV_URL || !KV_TOKEN) {
      return res.status(500).json({ error: 'KV_REST_API_URL или KV_REST_API_TOKEN не найден в Environment Variables' });
    }

    let user, action, data;

    if (req.method === 'POST') {
      ({ user, action, data } = req.body || {});
    } else {
      user = req.query.user;
      action = req.query.action;
      data = {};
    }

    if (!user) {
      return res.status(400).json({ error: 'user is required' });
    }

    const key = `results:${user}`;

    if (action === 'save') {
      const getRes = await fetch(`\( {KV_URL}/get/ \){encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const getData = await getRes.json();
      let list = getData.result ? JSON.parse(getData.result) : [];

      list.unshift({ ...data, id: Date.now(), date: new Date().toISOString() });

      await fetch(`\( {KV_URL}/set/ \){encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: JSON.stringify(list.slice(0, 300)) })
      });

      return res.status(200).json({ success: true });
    }

    if (action === 'get') {
      const getRes = await fetch(`\( {KV_URL}/get/ \){encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const getData = await getRes.json();
      const list = getData.result ? JSON.parse(getData.result) : [];
      return res.status(200).json(list);
    }

    return res.status(400).json({ error: 'invalid action' });

  } catch (error) {
    console.error('Generations error:', error);
    return res.status(500).json({ error: error.message });
  }
}
