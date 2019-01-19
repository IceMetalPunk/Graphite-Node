import {AssetLoader, ProgressOutput} from './loaders.js'
import Util from './util.js'

const socket = io();
let chatList = [];
let chatMessages = undefined;
let currentChatRoom = undefined;
let myId = '';

let chatOutput, chatInput, chatDiv;
let signupUsername, signupPass, signupForm, signupVerifyPass;
let signinUsername, signinPass, signinForm, signoutLink;
let accessToken = '', username = '';
let fightId = undefined;

function showError(message) {
    console.log(message);
}

function loadChat() {
    if (currentChatRoom === undefined) {
        chatDiv.classList.add('hidden');
        return;
    }
    else {
        chatDiv.classList.remove('hidden');
    }
    if (chatMessages === undefined) {
        chatOutput.innerHTML = '<b>No messages to display.</b>';
    }
    else {
        chatOutput.innerHTML = '';
        chatMessages.forEach(message => {
            let mSpan = document.createElement('span');
            mSpan.classList.add('chat-message');
            if (!message.isSystem) {
                mSpan.innerHTML = `<b>${message.player}</b>: ${message.message}`;
            }
            else {
                mSpan.classList.add('chat-system');
                mSpan.innerHTML = `${message.message}`;
            }
            chatOutput.appendChild(mSpan);
        });
    }
}

socket.on('chat.list', list => {
    chatList = list;
});
socket.on('player.init', id => {
    myId = id;
});
socket.on('chat.join', data => {
    currentChatRoom = data.roomName;
    chatMessages = data.history;
    if (chatMessages === undefined) {
        socket.emit('chat.getHistory', currentChatRoom);
    }
    else {
        chatMessages.push({
            message: 'You have joined the room ' + data.roomName + '.',
            isSystem: true
        });
        loadChat();
    }
});
socket.on('chat.getHistory', history => {
    chatMessages = history;
    chatMessages.push({
        message: 'You have joined the room ' + data.roomName + '.',
        isSystem: true
    });
    loadChat();
});
socket.on('chat.error', message => {
    chatMessages.push({
        message,
        isSystem: true
    });
    loadChat();
});
socket.on('chat.addMessage', message => {
    chatMessages.push(message);
    loadChat();
});

socket.on('auth.signUp.success', () => {
    alert('Successfully signed up!');
});
socket.on('auth.signUp.error', err => {
    alert('Failure to sign up!');
    showError(err);
});

socket.on('auth.signOut.success', () => {
    accessToken = '';
    username = myId;
    chatDiv.classList.add('hidden');
    signoutLink.classList.add('hidden');
    signinForm.classList.remove('hidden');
});

socket.on('auth.signOut.error', err => {
    showError(err);
});

socket.on('auth.signIn.success', data => {
    alert('Successfully signed in!');
    accessToken = data.token;
    userame = data.username;
    signoutLink.classList.remove('hidden');
    signinForm.classList.add('hidden');
    signupForm.classList.add('hidden');
});
socket.on('auth.signIn.error', err => {
    alert('Failure to sign in!');
    showError(err);
});

socket.on('fight.join.error', err => {
    showError(err);
});
socket.on('fight.join.success', data => {
    console.log(data);
    fightId = data.fightId;
});
socket.on('fight.leave.success', data => {
    fightId = undefined;
    console.log(data);
});
socket.on('fight.leave.error', err => {
    showError(err);
});
socket.on('fight.opponentLeft', data => {
    console.log(data);
});
socket.on('fight.playerJoined', data => {
    console.log(data);
});

function chatKey(event) {
    if (event.keyCode === 13) {
        socket.emit('chat.addMessage', {
            room: currentChatRoom,
            message: chatInput.value,
            token: accessToken
        });
        chatInput.value = '';
    }
};

function signUp(ev) {
    ev.preventDefault();
    if (signupPass.value !== signupVerifyPass.value) {
        showError('Your passwords do not match.');
    }
    else {
        socket.emit('auth.signUp', {
            username: signupUsername.value,
            password: signupPass.value
        });
    }
    return false;
}

function signIn(ev) {
    ev.preventDefault();
    socket.emit('auth.signIn', {
        username: signinUsername.value,
        password: signinPass.value
    });
    return false;
}

function signOut() {
    socket.emit('auth.signOut', accessToken);
}
function joinFight() {
    if (fightId === undefined) {
        socket.emit('fight.join.firstAvailable', {
            token: accessToken
        });
    }
    else {
        showError(`You are already in a battle with ID ${fightId}!`);
    }
}
function leaveFight() {
    if (fightId !== undefined) {
        socket.emit('fight.leave', {
            token: accessToken,
            fightId
        });
    }
}

function setup() {
    chatOutput = document.getElementById('chat-output');
    chatInput = document.getElementById('chat-input');
    chatDiv = document.getElementById('chat');
    chatInput.addEventListener('keydown', chatKey);
    signupUsername = document.getElementById('signup-name');
    signupPass = document.getElementById('signup-pass');
    signupVerifyPass = document.getElementById('signup-pass-verify');
    signupForm = document.getElementById('signup');
    signupForm.addEventListener('submit', signUp);

    signinUsername = document.getElementById('signin-name');
    signinPass = document.getElementById('signin-pass');
    signinForm = document.getElementById('signin');
    signinForm.addEventListener('submit', signIn);

    signoutLink = document.getElementById('signout');
    signoutLink.addEventListener('click', signOut);
    window.addEventListener('beforeunload', signOut);

    document.getElementById('show-signin').addEventListener('click', ev => {
        signinForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    });
    document.getElementById('show-signup').addEventListener('click', ev => {
        signupForm.classList.remove('hidden');
        signinForm.classList.add('hidden');
    });
}
document.addEventListener('DOMContentLoaded', setup);