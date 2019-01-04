const Fighter = function(player, side) {
    this.player = player;
    this.side = side;
    return this;
}

const Player = function(socket) {
    this.socket = socket;
    this.id = socket.id;
    this.chatRoom = '';

    this.getUsername = () => this.socket.username;

    this.joinChat = (roomName, history) => {
        this.chatRoom = roomName;
        this.socket.emit('chat.join', {
            roomName,
            history
        });
    };
}

module.exports = {
    Fighter,
    Player
}