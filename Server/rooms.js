const htmlEntities = new (require('html-entities').AllHtmlEntities)().encodeNonUTF;
const db = require('./database');
const shortId = require('shortid');

const Fight = function(id) {
    this.fighters = [];
    var fightId = id;

    this.isWaiting = () => (this.fighters.length === 1);
    this.isEmpty = () => (this.fighters.length <= 0);
    this.getId = () => fightId;
    this.isPlayerHere = (player) => this.fighters.includes(player);

    this.join = (fighter) => {
        this.fighters.push(fighter);
        fighter.socket.emit('fight.join.success', {
            fightId
        });
        this.fighters.forEach(player => {
            player.socket.emit('fight.playerJoined', {
                fightId,
                newPlayer: fighter.getUsername(),
                fighters: this.fighters.map(f => f.getUsername())
            });
        });
    };
    
    this.leave = (fighter) => {
        this.fighters = this.fighters.filter(f => f !== fighter);
        fighter.socket.emit('fight.leave.success', {
            fightId
        });
        this.fighters.forEach(player => {
            player.socket.emit('fight.opponentLeft', {
                playerName: fighter.getUsername(),
                fighters: this.fighters.map(f => f.getUsername())
            });
        });
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
            return sock.emit('chat.error', `The room "${roomName}" doesn't exist.`);
        }
        sock.emit('chat.getHistory', chats[roomName].history);
    });
    sock.on('chat.addMessage', data => {
        if (!sock.signedIn) {
            return sock.emit('chat.error', `You must be signed in to send messages in chat.`);
        }
        if (!db.checkToken(sock.username, data.token)) {
            return sock.emit('chat.error', `Your access token is invalid.`);
        }
        if (!(data.room in chats)) {
            return sock.emit('chat.error', `The room you're trying to chat in doesn't exist.`);
        }
        if (!chats[data.room].isPlayerHere(player)) {
            return sock.emit('chat.error', `You are not in the room "${data.room}".`);
        }
        chats[data.room].addMessage(player, htmlEntities(data.message));
    });

    sock.on('fight.join.firstAvailable', data => {
        if (!sock.signedIn) {
            return sock.emit('fight.join.error', `You must be signed in to join a battle.`);
        }
        if (!db.checkToken(sock.username, data.token)) {
            return sock.emit('fight.join.error', `Your access token is invalid.`);
        }
        let available = fights.find(fight => fight.isWaiting());
        let empty = fights.find(fight => fight.isEmpty());
        let fight = available || empty || new Fight(shortId.generate());
        fight.join(player);
        fights.set(fight.getId(), fight);
    });
    sock.on('fight.leave', data => {
        if (!sock.signedIn) {
            return sock.emit('fight.leave.error', `You must be signed in to join a battle.`);
        }
        if (!db.checkToken(sock.username, data.token)) {
            return sock.emit('fight.leave.error', `Your access token is invalid.`);
        }
        let fight = fights.get(data.fightId);
        if (!fight) {
            return sock.emit('fight.leave.error', `That battle ID does not exist.`);
        }
        if (!fight.isPlayerHere(player)) {
            return sock.emit('fight.leave.error', `You are not in that battle.`);
        }
        fight.leave(player);
        if (fight.isEmpty()) {
            fights.delete(data.fightId);
        }
    });
};

module.exports = {
    Fight,
    Chat,
    attachListeners
};