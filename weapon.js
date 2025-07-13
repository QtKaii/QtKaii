// Weapon system for Pocket DOOM 2.0
class WeaponSystem {
    constructor() {
        this.weapons = {
            pistol: {
                name: 'PISTOL',
                damage: 15,
                fireRate: 0.5, // seconds between shots
                ammoType: 'bullets',
                ammoPerShot: 1,
                spread: 0.02,
                range: 20,
                projectileSpeed: 30,
                automatic: false,
                sound: 'pistol'
            },
            shotgun: {
                name: 'SHOTGUN',
                damage: 8,
                fireRate: 1.0,
                ammoType: 'shells',
                ammoPerShot: 1,
                spread: 0.15,
                range: 8,
                projectileSpeed: 25,
                automatic: false,
                pellets: 7, // Multiple projectiles per shot
                sound: 'shotgun'
            },
            chaingun: {
                name: 'CHAINGUN',
                damage: 12,
                fireRate: 0.1,
                ammoType: 'bullets',
                ammoPerShot: 1,
                spread: 0.05,
                range: 15,
                projectileSpeed: 35,
                automatic: true,
                sound: 'chaingun'
            },
            rocket: {
                name: 'ROCKET',
                damage: 80,
                fireRate: 1.5,
                ammoType: 'rockets',
                ammoPerShot: 1,
                spread: 0,
                range: 25,
                projectileSpeed: 15,
                automatic: false,
                explosive: true,
                explosionRadius: 3.0,
                sound: 'rocket'
            }
        };
        
        this.currentWeapon = 'pistol';
        this.weaponOrder = ['pistol', 'shotgun', 'chaingun', 'rocket'];
        this.unlockedWeapons = new Set(['pistol']);
        
        this.ammo = {
            bullets: 50,
            shells: 8,
            rockets: 0
        };
        
        this.lastShotTime = 0;
        this.isShooting = false;
        this.projectiles = [];
        
        // Visual effects
        this.muzzleFlash = {
            active: false,
            duration: 0.1,
            timeLeft: 0
        };
        
        this.initializeTouchControls();
    }
    
