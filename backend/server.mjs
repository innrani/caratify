import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import * as Sentry from "@sentry/node";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Sentry before other middleware
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app }),
  ],
  tracesSampleRate: NODE_ENV === 'production' ? 0.2 : 1.0,
});
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const BASE_URL = process.env.NODE_ENV === 'production' 
    ? process.env.BASE_URL 
    : `http://localhost:${PORT}`;
const CLIENT_URL = NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : `http://localhost:${PORT}`;
const redirect_uri = `${BASE_URL}/callback`;

// Validate required environment variables
if (!client_id || !client_secret) {
    console.error('Missing required environment variables');
    process.exit(1);
}

// Middleware
app.use(cors({
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.resolve('public')));

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Add Sentry error handler before your existing error handler
app.use(Sentry.Handlers.errorHandler());
// Error handling middleware
app.use((err, req, res, next) => {
    Sentry.captureException(err);
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Static file routes
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path.resolve('public') });
});

app.get('/top-albums.html', (req, res) => {
    res.sendFile('top-albums.html', { root: path.resolve('public') });
});

// Spotify Auth Routes
app.get('/login', (req, res) => {
    const scope = 'user-top-read user-read-recently-played user-library-read';
    const state = req.query.type;
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
  const spotifyFetch = async (url, accessToken) => {
      try {
          const response = await fetch(url, {
              headers: {
                  'Authorization': `Bearer ${accessToken}`,
              },
          });

          if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
          }

          return response.json();
      } catch (error) {
          Sentry.captureException(error);
          throw error;
      }
  };
    }
};    authUrl.searchParams.append('client_id', client_id);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('redirect_uri', redirect_uri);
    authUrl.searchParams.append('state', state);
    
    res.redirect(authUrl.toString());
});

app.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.redirect(`${CLIENT_URL}/error.html?error=${error}`);
    }

    if (!code) {
        return res.redirect(`${CLIENT_URL}/error.html?error=missing_code`);
    }

    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error || 'Failed to get access token');
        }

        const redirectMap = {
            'artists': '/top-artists.html',
            'tracks': '/top-tracks.html',
            'albums': '/top-albums.html'
        };

        const redirectPath = redirectMap[state] || '/error.html';
        res.redirect(`${CLIENT_URL}${redirectPath}?access_token=${tokenData.access_token}`);

    } catch (error) {
        console.error('Callback error:', error);
        res.redirect(`${CLIENT_URL}/error.html?error=${encodeURIComponent(error.message)}`);
    }
});

// Spotify API Routes
const spotifyFetch = async (url, accessToken) => {
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

app.get('/top-songs', async (req, res) => {
    try {
        const data = await spotifyFetch(
            'https://api.spotify.com/v1/me/top/tracks',
            req.query.access_token
        );
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/find-seventeen', async (req, res) => {
    try {
        const data = await spotifyFetch(
            'https://api.spotify.com/v1/me/top/artists?limit=50',
            req.query.access_token
        );

        const seventeenArtist = data.items.find(artist => 
            artist.name.toUpperCase() === 'SEVENTEEN'
        );

        res.json({
            message: seventeenArtist 
                ? `SEVENTEEN is your #${data.items.indexOf(seventeenArtist) + 1} top artist!`
                : "SEVENTEEN is not in your top 50 artists",
            position: seventeenArtist ? data.items.indexOf(seventeenArtist) + 1 : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Redirect routes
['artists', 'tracks', 'albums'].forEach(type => {
    app.get(`/top-${type}`, (req, res) => {
        res.redirect(`/login?type=${type}`);
    });
});

// Server setup with graceful shutdown
const startServer = () => {
    let server;
    const portRange = { min: 3000, max: 3999 };
    
    const getRandomPort = () => 
        Math.floor(Math.random() * (portRange.max - portRange.min + 1)) + portRange.min;

    const tryStartServer = (retries = 5) => {
        const currentPort = getRandomPort();
        
        try {
            server = app.listen(currentPort, '0.0.0.0', () => {
                console.log(`Server successfully started on port ${currentPort}`);
            }).on('error', (err) => {
                if (err.code === 'EADDRINUSE' && retries > 0) {
                    console.log(`Port ${currentPort} in use, trying another random port`);
                    tryStartServer(retries - 1);
                } else {
                    console.error('Server failed to start:', err);
                    process.exit(1);
                }
            });

            // Keep existing shutdown handlers
            const shutdown = async () => {
                console.log('Shutting down gracefully...');
                if (server) {
                    await new Promise((resolve) => {
                        server.close((err) => {
                            if (err) {
                                console.error('Error during shutdown:', err);
                                process.exit(1);
                            }
                            resolve();
                        });
                    });
                }
                process.exit(0);
            };

            ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
                process.on(signal, shutdown);
            });

        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    };

    tryStartServer();
};

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown();
});

startServer();

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(Sentry.Handlers.errorHandler());
