require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const clientRoutes = require('./routes/clients');
const invoiceRoutes = require('./routes/invoices');
const profileRoutes = require('./routes/profile');
const onboardingRoutes = require('./routes/onboarding');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/config', configRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/i/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'invoice-public.html'));
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`NairaInvoice server running on http://localhost:${PORT}`);
});
