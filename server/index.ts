
import express from 'express';
import session from 'express-session';
import { z } from 'zod';
import { createBankIDClient } from 'bankid';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupRoutes } from './routes';
import { MemoryStore } from 'memorystore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 5000;

// Initialize BankID client
const certPath = path.join(__dirname, '../certs/');
console.log('Connecting to BankID API at: https://appapi2.bankid.com/ ');
console.log('Using attached test certificate files');

const client = createBankIDClient({
  refreshInterval: 1000,
  production: false,
  pfx: '',
  passphrase: '',
  ca: '',
});

console.log('BankID client initialized successfully');

// Setup session middleware
const sessionStore = MemoryStore(session);
app.use(
  session({
    store: new sessionStore({
      checkPeriod: 86400000,
    }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  }),
);

app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../dist/public')));

// Setup routes
setupRoutes(app, client);

app.listen(port, '0.0.0.0', () => {
  console.log(`[express] serving on port ${port}`);
});
