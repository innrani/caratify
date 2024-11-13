import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const API_PORT = process.env.API_PORT || 3001;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI || `http://localhost:${API_PORT}/callback`;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Spotify Auth Routes
app.get('/login', (req, res) => {
    const scope = 'user-top-read user-read-recently-played user-library-read';
    const state = req.query.type;
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state;
    console.log('Callback state:', state)

    try {
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri
            })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.access_token) {
            switch(state) {
                case 'artists':
                    res.redirect(`http://localhost:3000/top-artists.html?access_token=${tokenData.access_token}`);
                    break;
                case 'tracks':
                    res.redirect(`http://localhost:3000/top-tracks.html?access_token=${tokenData.access_token}`);
                    break;
                case 'albums':
                    res.redirect(`http://localhost:3000/top-albums.html?access_token=${tokenData.access_token}`);
                    break;
                default:
                    res.redirect(`http://localhost:3000/sorry.html?access_token=${tokenData.access_token}`);
            }
        }
    } catch (error) {
        console.error('Error in callback:', error);
        res.status(500).json({
            error: 'Authentication failed',
            details: error.message
        });
    }
});

// API Routes
app.get('/top-songs', async (req, res) => {
    const accessToken = req.query.access_token;

    try {
        const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const responseBody = await response.text();
        console.log('Response Body:', responseBody);

        if (!response.ok) {
            console.log(`HTTP error! status: ${response.status}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = JSON.parse(responseBody);
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error.message);
        res.status(500).send('Error fetching data: ' + error.message);
    }
});

app.get('/find-seventeen', async (req, res) => {
    const accessToken = req.query.access_token;

    try {
        const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=50', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await response.json();
    
        const seventeenArtist = data.items.find(artist => 
            artist.name.toUpperCase() === 'SEVENTEEN'
        );

        if (seventeenArtist) {
            const position = data.items.indexOf(seventeenArtist) + 1;
            res.json({
                message: `SEVENTEEN is your #${position} top artist!`,
                position: position
            });
        } else {
            res.json({
                message: "SEVENTEEN is not in your top 50 artists",
                position: null
            });
        }

    } catch (error) {
        console.error('Error finding SEVENTEEN:', error.message);
        res.status(500).send('Error finding SEVENTEEN: ' + error.message);
    }
});

// Redirect routes
app.get('/top-artists', (req, res) => {
    res.redirect('/login?type=artists');
});

app.get('/top-tracks', (req, res) => {
    res.redirect('/login?type=tracks');
});

app.get('/top-albums', (req, res) => {
    res.redirect('/login?type=albums');
});

// Start server
let server;
const startServer = async () => {
    try {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        server = app.listen(API_PORT, '0.0.0.0', () => {
            console.log(`API Server is running on port ${API_PORT}`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${API_PORT} is already in use`);
                setTimeout(() => {
                    server.close();
                    startServer();
                }, 1000);
            } else {
                console.error('Server error:', err);
                process.exit(1);
            }
        });

        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        signals.forEach(signal => {
            process.on(signal, () => {
                console.log(`${signal} received: closing HTTP server`);
                server.close(() => {
                    console.log('HTTP server closed');
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();