const crypto = require('crypto');
const mongo = require('mongojs');
const shortId = require('shortid');

const DB_PATH = process.env.DB_PATH || 'localhost/graphite';
const db = mongo(DB_PATH, ['users']);

const authTokens = {};
const TOKEN_EXP_TIME = 60 * 60 * 12;

const grantToken = function(username) {
    const existing = Object.keys(authTokens).find(key => {
        return authTokens[key].username === username;
    });
    if (existing) {
        return existing;
    }

    const token = shortId.generate();
    timestamp = Date.now();
    authTokens[token] = {
        username,
        timestamp
    };
    return token;
};

const revokeToken = function(token) {
    delete authTokens[token];
};

const checkToken = function(username, token) {
    let usernameLower = username.toLowerCase();
    if (!authTokens[token] || authTokens[token].username !== usernameLower) { return false; }
    let timestamp = Date.now();
    let dateDiff = timestamp - authTokens[token].timestamp;
    if (dateDiff < 0 || dateDiff > TOKEN_EXP_TIME) {
        revokeToken(token);
        return false;
    }
    return true;
}

const addUser = function(username, password) {
    let usernameLower = username.toLowerCase();
    return new Promise((resolve, reject) => {
        db.users.findOne({ usernameLower }, (err, doc) => {
            if (!err && doc) { return reject(`User already exists with that name.`); }
            const sha256 = crypto.createHash('sha256');
            const salt = shortId.generate();
            sha256.update(password + salt);
            const passHash = sha256.digest('hex');
            db.users.insert({
                username,
                usernameLower,
                passHash,
                salt
            }, err => {
                if (err) { reject(err); }
                resolve();
            });
        });
    });
};

const signIn = function(username, password) {
    let usernameLower = username.toLowerCase();
    return new Promise((resolve, reject) => {
        db.users.findOne({ usernameLower }, (err, doc) => {
            if (err || !doc) { return reject(`Username does not exist.`); }
            const salt = doc.salt;
            const sha256 = crypto.createHash('sha256');
            sha256.update(password + salt);
            const passHash = sha256.digest('hex');
            if (passHash === doc.passHash) {
                resolve({
                    token: grantToken(usernameLower),
                    username: doc.username
                });
            }
            else {
                reject('Invalid password.');
            }
        });
    });
};

const attachListeners = function(sock, chats, player) {
    sock.on('auth.signUp', data => {
        addUser(data.username, data.password)
        .then(() => {
            sock.emit('auth.signUp.success');
        })
        .catch(er => {
            sock.emit('auth.signUp.error', er);
        });
    });

    sock.on('auth.signIn', data => {
        signIn(data.username, data.password)
        .then(result => {
            sock.emit('auth.signIn.success', {
                username: result.username,
                token: result.token
            });
            sock.emit('chat.list', Object.keys(chats));
            sock.emit('player.init', sock.id);
            chats.lobby.join(player);
            sock.username = result.username;
            sock.signedIn = true;
        })
        .catch(er => {
            sock.emit('auth.signIn.error', er);
        });
    });

    sock.on('auth.signOut', token => {
        if (sock.signedIn && checkToken(sock.username, token)) {
            revokeToken(token);
            sock.signedIn = false;
            sock.username = sock.id;
            if (player.chatRoom in chats) {
                chats[player.chatRoom].leave(player);
            }
            sock.emit('auth.signOut.success');
        }
        else {
            sock.emit('auth.signOut.error', `You are not signed in or your token is invalid.`);
        }
    });
};

module.exports = {
    addUser,
    attachListeners,
    checkToken,
    grantToken,
    revokeToken
}