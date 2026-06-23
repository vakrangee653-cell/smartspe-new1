import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Enable JSON parse requests
app.use(express.json());

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
