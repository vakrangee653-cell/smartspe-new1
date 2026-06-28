import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { eq, and, or, inArray, desc } from 'drizzle-orm';

const app = express();
const PORT = 3000;

// Enable JSON parse requests
app.use(express.json());

// API endpoint to send a verification OTP via Gmail (Nodemailer)
app.post('/api/send-otp', async (req, res) => {
  const { email, otp, name, context } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and OTP are required.' });
  }

  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';

  if (!smtpUser || !smtpPass) {
    console.log(`[SMTP SIMULATOR] Send OTP ${otp} to ${email}`);
    return res.json({ 
      success: true, 
      simulated: true, 
      message: 'SMTP/Gmail secrets missing in Environment. Simulating OTP code delivery.',
      otp: otp
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const contextText = context || 'Verification Security Challenge';

    const mailOptions = {
      from: `"SmartSpe Security Gateway" <${smtpUser}>`,
      to: email,
      subject: `🗝️ Verification Security OTP: ${otp}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">SmartSpe Portal</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Secure Identity Verification Gateway</p>
          </div>
          <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
            <p style="font-size: 14px; color: #334155; margin-top: 0;">Heey <strong>${name || 'User'}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              SmartSpe पोर्टल पर लॉगिन या पंजीकरण सत्यापन के लिए आपका ६-अंकीय सुरक्षा ओटीपी कोड (Security OTP Code) नीचे दिया गया है:
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <span style="display: inline-block; font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #4f46e5; background-color: #f5f3ff; padding: 12px 28px; border-radius: 10px; border: 2px dashed #c084fc;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #ef4444; font-weight: bold; margin-bottom: 20px; text-align: center;">
              ⚠️ सुरक्षा चेतावनी: यह कोड केवल ५ मिनट के लिए वैध है। इसे किसी के भी साथ साझा न करें।
            </p>
            <p style="font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 16px; margin: 0; line-height: 1.5;">
              <strong>सत्यापन विवरण (Audit Log):</strong><br>
              प्रकार: ${contextText}<br>
              समय: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST<br>
              स्थान: India (Vakrangee Point Secure Node)
            </p>
          </div>
          <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8;">
            &copy; 2026 SmartSpe Financial Services. All rights reserved.
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.json({ success: true, simulated: false, message: 'OTP sent directly to Gmail!' });
  } catch (error: any) {
    console.error('Nodemailer error:', error);
    return res.status(500).json({ success: false, error: error.message || 'SMTP transfer transaction failed.' });
  }
});

// API endpoints to support Google Sign-In (OAuth)
app.get('/api/auth/url', (req, res) => {
  // Use CLIENT_ID provided in environment by set_up_oauth tool
  const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '1058778401344-dummy.apps.googleusercontent.com';
  
  // Construct self-redirect uri using APP_URL or request origin fallback
  let rawAppUrl = process.env.APP_URL || '';
  if (!rawAppUrl) {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    rawAppUrl = `${protocol}://${host}`;
  }
  
  const appUrl = rawAppUrl.replace(/\/$/, '');
  const redirectUri = `${appUrl}/auth/callback`;

  // Standard Google OAuth 2.0 authorization endpoint
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'consent',
    access_type: 'online'
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

// Callback endpoint to exchange code for Google User Profile details
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.status(400).send(`
      <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f1f5f9; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; }
            h1 { color: #f87171; font-size: 1.5rem; }
          </style>
        </head>
        <body>
          <div className="card">
            <h1>Authentication Failed / Cancelled</h1>
            <p>${error || 'No authentication code provided.'}</p>
            <button onclick="window.close()" style="background: #ef4444; border: none; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; margin-top: 1rem;">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }

  try {
    const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
    
    let rawAppUrl = process.env.APP_URL || '';
    if (!rawAppUrl) {
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      rawAppUrl = `${protocol}://${host}`;
    }
    const appUrl = rawAppUrl.replace(/\/$/, '');
    const redirectUri = `${appUrl}/auth/callback`;

    // Exchange auth code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Google token exchange failed: ${errText}`);
    }

    const tokens = await tokenResponse.json();
    const accessToken = tokens.access_token;

    // Fetch Google User Profile using UserInfo API
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to retrieve user profile from Google.');
    }

    const profile = await userResponse.json();

    // Send successful user profile data back to parent window using postMessage
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f1f5f9; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 400px; }
            h1 { color: #10b981; font-size: 1.5rem; margin-bottom: 0.5rem; }
            img { width: 64px; height: 64px; border-radius: 50%; border: 2px solid #10b981; margin: 1rem 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Authentication Successful!</h1>
            <p>Signed in as <strong>${profile.name || profile.email}</strong></p>
            ${profile.picture ? `<img src="${profile.picture}" alt="Profile avatar" />` : ''}
            <p style="font-size: 0.8rem; color: #94a3b8;">This popup window will close automatically and redirect your terminal portal.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  profile: ${JSON.stringify(profile)}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Callback error:', err);
    res.status(500).send(`
      <html>
        <head>
          <title>OAuth Server Error</title>
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f1f5f9; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; }
            h1 { color: #ef4444; font-size: 1.5rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>OAuth Authentication Error</h1>
            <p>${err?.message || 'A server-side error occurred during token exchange.'}</p>
            <button onclick="window.close()" style="background: #ef4444; border: none; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; margin-top: 1rem;">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }
});

// ==========================================
// CLOUD SQL POSTGRESQL STATE REST APIS (MODULE 1)
// ==========================================

const defaultShopDetails = {
  name: 'Vakrangee Kendra (वाकरंगी केंद्र)',
  mobile: '+91 90010 12345',
  gmail: 'vakrangee653@gmail.com',
  address: 'मुख्य चौराха, वार्ड नं. 12, राजस्थान',
  logoUrl: ''
};

const defaultCommissionSettings = {
  emitraCommission: 12,
  aepsCommission: 15,
  dmtCommission: 10,
  upiCommission: 5
};

// GET user profile from PostgreSQL
app.get('/api/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const userRow = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    if (userRow.length > 0) {
      res.json({ success: true, user: userRow[0] });
    } else {
      res.status(404).json({ success: false, error: 'User not found.' });
    }
  } catch (err: any) {
    console.error('[GET User Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user from SQL.' });
  }
});

// POST user profile to PostgreSQL
app.post('/api/user', async (req, res) => {
  const user = req.body;
  if (!user.id) {
    return res.status(400).json({ success: false, error: 'User ID is required.' });
  }
  try {
    await db.insert(schema.users)
      .values(user)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: user
      });
    res.json({ success: true, message: 'User saved to PostgreSQL!' });
  } catch (err: any) {
    console.error('[POST User Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save user.' });
  }
});

// GET complete state, merged with individual table rows
app.get('/api/state/:userId', async (req, res) => {
  const { userId } = req.params;
  const role = (req.query.role || 'Super Admin') as string;
  const currentUserId = (req.query.currentUserId || userId) as string;

  try {
    // 1. Fetch monolithic state from app_states
    const stateRow = await db.select().from(schema.appStates).where(eq(schema.appStates.userId, userId)).limit(1);
    let stateData = stateRow.length > 0 ? (stateRow[0].state as any) : null;

    if (!stateData) {
      stateData = {};
    }

    const filterId = currentUserId || (userId.startsWith('shop_state_') ? userId.replace('shop_state_', '') : userId);

    // 2. Fetch latest collections from SQL relational tables
    let usersList = [];
    if (role === 'Super Admin') {
      usersList = await db.select().from(schema.users);
    } else if (role === 'Admin' && filterId) {
      usersList = await db.select().from(schema.users).where(eq(schema.users.adminId, filterId));
    } else if (role === 'Operator' && filterId) {
      usersList = await db.select().from(schema.users).where(eq(schema.users.id, filterId));
    } else {
      usersList = await db.select().from(schema.users);
    }

    // Transactions
    let txList = [];
    if (role === 'Super Admin') {
      txList = await db.select().from(schema.transactions).orderBy(desc(schema.transactions.timestamp));
    } else if (role === 'Admin' && filterId) {
      txList = await db.select().from(schema.transactions).where(eq(schema.transactions.adminId, filterId)).orderBy(desc(schema.transactions.timestamp));
    } else if (role === 'Operator' && filterId) {
      txList = await db.select().from(schema.transactions).where(eq(schema.transactions.operatorId, filterId)).orderBy(desc(schema.transactions.timestamp));
    } else {
      txList = await db.select().from(schema.transactions).orderBy(desc(schema.transactions.timestamp));
    }

    // Emitra apps
    let emitraList = [];
    if (role === 'Super Admin') {
      emitraList = await db.select().from(schema.emitraApplications);
    } else if (role === 'Admin' && filterId) {
      emitraList = await db.select().from(schema.emitraApplications).where(eq(schema.emitraApplications.createdBy, filterId));
    } else if (role === 'Operator' && filterId) {
      emitraList = await db.select().from(schema.emitraApplications).where(eq(schema.emitraApplications.operatorId, filterId));
    } else {
      emitraList = await db.select().from(schema.emitraApplications);
    }

    // Offline work
    let offlineList = [];
    if (role === 'Super Admin') {
      offlineList = await db.select().from(schema.offlineWorkItems);
    } else if (role === 'Admin' && filterId) {
      offlineList = await db.select().from(schema.offlineWorkItems).where(eq(schema.offlineWorkItems.createdBy, filterId));
    } else if (role === 'Operator' && filterId) {
      offlineList = await db.select().from(schema.offlineWorkItems).where(eq(schema.offlineWorkItems.operatorId, filterId));
    } else {
      offlineList = await db.select().from(schema.offlineWorkItems);
    }

    // Expenses
    let expList = [];
    if (role === 'Super Admin') {
      expList = await db.select().from(schema.expenses);
    } else if (role === 'Admin' && filterId) {
      expList = await db.select().from(schema.expenses).where(eq(schema.expenses.createdBy, filterId));
    } else if (role === 'Operator' && filterId) {
      expList = await db.select().from(schema.expenses).where(eq(schema.expenses.addedBy, filterId));
    } else {
      expList = await db.select().from(schema.expenses);
    }

    // Customers
    let custList = [];
    if (role === 'Super Admin') {
      custList = await db.select().from(schema.customers);
    } else if (role === 'Admin' && filterId) {
      custList = await db.select().from(schema.customers).where(eq(schema.customers.createdBy, filterId));
    } else {
      custList = await db.select().from(schema.customers);
    }

    // Settlements
    let setList = [];
    if (role === 'Super Admin') {
      setList = await db.select().from(schema.settlements);
    } else if (role === 'Admin' && filterId) {
      setList = await db.select().from(schema.settlements).where(eq(schema.settlements.adminId, filterId));
    } else if (role === 'Operator' && filterId) {
      setList = await db.select().from(schema.settlements).where(eq(schema.settlements.operatorId, filterId));
    } else {
      setList = await db.select().from(schema.settlements);
    }

    // Notifications
    let notifList = [];
    if (role === 'Super Admin') {
      notifList = await db.select().from(schema.notifications);
    } else if (filterId) {
      notifList = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, filterId));
    } else {
      notifList = await db.select().from(schema.notifications);
    }

    // Timeline
    let timelineList = [];
    if (role === 'Super Admin') {
      timelineList = await db.select().from(schema.activityTimeline);
    } else if (filterId) {
      timelineList = await db.select().from(schema.activityTimeline).where(eq(schema.activityTimeline.userId, filterId));
    } else {
      timelineList = await db.select().from(schema.activityTimeline);
    }

    // Commission rules
    const rulesList = await db.select().from(schema.commissionRules);

    // Wallets
    const walletRows = await db.select().from(schema.wallets);
    const mainW = walletRows.find(w => w.userId === 'main_wallet');
    const aepsW = walletRows.find(w => w.userId === 'aeps_wallet');
    const emitraW = walletRows.find(w => w.userId === 'emitra_wallet');

    // Shop settings
    const settingsRows = await db.select().from(schema.shopSettings);
    const shopD = settingsRows.find(s => s.key === 'shopDetails')?.value || defaultShopDetails;
    const commS = settingsRows.find(s => s.key === 'commissionSettings')?.value || defaultCommissionSettings;

    // Merge into stateData
    stateData.operators = usersList;
    stateData.transactions = txList;
    stateData.emitraApplications = emitraList;
    stateData.offlineWork = offlineList;
    stateData.expenses = expList;
    stateData.customers = custList;
    stateData.settlements = setList;
    stateData.notifications = notifList;
    stateData.activityTimeline = timelineList;
    stateData.commissionRules = rulesList;

    stateData.wallet = mainW ? {
      balance: mainW.balance,
      openingBalance: mainW.openingBalance,
      currentBalance: mainW.currentBalance,
      credit: mainW.credit,
      debit: mainW.debit,
      closingBalance: mainW.closingBalance,
      availableBalance: mainW.availableBalance,
      lastUpdated: mainW.lastUpdated
    } : { balance: 15000, lastUpdated: new Date().toISOString() };

    stateData.aepsWallet = aepsW ? {
      onlineBalance: aepsW.availableBalance,
      physicalBalance: aepsW.balance,
      lastUpdated: aepsW.lastUpdated
    } : { onlineBalance: 15000, physicalBalance: 15000, lastUpdated: new Date().toISOString() };

    stateData.emitraWallet = emitraW ? {
      balance: emitraW.balance,
      lastUpdated: emitraW.lastUpdated
    } : { balance: 15000, lastUpdated: new Date().toISOString() };

    stateData.shopDetails = shopD;
    stateData.commissionSettings = commS;

    res.json({ success: true, state: stateData });
  } catch (err: any) {
    console.error('[GET State Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to load state from SQL.' });
  }
});

// POST to save monolithic state, proactively syncing to separate relational tables
app.post('/api/state/:userId', async (req, res) => {
  const { userId } = req.params;
  const { state } = req.body;

  if (!state) {
    return res.status(400).json({ success: false, error: 'State is required.' });
  }

  try {
    // 1. Save state monolith to app_states
    await db.insert(schema.appStates)
      .values({ userId, state })
      .onConflictDoUpdate({
        target: schema.appStates.userId,
        set: { state, updatedAt: new Date() }
      });

    // 2. Proactively sync sub-collections to individual relational tables
    const currentUser = state.currentUser;
    const role = currentUser?.role || 'Super Admin';
    const activeAdminId = role === 'Operator' ? (currentUser?.createdBy || '') : (currentUser?.id || '');

    // Sync Operators / Users
    if (Array.isArray(state.operators)) {
      for (const op of state.operators) {
        if (!op.id) continue;
        const now = new Date().toISOString();
        const balance = op.walletBalance !== undefined 
          ? Number(op.walletBalance) 
          : (op.walletLimit !== undefined ? Number(op.walletLimit) : 15000);

        const mappedUser = {
          id: op.id,
          uid: op.uid || op.id,
          name: op.name || '',
          email: (op.email || '').toLowerCase().trim(),
          phoneNumber: op.phoneNumber || op.mobile || null,
          mobile: op.mobile || op.phoneNumber || null,
          role: op.role || 'Operator',
          adminId: op.adminId || op.createdBy || activeAdminId || '',
          createdBy: op.createdBy || 'System',
          permissions: op.permissions || ['Dashboard', 'Wallet', 'Banking', 'Reports', 'Transactions', 'Profile'],
          status: op.status || 'Active',
          walletLimit: Number(op.walletLimit !== undefined ? op.walletLimit : balance),
          walletBalance: balance,
          commissionRate: op.commissionRate !== undefined ? Number(op.commissionRate) : 12,
          failedAttempts: op.failedAttempts !== undefined ? Number(op.failedAttempts) : 0,
          isLockedOut: !!op.isLockedOut,
          password: op.password || '',
          photoUrl: op.photoUrl || '',
          address: op.address || '',
          createdAt: op.createdAt || now,
          updatedAt: now
        };

        await db.insert(schema.users)
          .values(mappedUser)
          .onConflictDoUpdate({
            target: schema.users.id,
            set: mappedUser
          });
      }
    }

    // Sync Wallets
    if (state.wallet || state.aepsWallet || state.emitraWallet) {
      if (state.wallet) {
        const mainVal = {
          userId: 'main_wallet',
          userName: 'Main Wallet',
          role: 'System',
          balance: Number(state.wallet.balance || 0),
          openingBalance: Number(state.wallet.openingBalance || 0),
          currentBalance: Number(state.wallet.currentBalance || state.wallet.balance || 0),
          credit: Number(state.wallet.credit || 0),
          debit: Number(state.wallet.debit || 0),
          closingBalance: Number(state.wallet.closingBalance || state.wallet.balance || 0),
          availableBalance: Number(state.wallet.availableBalance || state.wallet.balance || 0),
          lastUpdated: state.wallet.lastUpdated || new Date().toISOString()
        };
        await db.insert(schema.wallets)
          .values(mainVal)
          .onConflictDoUpdate({
            target: schema.wallets.userId,
            set: mainVal
          });
      }
      if (state.aepsWallet) {
        const aepsVal = {
          userId: 'aeps_wallet',
          userName: 'AePS Wallet',
          role: 'System',
          balance: Number(state.aepsWallet.physicalBalance || 0),
          openingBalance: 0,
          currentBalance: Number(state.aepsWallet.onlineBalance || 0),
          credit: 0,
          debit: 0,
          closingBalance: Number(state.aepsWallet.physicalBalance || 0),
          availableBalance: Number(state.aepsWallet.onlineBalance || 0),
          lastUpdated: state.aepsWallet.lastUpdated || new Date().toISOString()
        };
        await db.insert(schema.wallets)
          .values(aepsVal)
          .onConflictDoUpdate({
            target: schema.wallets.userId,
            set: aepsVal
          });
      }
      if (state.emitraWallet) {
        const emitraVal = {
          userId: 'emitra_wallet',
          userName: 'eMitra Wallet',
          role: 'System',
          balance: Number(state.emitraWallet.balance || 0),
          openingBalance: 0,
          currentBalance: Number(state.emitraWallet.balance || 0),
          credit: 0,
          debit: 0,
          closingBalance: Number(state.emitraWallet.balance || 0),
          availableBalance: Number(state.emitraWallet.balance || 0),
          lastUpdated: state.emitraWallet.lastUpdated || new Date().toISOString()
        };
        await db.insert(schema.wallets)
          .values(emitraVal)
          .onConflictDoUpdate({
            target: schema.wallets.userId,
            set: emitraVal
          });
      }
    }

    // Sync Transactions
    if (Array.isArray(state.transactions)) {
      for (const tx of state.transactions) {
        if (!tx.id) continue;
        const mappedTx = {
          id: tx.id,
          timestamp: tx.timestamp || new Date().toISOString(),
          customerId: tx.customerId || null,
          customerName: tx.customerName || '',
          aadhaarNumber: tx.aadhaarNumber || null,
          type: tx.type || 'Deposit',
          amount: Number(tx.amount || 0),
          fee: Number(tx.fee || 0),
          char: Number(tx.char || tx.fee || 0),
          commission: Number(tx.commission || 0),
          status: tx.status || 'Success',
          operatorId: tx.operatorId || '',
          operatorName: tx.operatorName || '',
          beneficiaryName: tx.beneficiaryName || null,
          beneficiaryAccount: tx.beneficiaryAccount || null,
          beneficiaryIFSC: tx.beneficiaryIFSC || null,
          bankName: tx.bankName || null,
          utrNumber: tx.utrNumber || '',
          walletDebited: !!tx.walletDebited,
          createdBy: tx.createdBy || '',
          adminId: tx.adminId || activeAdminId || '',
          openingBalance: tx.openingBalance !== undefined ? Number(tx.openingBalance) : null,
          closingBalance: tx.closingBalance !== undefined ? Number(tx.closingBalance) : null,
          date: tx.date || null,
          time: tx.time || null
        };
        await db.insert(schema.transactions)
          .values(mappedTx)
          .onConflictDoUpdate({
            target: schema.transactions.id,
            set: mappedTx
          });
      }
    }

    // Sync Emitra apps
    if (Array.isArray(state.emitraApplications)) {
      for (const app of state.emitraApplications) {
        if (!app.id) continue;
        const mappedApp = {
          id: app.id,
          applicantName: app.applicantName || '',
          applicantPhone: app.applicantPhone || '',
          serviceType: app.serviceType || '',
          appliedDate: app.appliedDate || new Date().toISOString(),
          feeCharged: Number(app.feeCharged || 0),
          commissionEarned: Number(app.commissionEarned || 0),
          status: app.status || 'Success',
          tokenNumber: app.tokenNumber || '',
          dueAmount: Number(app.dueAmount || 0),
          operatorId: app.operatorId || '',
          notes: app.notes || null,
          documentsSubmitted: app.documentsSubmitted || [],
          paymentMode: app.paymentMode || null,
          createdBy: app.createdBy || activeAdminId || ''
        };
        await db.insert(schema.emitraApplications)
          .values(mappedApp)
          .onConflictDoUpdate({
            target: schema.emitraApplications.id,
            set: mappedApp
          });
      }
    }

    // Sync Offline work items
    if (Array.isArray(state.offlineWork)) {
      for (const item of state.offlineWork) {
        if (!item.id) continue;
        const mappedItem = {
          id: item.id,
          receivedDate: item.receivedDate || new Date().toISOString(),
          customerName: item.customerName || '',
          phoneNumber: item.phoneNumber || '',
          workDescription: item.workDescription || '',
          documentsReceived: item.documentsReceived || [],
          pendingSteps: item.pendingSteps || [],
          status: item.status || 'Pending',
          dueAmount: Number(item.dueAmount || 0),
          deliveryDate: item.deliveryDate || null,
          followUpDate: item.followUpDate || null,
          followUpNotes: item.followUpNotes || null,
          operatorId: item.operatorId || '',
          serviceType: item.serviceType || null,
          totalCharged: item.totalCharged !== undefined ? Number(item.totalCharged) : null,
          baseCost: item.baseCost !== undefined ? Number(item.baseCost) : null,
          commissionEarned: item.commissionEarned !== undefined ? Number(item.commissionEarned) : null,
          amountCollected: item.amountCollected !== undefined ? Number(item.amountCollected) : null,
          paymentMode: item.paymentMode || null,
          createdBy: item.createdBy || activeAdminId || ''
        };
        await db.insert(schema.offlineWorkItems)
          .values(mappedItem)
          .onConflictDoUpdate({
            target: schema.offlineWorkItems.id,
            set: mappedItem
          });
      }
    }

    // Sync Expenses
    if (Array.isArray(state.expenses)) {
      for (const exp of state.expenses) {
        if (!exp.id) continue;
        const mappedExp = {
          id: exp.id,
          type: exp.type || null,
          description: exp.description || '',
          category: exp.category || '',
          amount: Number(exp.amount || 0),
          timestamp: exp.timestamp || new Date().toISOString(),
          paymentMode: exp.paymentMode || 'Cash',
          addedBy: exp.addedBy || '',
          notes: exp.notes || null,
          createdBy: exp.createdBy || activeAdminId || ''
        };
        await db.insert(schema.expenses)
          .values(mappedExp)
          .onConflictDoUpdate({
            target: schema.expenses.id,
            set: mappedExp
          });
      }
    }

    // Sync Customers
    if (Array.isArray(state.customers)) {
      for (const cust of state.customers) {
        if (!cust.id) continue;
        const mappedCust = {
          id: cust.id,
          name: cust.name || '',
          phoneNumber: cust.phoneNumber || '',
          aadhaarNumber: cust.aadhaarNumber || null,
          panNumber: cust.panNumber || null,
          janAadhaarNumber: cust.janAadhaarNumber || null,
          address: cust.address || '',
          dueAmount: Number(cust.dueAmount || 0),
          documents: cust.documents || [],
          notes: cust.notes || null,
          createdAt: cust.createdAt || new Date().toISOString(),
          followUpDate: cust.followUpDate || null,
          followUpNotes: cust.followUpNotes || null,
          createdBy: cust.createdBy || activeAdminId || ''
        };
        await db.insert(schema.customers)
          .values(mappedCust)
          .onConflictDoUpdate({
            target: schema.customers.id,
            set: mappedCust
          });
      }
    }

    // Sync Shop settings
    if (state.shopDetails) {
      await db.insert(schema.shopSettings)
        .values({ key: 'shopDetails', value: state.shopDetails })
        .onConflictDoUpdate({
          target: schema.shopSettings.key,
          set: { value: state.shopDetails }
        });
    }
    if (state.commissionSettings) {
      await db.insert(schema.shopSettings)
        .values({ key: 'commissionSettings', value: state.commissionSettings })
        .onConflictDoUpdate({
          target: schema.shopSettings.key,
          set: { value: state.commissionSettings }
        });
    }

    // Sync Security logs
    if (Array.isArray(state.securityLogs)) {
      for (const log of state.securityLogs) {
        if (!log.id) continue;
        const mappedLog = {
          id: log.id,
          timestamp: log.timestamp || new Date().toISOString(),
          operatorId: log.operatorId || '',
          operatorName: log.operatorName || '',
          role: log.role || 'Operator',
          action: log.action || '',
          status: log.status || 'Success',
          ipAddress: log.ipAddress || '',
          device: log.device || '',
          browser: log.browser || '',
          createdBy: log.createdBy || activeAdminId || ''
        };
        await db.insert(schema.securityLogs)
          .values(mappedLog)
          .onConflictDoUpdate({
            target: schema.securityLogs.id,
            set: mappedLog
          });
      }
    }

    // Sync Wallet ledger
    if (Array.isArray(state.walletLedger)) {
      for (const entry of state.walletLedger) {
        if (!entry.id) continue;
        const mappedEntry = {
          id: entry.id,
          userId: entry.userId || '',
          userName: entry.userName || '',
          role: entry.role || 'Operator',
          transactionId: entry.transactionId || '',
          service: entry.service || '',
          openingBalance: Number(entry.openingBalance || 0),
          credit: Number(entry.credit || 0),
          debit: Number(entry.debit || 0),
          closingBalance: Number(entry.closingBalance || 0),
          availableBalance: Number(entry.availableBalance || 0),
          status: entry.status || 'Success',
          operatorId: entry.operatorId || '',
          adminId: entry.adminId || activeAdminId || '',
          timestamp: entry.timestamp || new Date().toISOString()
        };
        await db.insert(schema.walletLedger)
          .values(mappedEntry)
          .onConflictDoUpdate({
            target: schema.walletLedger.id,
            set: mappedEntry
          });
      }
    }

    // Sync Notifications
    if (Array.isArray(state.notifications)) {
      for (const n of state.notifications) {
        if (!n.notificationId) continue;
        const mappedNotif = {
          notificationId: n.notificationId,
          title: n.title || '',
          message: n.message || '',
          type: n.type || 'info',
          userId: n.userId || '',
          role: n.role || 'Operator',
          status: n.status || 'unread',
          createdAt: n.createdAt || new Date().toISOString(),
          channelsSent: n.channelsSent || []
        };
        await db.insert(schema.notifications)
          .values(mappedNotif)
          .onConflictDoUpdate({
            target: schema.notifications.notificationId,
            set: mappedNotif
          });
      }
    }

    // Sync Settlements
    if (Array.isArray(state.settlements)) {
      for (const s of state.settlements) {
        if (!s.id) continue;
        const mappedSet = {
          id: s.id,
          amount: Number(s.amount || 0),
          bankName: s.bankName || '',
          accountHolder: s.accountHolder || '',
          accountNumber: s.accountNumber || '',
          ifscCode: s.ifscCode || '',
          type: s.type || 'Standard',
          status: s.status || 'Pending',
          operatorId: s.operatorId || '',
          operatorName: s.operatorName || '',
          adminId: s.adminId || activeAdminId || '',
          approvedBy: s.approvedBy || null,
          approvedByName: s.approvedByName || null,
          approvedAt: s.approvedAt || null,
          remarks: s.remarks || null,
          createdAt: s.createdAt || new Date().toISOString(),
          timestamp: s.timestamp || new Date().toISOString()
        };
        await db.insert(schema.settlements)
          .values(mappedSet)
          .onConflictDoUpdate({
            target: schema.settlements.id,
            set: mappedSet
          });
      }
    }

    // Sync Activity timeline
    if (Array.isArray(state.activityTimeline)) {
      for (const act of state.activityTimeline) {
        if (!act.id) continue;
        const mappedAct = {
          id: act.id,
          timestamp: act.timestamp || new Date().toISOString(),
          userId: act.userId || '',
          userName: act.userName || '',
          role: act.role || 'Operator',
          actionType: act.actionType || '',
          details: act.details || '',
          status: act.status || 'Success',
          amount: act.amount !== undefined ? Number(act.amount) : null,
          ipAddress: act.ipAddress || null
        };
        await db.insert(schema.activityTimeline)
          .values(mappedAct)
          .onConflictDoUpdate({
            target: schema.activityTimeline.id,
            set: mappedAct
          });
      }
    }

    // Sync Commission rules
    if (Array.isArray(state.commissionRules)) {
      for (const r of state.commissionRules) {
        if (!r.id) continue;
        const mappedRule = {
          id: r.id,
          service: r.service || '',
          targetType: r.targetType || '',
          targetId: r.targetId || '',
          targetName: r.targetName || '',
          rateType: r.rateType || '',
          rateValue: Number(r.rateValue || 0),
          enabled: !!r.enabled,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString(),
          history: r.history || []
        };
        await db.insert(schema.commissionRules)
          .values(mappedRule)
          .onConflictDoUpdate({
            target: schema.commissionRules.id,
            set: mappedRule
          });
      }
    }

    res.json({ success: true, message: 'State synchronized in Cloud SQL PostgreSQL successfully!' });
  } catch (err: any) {
    console.error('[POST State Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to sync state to PostgreSQL.' });
  }
});

// Secure PostgreSQL ACID-compliant financial transaction engine
app.post('/api/banking/transaction', async (req, res) => {
  const params = req.body;
  if (!params.userId || !params.type || !params.amount) {
    return res.status(400).json({ success: false, error: 'Missing required parameters.' });
  }

  const txnId = `TXN${Math.floor(100000 + Math.random() * 900000)}`;
  const ledgerId = `LEDGER_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Check if transaction exists
      const existingTx = await tx.select().from(schema.transactions).where(eq(schema.transactions.id, txnId)).limit(1);
      if (existingTx.length > 0) {
        throw new Error('Duplicate transaction ID detected!');
      }

      // 2. Fetch current wallet
      const walletRow = await tx.select().from(schema.wallets).where(eq(schema.wallets.userId, params.userId)).limit(1);
      let openingBalance = 15000;
      if (walletRow.length > 0) {
        openingBalance = walletRow[0].balance ?? walletRow[0].currentBalance ?? 15000;
      }

      let credit = 0;
      let debit = 0;

      if (params.type === 'Deposit' || params.type === 'DMT' || params.type === 'UPI Payment') {
        debit = Number(params.amount) + Number(params.fee || 0);
      } else if (params.type === 'Withdrawal') {
        credit = Number(params.amount) + Number(params.commission || 0);
      }

      const closingBalance = openingBalance + credit - debit;
      const availableBalance = closingBalance;

      if (debit > 0 && openingBalance < debit) {
        throw new Error(`Insufficient wallet balance! Available: ₹${openingBalance}, Transaction requires: ₹${debit}`);
      }

      // 3. Upsert wallet
      const updatedWallet = {
        userId: params.userId,
        userName: params.userName || '',
        role: params.userRole || 'Operator',
        balance: availableBalance,
        openingBalance,
        currentBalance: closingBalance,
        credit,
        debit,
        closingBalance,
        availableBalance,
        lastUpdated: now
      };
      await tx.insert(schema.wallets)
        .values(updatedWallet)
        .onConflictDoUpdate({
          target: schema.wallets.userId,
          set: updatedWallet
        });

      // 4. Insert transaction
      const newTransaction = {
        id: txnId,
        timestamp: now,
        customerId: params.customerId || null,
        customerName: params.customerName || '',
        aadhaarNumber: params.aadhaarNumber || null,
        type: params.type,
        amount: Number(params.amount),
        fee: Number(params.fee || 0),
        char: Number(params.fee || 0),
        commission: Number(params.commission || 0),
        status: 'Success',
        operatorId: params.operatorId || params.userId,
        operatorName: params.operatorName || params.userName || '',
        adminId: params.adminId || '',
        utrNumber: params.utrNumber || `${Math.floor(300000000000 + Math.random() * 600000000000)}`,
        walletDebited: debit > 0,
        createdBy: params.adminId || '',
        openingBalance,
        closingBalance,
        date: now.split('T')[0],
        time: now.split('T')[1].substring(0, 8)
      };
      await tx.insert(schema.transactions).values(newTransaction);

      // 5. Insert ledger entry
      const newLedger = {
        id: ledgerId,
        userId: params.userId,
        userName: params.userName || '',
        role: params.userRole || 'Operator',
        transactionId: txnId,
        service: params.type,
        openingBalance,
        credit,
        debit,
        closingBalance,
        availableBalance,
        status: 'Success',
        operatorId: params.operatorId || params.userId,
        adminId: params.adminId || '',
        timestamp: now
      };
      await tx.insert(schema.walletLedger).values(newLedger);

      return { txnId, ledgerId, closingBalance };
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[SQL Transaction Error]', err);
    res.status(500).json({ success: false, error: err.message || 'SQL transaction execution failed.' });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
