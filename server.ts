import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';

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
