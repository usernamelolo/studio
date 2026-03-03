export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const KV_REST_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;

    console.log('=== GENERATIONS DEBUG ===');
    console.log('KV_REST_API_URL:', KV_REST_URL ? 'set (' + KV_REST_URL.substring(0, 50) + '...)' : 'MISSING');
    console.log('KV_TOKEN set:', !!KV_TOKEN);
    console.log('Method:', req.method);

    if (!KV_REST_URL || !KV_REST_URL.startsWith('https://')) {
      return res.status(500).json({ error: 'KV_REST_API_URL не настроен или неправильный (должен быть https://...)' });
    }
    if (!KV_TOKEN) {
      return res.status(500).json({ error: 'KV_REST_API_TOKEN не настроен' });
    }

    let user, action, data = {};

    if (req.method === 'POST') {
      user = req.body?.user;
      action = req.body?.action;
      data = req.body?.data || {};
    } else {
      user = req.query.user;
      action = req.query.action;
    }

    if (!user) {
      return res.status(400).json({ error: 'user is required' });
    }

    const key = 'results:' + user;

    if (action === 'save') {
      const getUrl = KV_REST_URL + '/get/' + encodeURIComponent(key);
      const getRes = await fetch(getUrl, { headers: { Authorization: 'Bearer ' + KV_TOKEN } });
      const getData = await getRes.json();

      let list = [];
      if (getData.result) {
        try { list = JSON.parse(getData.result); } catch(e) {}
      }
      if (!Array.isArray(list)) list = [];

      list.unshift({ ...data, id: Date.now(), date: new Date().toISOString() });

      const setUrl = KV_REST_URL + '/set/' + encodeURIComponent(key);
      await fetch(setUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + KV_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: JSON.stringify(list.slice(0, 300)) })
      });

      console.log('✅ СОХРАНЕНО для пользователя', user);
      return res.status(200).json({ success: true });
    }

    if (action === 'get') {
      const getUrl = KV_REST_URL + '/get/' + encodeURIComponent(key);
      const getRes = await fetch(getUrl, { headers: { Authorization: 'Bearer ' + KV_TOKEN } });
      const getData = await getRes.json();

      let list = [];
      if (getData.result) {
        try { list = JSON.parse(getData.result); } catch(e) {}
      }
      if (!Array.isArray(list)) list = [];

      console.log('✅ Загружено результатов:', list.length);
      return res.status(200).json(list);
    }

    return res.status(400).json({ error: 'invalid action' });

  } catch (error) {
    console.error('Generations error:', error);
    return res.status(500).json({ error: error.message });
  }
}
