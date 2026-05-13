const supabase = require('../utils/supabase');

exports.listClients = async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id required' });
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('client_name', { ascending: true });

    if (error) throw error;
    res.json({ clients: data });
  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createClient = async (req, res) => {
  try {
    const client = req.body;

    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(500).json({ error: 'Client was not created (no row returned).' });
    }
    res.json({ client: data });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = req.body;

    const { data, error } = await supabase
      .from('clients')
      .update(client)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Client not found or could not be updated.' });
    }
    res.json({ client: data });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: error.message });
  }
};
