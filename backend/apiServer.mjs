import express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const API_PORT = process.env.PORT || 3001;
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI || `http://localhost:${API_PORT}/callback`;

app.use(cors());
app.use(bodyParser.json());

// API Routes
app.get('/login', (req, res) => {
    const scope = 'user-top-read user-read-recently-played user-library-read';
    const state = req.query.type;
    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state;
    
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
            res.json({ access_token: tokenData.access_token, state: state });
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
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
});

app.listen(API_PORT, () => {
    console.log(`API Server running on port ${API_PORT}`);
});
