const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const readline = require('readline');
const shortid = require('shortid');
const db = require('./Server/database');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout 
});

const entities = require('./Server/entities');
const rooms = require('./Server/rooms');

const PORT = process.env.PORT || 80;

// Server
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/Client/index.html');
});
app.use(express.static('./Client'));

function getDebug() {
    rl.question('Enter debug command: ', cmd => {
        console.log(eval(cmd));
        console.log('');
        getDebug();
    });
}

console.out = (...data) => {
    rl.pause();
    console.log('');
    console.log.apply(console, data);
    console.log('Enter debug command: ');
    rl.resume();
};

// Socket
const players = {};
const fights = [];
const chats = {
    'lobby': new rooms.Chat()
};
io.on('connection', sock => {
    sock.id = shortid.generate();
    sock.username = sock.id;
    sock.signedIn = false;
    let player = new entities.Player(sock);
    players[sock.id] = player;

    sock.on('disconnect', () => {
        if (player.chatRoom in chats) {
            chats[player.chatRoom].leave(player);
        }
        delete players[sock.id];
    });
    db.attachListeners(sock, chats, player);
    rooms.attachListeners(player, chats, fights);
});

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    getDebug();
});