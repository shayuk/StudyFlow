export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).json({
    message: 'API is working perfectly!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}
