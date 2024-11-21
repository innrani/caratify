import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
// Use Heroku's dynamic port or fallback to 3000
const PORT = process.env.PORT || 3000;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

// Heroku-specific BASE_URL and CLIENT_URL configuration
const BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://caratify-964b2a7e01d7.herokuapp.com' 
    : `http://localhost:${PORT}`;
const CLIENT_URL = process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL || 'https://caratify-964b2a7e01d7.herokuapp.com'
    : `http://localhost:${PORT}`;
const redirect_uri = `${BASE_URL}/callback`;

// Validate required environment variables
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error('Required Spotify credentials missing');
    process.exit(1);
}

// Middleware
app.use(cors({
    origin: [
        CLIENT_URL, 
        'https://caratify-964b2a7e01d7.herokuapp.com',
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.resolve('public')));

// Spotify API fetch utility
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
        console.error('Callback error:', error);
        res.redirect(`${CLIENT_URL}/error.html?error=${encodeURIComponent(error.message)}`);
    }
};

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Login route with improved logging
app.get('/login', (req, res) => {
    const scope = 'user-top-read user-read-recently-played user-library-read';
    const state = req.query.type;
    
    console.log('Auth Flow Debug:');
    console.log('Client ID:', client_id);
    console.log('Redirect URI:', redirect_uri);
    console.log('State:', state);
    
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', client_id);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('redirect_uri', redirect_uri);
    authUrl.searchParams.append('state', state);
    
    res.redirect(authUrl.toString());
});

// Callback route (authentication handling)
app.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    // Add debug logging
    console.log('Callback received:', { code, state, error });

    if (error || !code) {
        console.log('Auth error or missing code:', error || 'no code provided');
        return res.redirect(`${CLIENT_URL}/error.html?error=${error || 'missing_code'}`);
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

        // Add success logging
        console.log('Token obtained successfully');
        
        const redirectMap = {
            'artists': '/top-artists.html',
            'tracks': '/top-tracks.html',
            'albums': '/top-albums.html'
        };

        const redirectPath = redirectMap[state] || '/error.html';
        res.redirect(`${CLIENT_URL}${redirectPath}?access_token=${tokenData.access_token}`);

    } catch (error) {
        console.error('Token exchange failed:', error);
        res.redirect(`${CLIENT_URL}/error.html?error=${encodeURIComponent(error.message)}`);
    }
});

// Spotify API Routes
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

// Static file routes
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path.resolve('public') });
});

app.get('/top-albums.html', (req, res) => {
    res.sendFile('top-albums.html', { root: path.resolve('public') });
});

// Redirect routes
['artists', 'tracks', 'albums'].forEach(type => {
    app.get(`/top-${type}`, (req, res) => {
        res.redirect(`/login?type=${type}`);
    });
});

// Final error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Simplified server startup for Heroku
const startServer = () => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Base URL: ${BASE_URL}`);
        console.log(`Client URL: ${CLIENT_URL}`);
    });
};

// Global error handlers
process.on('uncaughtException', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();
console.log('Redirect URI:', redirect_uri);

// Add explicit route for error page
app.get('/error.html', (req, res) => {
    res.sendFile('error.html', { root: path.resolve('public') });
});
