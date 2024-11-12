import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI || `http://localhost:${PORT}/callback`;


app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Root route must come first
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

app.get('/login', (req, res) => {
    const scope = 'user-top-read user-read-recently-played user-library-read';
    const state = req.query.type;
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;
    res.redirect(authUrl);
});

app.get('/top-artists', (req, res) => {
    res.redirect('/login?type=artists');
});

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state;
    console.log('Callback state:', state)

    try {
        // Get access token
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
            console.log(state)
            switch(state) {
                case 'artists':
                    res.redirect(`/top-artists.html?access_token=${tokenData.access_token}`);
                    break;
                case 'tracks':
                    res.redirect(`/top-tracks.html?access_token=${tokenData.access_token}`);
                    break;
                case 'albums':
                    res.redirect(`/top-albums.html?access_token=${tokenData.access_token}`);
                    break;
                default:
                    res.redirect(`/sorry.html?access_token=${tokenData.access_token}`);
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

app.get('/top-songs', async (req, res) => {
    const accessToken = req.query.access_token;

    try {
        const response = await fetch('https://api.spotify.com/v1/me/top/tracks', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        // Log complete response
        const responseBody = await response.text();
        console.log('Response Body:', responseBody);

        // Check if response was successful
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

app.get('/top-tracks', (req, res) => {
    res.redirect('/login?type=tracks');
});

app.get('/top-artists', (req, res) => {
    res.redirect('/login?type=artists');
});

app.get('/top-albums', (req, res) => {
    res.redirect('/login?type=albums');
});

app.get('/top-albums.html', (req, res) => {
    res.sendFile('top-albums.html', { root: './public' });
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

// Start server - SINGLE listen call with proper error handling
let server;
const startServer = async () => {
    try {
        // Close existing connections if any
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        // Create new server
        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use`);
                setTimeout(() => {
                    server.close();
                    startServer();
                }, 1000);
            } else {
                console.error('Server error:', err);
                process.exit(1);
            }
        });

        // Handle various shutdown signals
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

// Start the server
startServer();
