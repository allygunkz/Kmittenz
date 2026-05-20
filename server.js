const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const https = require('https');

app.use(express.static(__dirname + '/public'));

let players = {};
let bannedWords = new Set();

https.get('https://www.cs.cmu.edu/~biglou/resources/bad-words.txt', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        data.split('\n').forEach(word => {
            let cleanWord = word.trim().toLowerCase();
            if (cleanWord) bannedWords.add(cleanWord);
        });
        console.log(`Loaded ${bannedWords.size} bad words into memory.`);
    });
}).on('error', (err) => {
    console.error('Failed to load bad words list:', err.message);
});

function moderateMessage(text) {
    let words = text.split(/\s+/);
    let moderatedWords = words.map(word => {
        let cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
        if (bannedWords.has(cleanWord)) {
            return '*'.repeat(word.length);
        }
        return word;
    });
    return moderatedWords.join(' ');
}

io.on('connection', (socket) => {
    console.log('A kitten logged in! ID:', socket.id);

    players[socket.id] = {
        x: 400,
        y: 300,
        id: socket.id,
        spriteKey: 'cat_south'
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].spriteKey = movementData.spriteKey;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('sendMessage', (messageText) => {
        let cleanMessage = moderateMessage(messageText);
        io.emit('incomingMessage', {
            id: socket.id,
            text: cleanMessage
        });
    });

    socket.on('disconnect', () => {
        console.log('A kitten logged out. ID:', socket.id);
        delete players[socket.id];
        io.emit('disconnect_player', socket.id);
    });
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Kmittenz server is running on http://localhost:${PORT}`);
});