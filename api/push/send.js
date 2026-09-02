export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({ 
    status: "ok",
    method: req.method,
    message: "Push API is working" 
  });
}
