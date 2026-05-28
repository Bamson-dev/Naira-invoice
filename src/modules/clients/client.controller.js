const clientService = require('./client.service');

async function list(req, res) {
  const clients = await clientService.list(req.query.user_id || req.userId);
  res.json({ clients });
}

async function create(req, res) {
  const client = await clientService.create(req.userId, req.body);
  res.json({ client });
}

async function update(req, res) {
  const client = await clientService.update(req.params.id, req.userId, req.body);
  res.json({ client });
}

async function remove(req, res) {
  await clientService.remove(req.params.id, req.userId);
  res.json({ success: true });
}

module.exports = { list, create, update, remove };
