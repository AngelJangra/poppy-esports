// api/fetch-ff-data.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid } = req.query;
  if (!uid) {
    return res.status(400).json({ error: 'UID is required' });
  }

  try {
    const response = await fetch(`http://187.127.175.208:5000/Bmw?uid=${uid}`);
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch UID data' });
  }
}
