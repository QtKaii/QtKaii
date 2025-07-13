// Player system for Pocket DOOM 2.0
class Player {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        
        // Movement properties
        this.moveSpeed = 3.0;
        this.rotateSpeed = 2.0;
        this.radius = 0.2;
        
        // Health and armor
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.maxArmor = 200;
        this.armor = 0;
        
        // Input state
        this.keys = {};
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseSensitivity = 0.003;
        this.touchSensitivity = 0.005;
        
        // Movement vectors
        this.moveX = 0;
        this.moveY = 0;
        this.rotateDirection = 0;
        
        // Touch controls
        this.touchControls = {
            moveJoystick: { active: false, x: 0, y: 0, startX: 0, startY: 0 },
            lookJoystick: { active: false, x: 0, y: 0, startX: 0, startY: 0 }
        };
        
        // Initialize controls
        this.initializeControls();
        
        // Player state
        this.isDead = false;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        
        // Score
        this.score = 0;
    }
    
    initializeControls() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse events
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('click', (e) => this.onMouseClick(e));
        
        // Touch events for joysticks
        this.initializeTouchControls();
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Pointer lock for mouse look
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('click', () => {
            if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === canvas) {
                document.addEventListener('mousemove', this.boundPointerMove);
            } else {
                document.removeEventListener('mousemove', this.boundPointerMove);
            }
        });
    }
    
    initializeTouchControls() {
        const moveJoystick = document.getElementById('moveJoystick');
        const lookJoystick = document.getElementById('lookJoystick');
        
        // Move joystick
        moveJoystick.addEventListener('touchstart', (e) => this.onJoystickStart(e, 'move'));
        moveJoystick.addEventListener('touchmove', (e) => this.onJoystickMove(e, 'move'));
        moveJoystick.addEventListener('touchend', (e) => this.onJoystickEnd(e, 'move'));
        
        // Look joystick
        lookJoystick.addEventListener('touchstart', (e) => this.onJoystickStart(e, 'look'));
        lookJoystick.addEventListener('touchmove', (e) => this.onJoystickMove(e, 'look'));
        lookJoystick.addEventListener('touchend', (e) => this.onJoystickEnd(e, 'look'));
        
        // Prevent scrolling on touch
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('#touchControls')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    onKeyDown(event) {
        if (event.code === 'Escape') {
            window.gameInstance.togglePause();
            return;
        }
        
        this.keys[event.code] = true;
        
        // Weapon switching
        if (event.code === 'KeyQ' || event.code === 'KeyE') {
            window.gameInstance.weapon.switchWeapon(event.code === 'KeyQ' ? -1 : 1);
        }
        
        // Interaction
        if (event.code === 'KeyF' || event.code === 'Space') {
            this.interact();
        }
    }
    
    onKeyUp(event) {
        this.keys[event.code] = false;
    }
    
    onMouseMove(event) {
        if (document.pointerLockElement) {
            this.angle += event.movementX * this.mouseSensitivity;
        }
    }
    
    onPointerMove(event) {
        this.angle += event.movementX * this.mouseSensitivity;
    }
    
    onMouseClick(event) {
        if (event.button === 0) { // Left click
            window.gameInstance.weapon.shoot();
        }
    }
    
    onJoystickStart(event, type) {
        event.preventDefault();
        const touch = event.touches[0];
        const rect = event.target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        if (type === 'move') {
            this.touchControls.moveJoystick.active = true;
            this.touchControls.moveJoystick.startX = centerX;
            this.touchControls.moveJoystick.startY = centerY;
        } else {
            this.touchControls.lookJoystick.active = true;
            this.touchControls.lookJoystick.startX = centerX;
            this.touchControls.lookJoystick.startY = centerY;
        }
    }
    
    onJoystickMove(event, type) {
        event.preventDefault();
        if (!event.touches[0]) return;
        
        const touch = event.touches[0];
        const control = type === 'move' ? this.touchControls.moveJoystick : this.touchControls.lookJoystick;
        
        if (!control.active) return;
        
        const dx = touch.clientX - control.startX;
        const dy = touch.clientY - control.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 40; // Half of joystick size
        
        if (distance > maxDistance) {
            control.x = (dx / distance) * maxDistance;
            control.y = (dy / distance) * maxDistance;
        } else {
            control.x = dx;
            control.y = dy;
        }
        
        // Update visual handle position
        const handle = event.target.querySelector('.joystick-handle');
        if (handle) {
            handle.style.transform = `translate(-50%, -50%) translate(${control.x}px, ${control.y}px)`;
        }
    }
    
    onJoystickEnd(event, type) {
        event.preventDefault();
        const control = type === 'move' ? this.touchControls.moveJoystick : this.touchControls.lookJoystick;
        
        control.active = false;
        control.x = 0;
        control.y = 0;
        
        // Reset visual handle position
        const handle = event.target.querySelector('.joystick-handle');
        if (handle) {
            handle.style.transform = 'translate(-50%, -50%)';
        }
    }
    
    update(deltaTime, gameMap) {
        if (this.isDead) return;
        
        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
            }
        }
        
        this.updateMovement(deltaTime, gameMap);
        this.updateRotation(deltaTime);
    }
    
    updateMovement(deltaTime, gameMap) {
        let moveX = 0;
        let moveY = 0;
        
        // Keyboard input
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            moveX += Math.cos(this.angle);
            moveY += Math.sin(this.angle);
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            moveX -= Math.cos(this.angle);
            moveY -= Math.sin(this.angle);
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            moveX += Math.cos(this.angle - Math.PI / 2);
            moveY += Math.sin(this.angle - Math.PI / 2);
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            moveX += Math.cos(this.angle + Math.PI / 2);
            moveY += Math.sin(this.angle + Math.PI / 2);
        }
        
        // Touch joystick input
        if (this.touchControls.moveJoystick.active) {
            const joyX = this.touchControls.moveJoystick.x / 40; // Normalize to -1 to 1
            const joyY = this.touchControls.moveJoystick.y / 40;
            
            // Forward/backward
            moveX += Math.cos(this.angle) * -joyY;
            moveY += Math.sin(this.angle) * -joyY;
            
            // Strafe left/right
            moveX += Math.cos(this.angle + Math.PI / 2) * joyX;
            moveY += Math.sin(this.angle + Math.PI / 2) * joyX;
        }
        
        // Normalize movement vector
        const moveLength = Math.sqrt(moveX * moveX + moveY * moveY);
        if (moveLength > 0) {
            moveX = (moveX / moveLength) * this.moveSpeed * deltaTime;
            moveY = (moveY / moveLength) * this.moveSpeed * deltaTime;
            
            // Check collision and get valid position
            const newPos = gameMap.getValidPosition(this.x, this.y, this.x + moveX, this.y + moveY, this.radius);
            this.x = newPos.x;
            this.y = newPos.y;
        }
        
        // Check for item pickups
        const pickup = gameMap.checkItemPickup(this.x, this.y);
        if (pickup) {
            this.collectItem(pickup);
        }
    }
    
    updateRotation(deltaTime) {
        // Touch look joystick
        if (this.touchControls.lookJoystick.active) {
            const joyX = this.touchControls.lookJoystick.x / 40; // Normalize to -1 to 1
            this.angle += joyX * this.touchSensitivity * 60 * deltaTime; // 60 FPS normalized
        }
        
        // Keyboard rotation
        if (this.keys['KeyQ']) {
            this.angle -= this.rotateSpeed * deltaTime;
        }
        if (this.keys['KeyE']) {
            this.angle += this.rotateSpeed * deltaTime;
        }
        
        // Normalize angle
        while (this.angle < 0) this.angle += Math.PI * 2;
        while (this.angle >= Math.PI * 2) this.angle -= Math.PI * 2;
    }
    
    interact() {
        // Check for doors in front of player
        const interactDistance = 1.5;
        const checkX = this.x + Math.cos(this.angle) * interactDistance;
        const checkY = this.y + Math.sin(this.angle) * interactDistance;
        
        if (window.gameInstance.map.getTile(checkX, checkY) === 2) {
            window.gameInstance.map.interactWithDoor(checkX, checkY);
            window.gameInstance.audio.playSound('doorOpen');
        }
    }
    
    collectItem(pickup) {
        const { type } = pickup;
        
        if (type === 'health') {
            const oldHealth = this.health;
            this.health = Math.min(this.maxHealth, this.health + 25);
            if (this.health > oldHealth) {
                window.gameInstance.audio.playSound('itemPickup');
                window.gameInstance.ui.showMessage('+25 HEALTH');
            }
        } else if (type === 'ammo') {
            window.gameInstance.weapon.addAmmo(30);
            window.gameInstance.audio.playSound('itemPickup');
            window.gameInstance.ui.showMessage('+30 AMMO');
        }
        
        this.score += 10;
    }
    
    takeDamage(amount) {
        if (this.isDead || this.invulnerable) return false;
        
        // Armor absorbs some damage
        if (this.armor > 0) {
            const armorAbsorbed = Math.min(amount * 0.5, this.armor);
            this.armor -= armorAbsorbed;
            amount -= armorAbsorbed;
        }
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            window.gameInstance.audio.playSound('playerDeath');
            window.gameInstance.gameOver();
            return true;
        }
        
        // Make player temporarily invulnerable
        this.invulnerable = true;
        this.invulnerabilityTime = 1.0; // 1 second
        
        window.gameInstance.audio.playSound('playerHurt');
        return false;
    }
    
    heal(amount) {
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        return this.health > oldHealth;
    }
    
    addArmor(amount) {
        const oldArmor = this.armor;
        this.armor = Math.min(this.maxArmor, this.armor + amount);
        return this.armor > oldArmor;
    }
    
    addScore(points) {
        this.score += points;
    }
    
    reset(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.health = this.maxHealth;
        this.armor = 0;
        this.isDead = false;
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.score = 0;
        
        // Reset input state
        this.keys = {};
        this.touchControls.moveJoystick.active = false;
        this.touchControls.lookJoystick.active = false;
        this.touchControls.moveJoystick.x = 0;
        this.touchControls.moveJoystick.y = 0;
        this.touchControls.lookJoystick.x = 0;
        this.touchControls.lookJoystick.y = 0;
    }
    
    getForwardVector() {
        return {
            x: Math.cos(this.angle),
            y: Math.sin(this.angle)
        };
    }
    
    getRightVector() {
        return {
            x: Math.cos(this.angle + Math.PI / 2),
            y: Math.sin(this.angle + Math.PI / 2)
        };
    }
    
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    // Check if player can see a point (for enemy AI)
    canSee(x, y) {
        return window.gameInstance.map.hasLineOfSight(this.x, this.y, x, y);
    }
}