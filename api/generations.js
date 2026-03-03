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
      const getRes = await fetch(`${KV_REST_URL}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const getData = await getRes.json();

      let list = [];
      if (getData.result) {
        let raw = getData.result;
        for (let i = 0; i < 4; i++) {
          try {
            let temp = JSON.parse(raw);
            if (typeof temp === 'string') raw = temp;
            else if (temp && temp.value) raw = temp.value;
            else if (Array.isArray(temp)) { list = temp; break; }
            else list = temp;
          } catch(e) { break; }
        }
        if (!Array.isArray(list) && typeof raw === 'string') {
          try { list = JSON.parse(raw); } catch(e) {}
        }
      }
      if (!Array.isArray(list)) list = [];

      list.unshift({ ...data, id: Date.now(), date: new Date().toISOString() });

      await fetch(`${KV_REST_URL}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify(list.slice(0, 500)) })
      });

      console.log(`✅ СОХРАНЕНО | Всего записей: ${list.length}`);
      return res.status(200).json({ success: true });
    }

    if (action === 'get') {
      const getRes = await fetch(`${KV_REST_URL}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const getData = await getRes.json();

      let list = [];
      if (getData.result) {
        let raw = getData.result;
        for (let i = 0; i < 4; i++) {
          try {
            let temp = JSON.parse(raw);
            if (typeof temp === 'string') raw = temp;
            else if (temp && temp.value) raw = temp.value;
            else if (Array.isArray(temp)) { list = temp; break; }
            else list = temp;
          } catch(e) { break; }
        }
        if (!Array.isArray(list) && typeof raw === 'string') {
          try { list = JSON.parse(raw); } catch(e) {}
        }
      }
      if (!Array.isArray(list)) list = [];

      console.log(`✅ Загружено результатов: ${list.length}`);
      return res.status(200).json(list);
    }

    if (action === 'delete') {
      const idToDelete = data.id;
      const getRes = await fetch(`${KV_REST_URL}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` }
      });
      const getData = await getRes.json();

      let list = [];
      if (getData.result) {
        let raw = getData.result;
        for (let i = 0; i < 4; i++) {
          try {
            let temp = JSON.parse(raw);
            if (typeof temp === 'string') raw = temp;
            else if (temp && temp.value) raw = temp.value;
            else if (Array.isArray(temp)) { list = temp; break; }
            else list = temp;
          } catch(e) { break; }
        }
        if (!Array.isArray(list) && typeof raw === 'string') {
          try { list = JSON.parse(raw); } catch(e) {}
        }
      }

      list = list.filter(item => item.id !== idToDelete);

      await fetch(`${KV_REST_URL}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: JSON.stringify(list) })
      });

      console.log(`✅ УДАЛЕНО ID ${idToDelete}`);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'invalid action' });

  } catch (error) {
    console.error('Generations error:', error);
    return res.status(500).json({ error: error.message });
  }
}
