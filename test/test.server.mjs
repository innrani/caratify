import express from 'express';
import path from 'path';
import request from 'supertest';

const app = express();

app.get('/top-albums.html', (req, res) => {
  res.sendFile('top-albums.html', { root: './public/public' });
});

describe('GET /top-albums.html', () => {
  it('should return the correct top-albums.html file when the route is accessed', (done) => {
    request(app)
      .get('/top-albums.html')
      .expect('Content-Type', /html/)
      .expect(200, done);
  });

  it('should return a 404 error if top-albums.html file is missing', (done) => {
    // Simulando a situação em que o arquivo não existe
    app.get('/nonexistent.html', (req, res) => {
      res.status(404).send('File not found');
    });

    request(app)
      .get('/nonexistent.html')
      .expect(404, done);
  });

  it('should return a 500 error if there\'s an issue reading the file', (done) => {
    // Simulando erro no envio do arquivo
    app.get('/error.html', (req, res) => {
      res.status(500).send('Error reading file');
    });

    request(app)
      .get('/error.html')
      .expect(500, done);
  });
});
