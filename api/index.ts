export default function handler(req: any, res: any) {
  res.status(200).json({ 
    message: 'API root is working!',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
}
