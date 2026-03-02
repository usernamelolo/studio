export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    console.log('=== GENERATIONS DEBUG ===');
    console.log('KV_REST_API_URL is set:', !!KV_URL);
    console.log('KV_REST_API_TOKEN is set:', !!KV_TOKEN);

    let user, action, data = {};

    // === РУЧНОЙ ПАРСИНГ ТЕЛА ДЛЯ POST (самый надёжный способ) ===
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req.body) {
        body += chunk;
      }
      if (body) {
        const parsed = JSON.parse(body);
        user = parsed.user;
        action = parsed.action;
        data = parsed.data || {};
      }
      console.log('POST body parsed → user:', user, 'action:', action);
    } else {
      user = req.query.user;
      action = req.query.action;
      console.log('GET query → user:', user, 'action:', action);
    }

    if (!user) {
      return res.status(400).json({ error: 'user is required' });
    }

    const key = `results:${user}`;

    if (action === 'save') {
      const getUrl = `\( {KV_URL}/get/ \){encodeURIComponent(key)}`;
      const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
      const getData = await getRes.json();

      console.log('KV get result:', getData.result ? 'exists' : 'null');

      let list = [];
      if (getData.result) {
        try {
          list = JSON.parse(getData.result);
        } catch (e) {
          console.log('JSON parse error, starting fresh');
          list = [];
        }
      }

      // ЗАЩИТА: всегда массив
      if (!Array.isArray(list)) list = [];

      list.unshift({ ...data, id: Date.now(), date: new Date().toISOString() });

      const setUrl = `\( {KV_URL}/set/ \){encodeURIComponent(key)}`;
      await fetch(setUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: JSON.stringify(list.slice(0, 300)) })
      });

      console.log('✅ Сохранено успешно, элементов:', list.length);
      return res.status(200).json({ success: true });
    }

    if (action === 'get') {
      const getUrl = `\( {KV_URL}/get/ \){encodeURIComponent(key)}`;
      const getRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${KV_TOKEN}` } });
      const getData = await getRes.json();

      let list = [];
      if (getData.result) {
        try {
          list = JSON.parse(getData.result);
        } catch (e) {}
      }
      if (!Array.isArray(list)) list = [];

      console.log('✅ Отправлено результатов:', list.length);
      return res.status(200).json(list);
    }

    return res.status(400).json({ error: 'invalid action' });

  } catch (error) {
    console.error('Generations error:', error);
    return res.status(500).json({ error: error.message });
  }
}
