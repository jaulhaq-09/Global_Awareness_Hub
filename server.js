// server.js
// Full Express server for Global Awareness Hub (serves static pages + feedback API)

const { clear } = require('console');
const express = require('express');
const path = require('path');
const app = express();

// 1) Change this port if needed
const PORT = 3000;

// 2) Parse JSON request bodies (for feedback API)
app.use(express.json());

// 3) Serve static files from /public
//    Make sure you have: Global_Awareness_Hub/public/affdeff.html etc.
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// 4) In-memory feedback store (simple for now; later replace with DB)
const feedbackStore = [];

/*
  Feedback object shape we expect from frontend:

  {
    topic: 'affdeff' | 'climate' | 'animal' | ...,
    name: 'Student name',
    email: 'optional email',
    mood: 'excellent' | 'good' | 'ok' | 'bad' | '',
    message: 'their feedback text',
    createdAt: 'ISO timestamp'
  }
*/

// 5) POST /api/feedback  -> All topic pages send feedback here
app.post('/api/feedback', (req, res) => {
  const body = req.body || {};
  const entry = {
    id: Date.now().toString(),          // <--- ADD THIS FIELD
    topic: (body.topic || 'unknown').trim(),
    name: (body.name || '').trim(),
    email: (body.email || '').trim(),
    mood: (body.mood || '').trim(),
    message: (body.message || '').trim(),
    createdAt: body.createdAt || new Date().toISOString()
  };

  if (!entry.message) {
    return res.status(400).json({ ok: false, error: 'Message is required' });
  }

  feedbackStore.push(entry);
  console.log('New feedback received:', entry);
  return res.status(201).json({ ok: true });
});


// 6) GET /api/feedback  -> Admin page uses this to see feedback
//    Optional query ?topic=affdeff to filter
app.get('/api/feedback', (req, res) => {
  const topic = (req.query.topic || '').trim();

  let result = feedbackStore;
  if (topic) {
    result = result.filter(item => item.topic === topic);
  }

  return res.json(result);
});
app.delete('/api/feedback/:id', (req, res) => {
  const { id } = req.params;
  const index = feedbackStore.findIndex(f => (f.id || f._id) === id);
  if (index === -1) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }
  feedbackStore.splice(index, 1);
  return res.json({ ok: true });
});

// 7) Optional: root route can redirect to any main page (e.g., affdeff.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'affdeff.html'));
});

// 8) Start server
app.listen(PORT, () => {
  console.log('=======================================');
  console.log(`Global Awareness Hub server is running`);
  console.log(`Base URL:  http://localhost:${PORT}`);
  console.log('');
  console.log('Topic pages:');
  console.log(`  http://localhost:${PORT}/affdeff.html   (Afforestation & Deforestation)`);
  console.log(`  http://localhost:${PORT}/animal.html    (Animal cruelty)`);
  console.log(`  http://localhost:${PORT}/climate.html   (Climate)`);
  console.log(`  http://localhost:${PORT}/cyber.html     (Cyber)`);
  console.log(`  http://localhost:${PORT}/digital.html   (Digital)`);
  console.log(`  http://localhost:${PORT}/financial.html (Financial)`);
  console.log(`  http://localhost:${PORT}/mental.html    (Mental)`);
  console.log(`  http://localhost:${PORT}/parents.html   (Parents)`);
  console.log(`  http://localhost:${PORT}/plastic.html   (Plastic)`);
  console.log(`  http://localhost:${PORT}/water.html     (Water)`);
  console.log(`  http://localhost:${PORT}/women.html     (Women)`);
  console.log(`  http://localhost:${PORT}/first.html     (First Page)`);
  console.log(`  http://localhost:${PORT}/second.html     (Second Page)`);
  console.log(`  http://localhost:${PORT}/login.html   (Login Page)`);
  console.log(`  http://localhost:${PORT}/adminlogin.html   (Admin Login Page)`);
  console.log(`  http://localhost:${PORT}/signup.html   (Sign UP Page)`);

  console.log('');
  console.log('Admin page:');
  console.log(`  http://localhost:${PORT}/adminpanel.html`);
  console.log('');
  console.log('Feedback API:');
  console.log(`  POST http://localhost:${PORT}/api/feedback`);
  console.log(`  GET  http://localhost:${PORT}/api/feedback`);
  console.log(`  GET  http://localhost:${PORT}/api/feedback?topic=affdeff`);
  console.log('=======================================');
});
