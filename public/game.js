const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#333333',
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let controlMode = 'mouse'; 
let targetPosition = null;

function preload() {
    this.load.image('cat_south', 'assets/cfa90c0126a1b68e7f06c7bffc316e09.png'); 
    this.load.image('cat_north', 'assets/3b48a18a3bd1df30fad190f9d6956a46.png'); 
    this.load.image('cat_east', 'assets/dedad305be4b0552b91b35c8c8cf7bed.png');   
    this.load.image('cat_west', 'assets/5a427b4df31d34ca423d74e23b2ef606.png');   
    this.load.image('cat_southeast', 'assets/0e5eae88bf8e9808d9b030c08e0d007d.png');
    this.load.image('cat_southwest', 'assets/313c815a0f74811655f810ce4c41dbbf.png');
    this.load.image('cat_northeast', 'assets/768ab1801dbae8ed978ddc2dde164591.png');
    this.load.image('cat_northwest', 'assets/dd4e5f4e6ac151c449cbceb1c90f771a.png');
}

function create() {
    const self = this;
    this.socket = io(); 
    this.otherPlayers = this.physics.add.group(); 

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach((id) => {
            if (players[id].id === self.socket.id) {
                addPlayer(self, players[id]);
            } else {
                addOtherPlayers(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', (playerInfo) => {
        addOtherPlayers(self, playerInfo);
    });

    this.socket.on('disconnect_player', (playerId) => {
        self.otherPlayers.getChildren().forEach((otherPlayer) => {
            if (playerId === otherPlayer.playerId) {
                if (otherPlayer.chatBubble) otherPlayer.chatBubble.destroy();
                otherPlayer.nameTag.destroy();
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', (playerInfo) => {
        self.otherPlayers.getChildren().forEach((otherPlayer) => {
            if (playerInfo.id === otherPlayer.playerId) {
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                otherPlayer.nameTag.setPosition(playerInfo.x, playerInfo.y - 80);
                if (otherPlayer.chatBubble) otherPlayer.chatBubble.setPosition(playerInfo.x, playerInfo.y - 110);
                otherPlayer.setTexture(playerInfo.spriteKey); 
            }
        });
    });

    const chatBox = document.getElementById('chat-box');
    const chatInput = document.getElementById('chat-input');

    chatInput.addEventListener('focus', () => {
        self.input.keyboard.enabled = false;
        if (self.cursors && self.cursors.space) {
            self.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }
    });

    chatInput.addEventListener('blur', () => {
        self.input.keyboard.enabled = true;
        if (self.cursors && self.cursors.space) {
            self.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }
    });

    this.socket.on('incomingMessage', (data) => {
        const username = data.id === self.socket.id ? 'Me' : `Kitten_${data.id.substring(0,4)}`;
        chatBox.innerHTML += `<div><strong>${username}:</strong> ${data.text}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        if (data.id === self.socket.id && self.myCat) {
            showChatBubble(self, self.myCat, data.text);
        } else {
            self.otherPlayers.getChildren().forEach((otherPlayer) => {
                if (otherPlayer.playerId === data.id) {
                    showChatBubble(self, otherPlayer, data.text);
                }
            });
        }
    });

    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && chatInput.value.trim() !== '') {
            let message = chatInput.value.trim();
            
            // Textbox Command Handler
            if (message.toLowerCase() === '/controls') {
                if (controlMode === 'mouse') {
                    controlMode = 'keyboard';
                    targetPosition = null;
                    if (self.myCat) self.myCat.body.setVelocity(0);
                    chatBox.innerHTML += `<div style="color: #00ff00;">* Controls switched to KEYBOARD (WASD/Arrows) *</div>`;
                } else {
                    controlMode = 'mouse';
                    chatBox.innerHTML += `<div style="color: #00ff00;">* Controls switched to MOUSE *</div>`;
                }
                chatBox.scrollTop = chatBox.scrollHeight;
            } else {
                self.socket.emit('sendMessage', message);
            }
            
            chatInput.value = '';
            chatInput.blur(); 
        }
    });

    this.input.on('pointerdown', (pointer) => {
        if (!self.myCat || controlMode !== 'mouse') return;
        
        targetPosition = { x: pointer.x, y: pointer.y };
        
        const angle = Phaser.Math.Angle.Between(self.myCat.x, self.myCat.y, pointer.x, pointer.y);
        let degrees = Phaser.Math.RadToDeg(angle);

        let spriteKey = 'cat_south';
        if (degrees >= -22.5 && degrees < 22.5) spriteKey = 'cat_east';
        else if (degrees >= 22.5 && degrees < 67.5) spriteKey = 'cat_southeast';
        else if (degrees >= 67.5 && degrees < 112.5) spriteKey = 'cat_south';
        else if (degrees >= 112.5 && degrees < 157.5) spriteKey = 'cat_southwest';
        else if (degrees >= 157.5 || degrees < -157.5) spriteKey = 'cat_west';
        else if (degrees >= -157.5 && degrees < -112.5) spriteKey = 'cat_northwest';
        else if (degrees >= -112.5 && degrees < -67.5) spriteKey = 'cat_north';
        else if (degrees >= -67.5 && degrees < -22.5) spriteKey = 'cat_northeast';

        self.myCat.setTexture(spriteKey);
        this.physics.moveToObject(self.myCat, targetPosition, 200);
    });
}

function update() {
    const isTyping = document.activeElement === document.getElementById('chat-input');

    if (!this.myCat) return;

    if (controlMode === 'mouse' && targetPosition) {
        const distance = Phaser.Math.Distance.Between(this.myCat.x, this.myCat.y, targetPosition.x, targetPosition.y);
        
        if (distance < 5) {
            this.myCat.body.setVelocity(0);
            this.myCat.setPosition(targetPosition.x, targetPosition.y);
            targetPosition = null;
        }
        
        this.nameTag.setPosition(this.myCat.x, this.myCat.y - 80);
        if (this.myCat.chatBubble) this.myCat.chatBubble.setPosition(this.myCat.x, this.myCat.y - 110);
        this.socket.emit('playerMovement', { x: this.myCat.x, y: this.myCat.y, spriteKey: this.myCat.texture.key });
    }

    // --- UPDATED HERE: Only run keyboard movement if NOT typing ---
    if (!isTyping && controlMode === 'keyboard') {
        let vx = 0;
        let vy = 0;
        const speed = 200; 

        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;

        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

        this.myCat.body.setVelocity(vx, vy);
        this.nameTag.setPosition(this.myCat.x, this.myCat.y - 80);
        if (this.myCat.chatBubble) this.myCat.chatBubble.setPosition(this.myCat.x, this.myCat.y - 110);

        let spriteKey = this.myCat.texture.key; 

        if (vx > 0 && vy === 0) spriteKey = 'cat_east';
        else if (vx < 0 && vy === 0) spriteKey = 'cat_west';
        else if (vx === 0 && vy > 0) spriteKey = 'cat_south';
        else if (vx === 0 && vy < 0) spriteKey = 'cat_north';
        else if (vx > 0 && vy > 0) spriteKey = 'cat_southeast';
        else if (vx < 0 && vy > 0) spriteKey = 'cat_southwest';
        else if (vx > 0 && vy < 0) spriteKey = 'cat_northeast';
        else if (vx < 0 && vy < 0) spriteKey = 'cat_northwest';

        if (spriteKey !== this.myCat.texture.key || vx !== 0 || vy !== 0) {
            this.myCat.setTexture(spriteKey);
            this.socket.emit('playerMovement', { x: this.myCat.x, y: this.myCat.y, spriteKey: spriteKey });
        }
    } else if (isTyping && controlMode === 'keyboard') {
        // Keeps the cat completely still while typing
        this.myCat.body.setVelocity(0);
    }
}
function showChatBubble(scene, catSprite, text) {
    if (catSprite.chatBubble) catSprite.chatBubble.destroy();

    catSprite.chatBubble = scene.add.text(catSprite.x, catSprite.y - 110, text, {
        fontSize: '14px', fill: '#000', backgroundColor: '#ffffff', padding: { x: 6, y: 4 }
    }).setOrigin(0.5);

    scene.time.delayedCall(4000, () => {
        if (catSprite.chatBubble) {
            catSprite.chatBubble.destroy();
            catSprite.chatBubble = null;
        }
    });
}

function addPlayer(scene, playerInfo) {
    scene.myCat = scene.physics.add.sprite(playerInfo.x, playerInfo.y, playerInfo.spriteKey).setScale(0.5);
    scene.myCat.setCollideWorldBounds(true); 
    scene.nameTag = scene.add.text(playerInfo.x, playerInfo.y - 80, 'Me', {
        fontSize: '16px', fill: '#fff', backgroundColor: '#00000088', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
}

function addOtherPlayers(scene, playerInfo) {
    const otherPlayer = scene.add.sprite(playerInfo.x, playerInfo.y, playerInfo.spriteKey).setScale(0.5);
    otherPlayer.playerId = playerInfo.id;
    
    otherPlayer.nameTag = scene.add.text(playerInfo.x, playerInfo.y - 80, `Kitten_${playerInfo.id.substring(0,4)}`, {
        fontSize: '16px', fill: '#88ff88', backgroundColor: '#00000088', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    scene.otherPlayers.add(otherPlayer);
}
