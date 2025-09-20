import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import WebSocket from 'ws';
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });
    const io = new Server(server);
    io.on('connection', (socket) => {
        console.log('a user connected');
        socket.on('text-to-speech', (text) => {
            const ws = new WebSocket('wss://api.minimax.chat/v1/tts/stream', {
                headers: {
                    Authorization: `Bearer ${MINIMAX_API_KEY}`,
                },
            });
            ws.on('open', () => {
                ws.send(JSON.stringify({ text, voice: 'female-en-us' }));
            });
            ws.on('message', (data) => {
                socket.emit('audio-chunk', data);
            });
            ws.on('close', () => {
                socket.emit('audio-end');
            });
            ws.on('error', (error) => {
                console.error('Minimax WebSocket error:', error);
            });
        });
        socket.on('disconnect', () => {
            console.log('user disconnected');
        });
    });
    server.listen(3000, () => {
        console.log('server listening on port 3000');
    });
});
