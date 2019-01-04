const htmlEntities = new (require('html-entities').AllHtmlEntities)().encodeNonUTF;
const db = require('./database');

const Fight = function() {
    this.fighters = [];

    this.isWaiting = () => (this.fighters.length === 1);
    this.isEmpty = () => (this.fighters.length <= 0);

    this.join = (fighter) => {
        this.fighters.push(fighter);
    };
    
    this.leave = (fighter) => {
        this.fighters = this.fighters.filter(f => f !== fighter);
    };
};

const Chat = function(name) {
    this.players = [];
    this.history = [];
    this.name = name || 'lobby';

    this.isPlayerHere = (player) => this.players.includes(player);

    this.addMessage = (player, message) => {
        this.history.push({
            player: player.getUsername(),
            message,
            isSystem: false
        });
        if (this.history.length > 100) {
            this.history.shift();
        }
        this.players.forEach(p => {
            p.socket.emit('chat.addMessage', {
                player: player.getUsername(),
                message,
                isSystem: false
            })
        });
    };

    this.join = (player) => {
        this.players.push(player);
        player.joinChat(this.name, this.history);
    };

    this.leave = (player) => {
        this.players = this.players.filter(p => p !== player);
        if (this.name !== 'lobby') {
            player.joinChat('lobby');
        }
    };
}

const attachListeners = function(player, chats, fights) {
    let sock = player.socket;
    sock.on('chat.getHistory', roomName => {
        if (!(roomName in chats)) {
            sock.emit('chat.error', `The room "${roomName}" doesn't exist.`);
        }
        else {
            sock.emit('chat.getHistory', chats[roomName].history);
        }
    });
    sock.on('chat.addMessage', data => {
        if (!sock.signedIn) {
            sock.emit('chat.error', `You must be signed in to send messages in chat.`);
        }
        else if (!db.checkToken(sock.username, data.token)) {
            sock.emit('chat.error', `Your access token is invalid.`);
        }
        else if (!(data.room in chats)) {
            sock.emit('chat.error', `The room you're trying to chat in doesn't exist.`);
        }
        else if (!chats[data.room].isPlayerHere(player)) {
            sock.emit('chat.error', `You are not in the room "${data.room}".`);
        }
        else {
            chats[data.room].addMessage(player, htmlEntities(data.message));
        }
    });
};

module.exports = {
    Fight,
    Chat,
    attachListeners
};