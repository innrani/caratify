import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.WEB_PORT || 3000; // Usando variável WEB_PORT para evitar conflitos com o API_PORT

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || '*'
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.resolve('public'))); // Caminho absoluto para garantir o acesso correto

// Rotas de arquivos estáticos
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: path.resolve('public') });
});

app.get('/top-albums.html', (req, res) => {
    res.sendFile('top-albums.html', { root: path.resolve('public') });
});

// Inicialização do servidor
let server;
const startServer = async () => {
    try {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }

        server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Web Server está rodando na porta ${PORT}`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Porta ${PORT} já está em uso`);
                setTimeout(() => {
                    server.close();
                    startServer();
                }, 1000);
            } else {
                console.error('Erro no servidor:', err);
                process.exit(1);
            }
        });

        // Desligamento controlado
        ['SIGTERM', 'SIGINT', 'SIGUSR2'].forEach(signal => {
            process.on(signal, () => {
                console.log(`Sinal ${signal} recebido: fechando servidor HTTP`);
                server.close(() => {
                    console.log('Servidor HTTP fechado');
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('Falha ao iniciar o servidor:', error);
        process.exit(1);
    }
};

startServer();
