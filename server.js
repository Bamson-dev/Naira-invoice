require('dotenv').config();

const fs = require('fs');
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

function injectAppConfig(html) {
  const config = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  };
  const script = `<script>window.__APP_CONFIG__=${JSON.stringify(config)};</script>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${script}\n</head>`);
  }
  return `${script}${html}`;
}

function serveAuthPage(filename, res) {
  const filePath = path.join(__dirname, 'public', filename);
  const html = fs.readFileSync(filePath, 'utf8');
  res.type('html').send(injectAppConfig(html));
}

app.get('/favicon.ico', (req, res) => {
  res.redirect(301, '/favicon.svg');
});

app.get('/login.html', (req, res) => serveAuthPage('login.html', res));
app.get('/signup.html', (req, res) => serveAuthPage('signup.html', res));

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
