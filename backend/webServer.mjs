import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const WEB_PORT = process.env.WEB_PORT || 3000;

app.use(express.static('public'));

// Static file routes
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

app.get('/top-artists', (req, res) => {
    res.sendFile('top-artists.html', { root: './public' });
});

app.get('/top-tracks', (req, res) => {
    res.sendFile('top-tracks.html', { root: './public' });
});

app.get('/top-albums', (req, res) => {
    res.sendFile('top-albums.html', { root: './public' });
});

app.listen(WEB_PORT, () => {
    console.log(`Web Server running on port ${WEB_PORT}`);
});