    initializeTouchControls() {
        const shootButton = document.getElementById('shootButton');
        const weaponButton = document.getElementById('weaponButton');
        
        shootButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startShooting();
        });
        
        shootButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopShooting();
        });
        
        weaponButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.switchWeapon(1);
        });
        
        // Also handle mouse events for desktop
        shootButton.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startShooting();
        });
        
        shootButton.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.stopShooting();
        });
        
        weaponButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchWeapon(1);
        });
    }
    
    startShooting() {
        this.isShooting = true;
        this.shoot();
    }
    
    stopShooting() {
        this.isShooting = false;
    }
    
    shoot() {
        if (!this.canShoot()) return false;
        
        const weapon = this.weapons[this.currentWeapon];
        const currentTime = Date.now() / 1000;
        
        // Check ammo
        if (this.currentWeapon !== 'pistol' && this.ammo[weapon.ammoType] < weapon.ammoPerShot) {
            return false;
        }
        
        // Consume ammo
        if (this.currentWeapon !== 'pistol') {
            this.ammo[weapon.ammoType] -= weapon.ammoPerShot;
        }
        
        this.lastShotTime = currentTime;
        
        // Create projectiles
        const player = window.gameInstance.player;
        const pellets = weapon.pellets || 1;
        
        for (let i = 0; i < pellets; i++) {
            const spread = weapon.spread * (Math.random() - 0.5);
            const angle = player.angle + spread;
            
            const projectile = {
                x: player.x,
                y: player.y,
                angle: angle,
                speed: weapon.projectileSpeed,
                damage: weapon.damage,
                range: weapon.range,
                distanceTraveled: 0,
                explosive: weapon.explosive || false,
                explosionRadius: weapon.explosionRadius || 0,
                owner: 'player'
            };
            
            this.projectiles.push(projectile);
        }
        
        // Visual effects
        this.muzzleFlash.active = true;
        this.muzzleFlash.timeLeft = this.muzzleFlash.duration;
        
        // Play sound
        window.gameInstance.audio.playSound(weapon.sound);
        
        return true;
    }
    
    canShoot() {
        const weapon = this.weapons[this.currentWeapon];
        const currentTime = Date.now() / 1000;
        
        return currentTime - this.lastShotTime >= weapon.fireRate;
    }
    
    switchWeapon(direction) {
        const currentIndex = this.weaponOrder.indexOf(this.currentWeapon);
        let newIndex = currentIndex + direction;
        
        // Find next unlocked weapon
        let attempts = 0;
        while (attempts < this.weaponOrder.length) {
            if (newIndex >= this.weaponOrder.length) {
                newIndex = 0;
            } else if (newIndex < 0) {
                newIndex = this.weaponOrder.length - 1;
            }
            
            const weaponKey = this.weaponOrder[newIndex];
            if (this.unlockedWeapons.has(weaponKey)) {
                if (weaponKey !== this.currentWeapon) {
                    this.currentWeapon = weaponKey;
                    window.gameInstance.audio.playSound('weaponSwitch');
                }
                break;
            }
            
            newIndex += direction;
            attempts++;
        }
    }
    
    unlockWeapon(weaponKey) {
        if (this.weapons[weaponKey] && !this.unlockedWeapons.has(weaponKey)) {
            this.unlockedWeapons.add(weaponKey);
            window.gameInstance.ui.showMessage(`${this.weapons[weaponKey].name} ACQUIRED!`);
            return true;
        }
        return false;
    }
    
    addAmmo(amount, type = 'bullets') {
        if (this.ammo.hasOwnProperty(type)) {
            this.ammo[type] += amount;
            return true;
        }
        return false;
    }
    
    update(deltaTime) {
        // Update muzzle flash
        if (this.muzzleFlash.active) {
            this.muzzleFlash.timeLeft -= deltaTime;
            if (this.muzzleFlash.timeLeft <= 0) {
                this.muzzleFlash.active = false;
            }
        }
        
        // Handle automatic weapons
        if (this.isShooting && this.weapons[this.currentWeapon].automatic) {
            this.shoot();
        }
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            // Move projectile
            const oldX = projectile.x;
            const oldY = projectile.y;
            projectile.x += Math.cos(projectile.angle) * projectile.speed * deltaTime;
            projectile.y += Math.sin(projectile.angle) * projectile.speed * deltaTime;
            
            // Calculate distance traveled
            const dx = projectile.x - oldX;
            const dy = projectile.y - oldY;
            projectile.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
            
            // Check for wall collision
            if (window.gameInstance.map.isWall(projectile.x, projectile.y)) {
                if (projectile.explosive) {
                    this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage);
                }
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check range
            if (projectile.distanceTraveled >= projectile.range) {
                if (projectile.explosive) {
                    this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage);
                }
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check enemy collisions
            if (projectile.owner === 'player') {
                const hitEnemy = this.checkEnemyCollision(projectile);
                if (hitEnemy) {
                    if (projectile.explosive) {
                        this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage);
                    } else {
                        hitEnemy.takeDamage(projectile.damage);
                    }
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }
            
            // Check player collision (for enemy projectiles)
            if (projectile.owner === 'enemy') {
                const player = window.gameInstance.player;
                const dx = player.x - projectile.x;
                const dy = player.y - projectile.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 0.3) {
                    if (projectile.explosive) {
                        this.createExplosion(projectile.x, projectile.y, projectile.explosionRadius, projectile.damage);
                    } else {
                        player.takeDamage(projectile.damage);
                    }
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }
        }
    }
    
    checkEnemyCollision(projectile) {
        const enemies = window.gameInstance.enemies;
        const hitRadius = 0.3;
        
        for (let enemy of enemies) {
            if (enemy.isDead) continue;
            
            const dx = enemy.x - projectile.x;
            const dy = enemy.y - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < hitRadius) {
                return enemy;
            }
        }
        return null;
    }
    
    createExplosion(x, y, radius, damage) {
        // Create visual explosion effect
        window.gameInstance.renderer.addExplosion(x, y, radius);
        
        // Damage entities in radius
        const player = window.gameInstance.player;
        const enemies = window.gameInstance.enemies;
        
        // Check player damage
        const playerDx = player.x - x;
        const playerDy = player.y - y;
        const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
        
        if (playerDistance < radius) {
            const damageMultiplier = 1 - (playerDistance / radius);
            const actualDamage = Math.floor(damage * damageMultiplier);
            if (actualDamage > 0) {
                player.takeDamage(actualDamage);
            }
        }
        
        // Check enemy damage
        for (let enemy of enemies) {
            if (enemy.isDead) continue;
            
            const enemyDx = enemy.x - x;
            const enemyDy = enemy.y - y;
            const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);
            
            if (enemyDistance < radius) {
                const damageMultiplier = 1 - (enemyDistance / radius);
                const actualDamage = Math.floor(damage * damageMultiplier);
                if (actualDamage > 0) {
                    enemy.takeDamage(actualDamage);
                }
            }
        }
        
        // Play explosion sound
        window.gameInstance.audio.playSound('explosion');
    }
    
    // Enemy projectile creation
    createEnemyProjectile(x, y, targetX, targetY, damage = 10) {
        const dx = targetX - x;
        const dy = targetY - y;
        const angle = Math.atan2(dy, dx);
        
        const projectile = {
            x: x,
            y: y,
            angle: angle,
            speed: 10,
            damage: damage,
            range: 15,
            distanceTraveled: 0,
            explosive: false,
            owner: 'enemy'
        };
        
        this.projectiles.push(projectile);
    }
    
    getCurrentWeapon() {
        return this.weapons[this.currentWeapon];
    }
    
    getCurrentAmmo() {
        const weapon = this.weapons[this.currentWeapon];
        if (this.currentWeapon === 'pistol') {
            return '∞';
        }
        return this.ammo[weapon.ammoType];
    }
    
    reset() {
        this.currentWeapon = 'pistol';
        this.unlockedWeapons = new Set(['pistol']);
        this.ammo = {
            bullets: 50,
            shells: 8,
            rockets: 0
        };
        this.projectiles = [];
        this.lastShotTime = 0;
        this.isShooting = false;
        this.muzzleFlash.active = false;
    }
}