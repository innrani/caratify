import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Static file routes
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

app.get('/top-albums.html', (req, res) => {
    res.sendFile('top-albums.html', { root: './public' });
});

// Start server
let server;
const startServer = async () => {
    try {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Web Server is running on port ${PORT}`);
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