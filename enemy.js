// Enemy system for Pocket DOOM 2.0
class Enemy {
    constructor(x, y, type = 'imp') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        // Initialize based on type
        this.initializeType();
        
        // Movement
        this.angle = Math.random() * Math.PI * 2;
        this.speed = this.baseSpeed;
        this.radius = 0.3;
        
        // AI state
        this.state = 'patrol'; // patrol, chase, attack, dead
        this.target = null;
        this.lastSeen = null;
        this.alertness = 0;
        this.sightRange = 8.0;
        this.attackRange = 1.5;
        this.shootRange = 6.0;
        
        // Pathfinding
        this.path = [];
        this.pathIndex = 0;
        this.pathUpdateTime = 0;
        this.pathUpdateInterval = 1.0; // Update path every second
        
        // Patrol behavior
        this.patrolPoints = [];
        this.currentPatrolTarget = 0;
        this.patrolWaitTime = 0;
        this.maxPatrolWait = 3.0;
        
        // Combat
        this.lastAttackTime = 0;
        this.canShoot = this.type !== 'demon'; // Demons are melee only
        
        // Animation
        this.animationTime = 0;
        this.facingAngle = this.angle;
        
        // Generate random patrol points
        this.generatePatrolPoints();
        
        // Death
        this.deathTime = 0;
        this.removeAfterDeath = 5.0; // Remove corpse after 5 seconds
    }
    
    initializeType() {
        const types = {
            imp: {
                health: 60,
                damage: 15,
                baseSpeed: 2.0,
                attackRate: 2.0,
                scoreValue: 50,
                color: '#8B4513' // Brown
            },
            demon: {
                health: 150,
                damage: 25,
                baseSpeed: 3.5,
                attackRate: 1.5,
                scoreValue: 100,
                color: '#FF69B4' // Pink (classic DOOM demon)
            },
            soldier: {
                health: 40,
                damage: 10,
                baseSpeed: 1.5,
                attackRate: 1.0,
                scoreValue: 30,
                color: '#228B22' // Forest Green
            },
            baron: {
                health: 1000,
                damage: 40,
                baseSpeed: 1.8,
                attackRate: 3.0,
                scoreValue: 500,
                color: '#FF0000' // Red
            }
        };
        
        const typeData = types[this.type] || types.imp;
        this.maxHealth = typeData.health;
        this.health = this.maxHealth;
        this.damage = typeData.damage;
        this.baseSpeed = typeData.baseSpeed;
        this.attackRate = typeData.attackRate;
        this.scoreValue = typeData.scoreValue;
        this.color = typeData.color;
        this.isDead = false;
    }
    
    generatePatrolPoints() {
        const gameMap = window.gameInstance.map;
        const numPoints = 3 + Math.floor(Math.random() * 3); // 3-5 patrol points
        
        for (let i = 0; i < numPoints; i++) {
            let attempts = 0;
            let point;
            
            do {
                point = {
                    x: 2 + Math.random() * (gameMap.width - 4),
                    y: 2 + Math.random() * (gameMap.height - 4)
                };
                attempts++;
            } while (gameMap.isWall(point.x, point.y) && attempts < 50);
            
            if (attempts < 50) {
                this.patrolPoints.push(point);
            }
        }
        
        if (this.patrolPoints.length === 0) {
            // Fallback: use current position
            this.patrolPoints.push({x: this.x, y: this.y});
        }
    }
    
    update(deltaTime) {
        if (this.isDead) {
            this.deathTime += deltaTime;
            return this.deathTime < this.removeAfterDeath;
        }
        
        this.animationTime += deltaTime;
        this.pathUpdateTime += deltaTime;
        
        // Update AI state
        this.updateAI(deltaTime);
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update facing direction towards movement or target
        this.updateFacing(deltaTime);
        
        return true;
    }
    
    updateAI(deltaTime) {
        const player = window.gameInstance.player;
        const playerDistance = this.getDistanceToPlayer();
        const canSeePlayer = this.canSeePlayer();
        
        // Decrease alertness over time
        this.alertness = Math.max(0, this.alertness - deltaTime * 0.5);
        
        switch (this.state) {
            case 'patrol':
                if (canSeePlayer && playerDistance < this.sightRange) {
                    this.state = 'chase';
                    this.target = {x: player.x, y: player.y};
                    this.lastSeen = {x: player.x, y: player.y};
                    this.alertness = 1.0;
                } else {
                    this.updatePatrol(deltaTime);
                }
                break;
                
            case 'chase':
                if (canSeePlayer) {
                    this.target = {x: player.x, y: player.y};
                    this.lastSeen = {x: player.x, y: player.y};
                    this.alertness = 1.0;
                    
                    if (playerDistance < this.attackRange) {
                        this.state = 'attack';
                    } else if (this.canShoot && playerDistance < this.shootRange && Math.random() < 0.1) {
                        this.state = 'attack';
                    }
                } else if (this.lastSeen) {
                    this.target = this.lastSeen;
                    if (this.getDistanceTo(this.lastSeen.x, this.lastSeen.y) < 1.0) {
                        this.lastSeen = null;
                        this.state = 'patrol';
                    }
                } else {
                    this.state = 'patrol';
                }
                break;
                
            case 'attack':
                if (canSeePlayer) {
                    this.target = {x: player.x, y: player.y};
                    this.attack(deltaTime);
                    
                    if (playerDistance > this.attackRange * 1.5) {
                        this.state = 'chase';
                    }
                } else {
                    this.state = 'chase';
                }
                break;
        }
    }
    
    updatePatrol(deltaTime) {
        if (this.patrolPoints.length === 0) return;
        
        const currentTarget = this.patrolPoints[this.currentPatrolTarget];
        const distance = this.getDistanceTo(currentTarget.x, currentTarget.y);
        
        if (distance < 0.5) {
            this.patrolWaitTime += deltaTime;
            if (this.patrolWaitTime >= this.maxPatrolWait) {
                this.currentPatrolTarget = (this.currentPatrolTarget + 1) % this.patrolPoints.length;
                this.patrolWaitTime = 0;
                this.target = this.patrolPoints[this.currentPatrolTarget];
            }
        } else {
            this.target = currentTarget;
            this.patrolWaitTime = 0;
        }
    }
    
    updateMovement(deltaTime) {
        if (!this.target) return;
        
        const gameMap = window.gameInstance.map;
        
        // Update pathfinding periodically
        if (this.pathUpdateTime >= this.pathUpdateInterval) {
            this.path = gameMap.findPath(this.x, this.y, this.target.x, this.target.y);
            this.pathIndex = 0;
            this.pathUpdateTime = 0;
        }
        
        let moveTarget = this.target;
        
        // Use pathfinding if available
        if (this.path.length > 0 && this.pathIndex < this.path.length) {
            moveTarget = this.path[this.pathIndex];
            
            // Check if reached current path point
            if (this.getDistanceTo(moveTarget.x, moveTarget.y) < 0.5) {
                this.pathIndex++;
            }
        }
        
        // Calculate movement direction
        const dx = moveTarget.x - this.x;
        const dy = moveTarget.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.1) {
            // Normalize and apply speed
            const moveX = (dx / distance) * this.speed * deltaTime;
            const moveY = (dy / distance) * this.speed * deltaTime;
            
            // Check collision and get valid position
            const newPos = gameMap.getValidPosition(this.x, this.y, this.x + moveX, this.y + moveY, this.radius);
            this.x = newPos.x;
            this.y = newPos.y;
            
            // Update angle based on movement
            this.angle = Math.atan2(dy, dx);
        }
    }
    
    updateFacing(deltaTime) {
        let targetAngle = this.angle;
        
        if (this.state === 'attack' && this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            targetAngle = Math.atan2(dy, dx);
        }
        
        // Smooth angle interpolation
        const angleDiff = targetAngle - this.facingAngle;
        let normalizedDiff = angleDiff;
        
        // Normalize angle difference to [-π, π]
        while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
        while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
        
        this.facingAngle += normalizedDiff * deltaTime * 5.0; // Smooth turning
        
        // Normalize facing angle
        while (this.facingAngle < 0) this.facingAngle += Math.PI * 2;
        while (this.facingAngle >= Math.PI * 2) this.facingAngle -= Math.PI * 2;
    }
    
    attack(deltaTime) {
        const currentTime = Date.now() / 1000;
        
        if (currentTime - this.lastAttackTime < this.attackRate) {
            return;
        }
        
        this.lastAttackTime = currentTime;
        
        const player = window.gameInstance.player;
        const distance = this.getDistanceToPlayer();
        
        if (this.canShoot && distance > this.attackRange) {
            // Ranged attack
            window.gameInstance.weapon.createEnemyProjectile(
                this.x, this.y, player.x, player.y, this.damage
            );
            window.gameInstance.audio.playSound('enemyShoot');
        } else if (distance < this.attackRange) {
            // Melee attack
            player.takeDamage(this.damage);
            window.gameInstance.audio.playSound('enemyAttack');
        }
    }
    
    takeDamage(amount) {
        if (this.isDead) return false;
        
        this.health -= amount;
        this.alertness = 1.0;
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            this.deathTime = 0;
            
            // Add score
            window.gameInstance.player.addScore(this.scoreValue);
            
            // Play death sound
            window.gameInstance.audio.playSound('enemyDeath');
            
            // Chance to drop items
            if (Math.random() < 0.3) {
                this.dropItem();
            }
            
            return true;
        }
        
        // Enter chase state when damaged
        if (this.state === 'patrol') {
            this.state = 'chase';
            const player = window.gameInstance.player;
            this.target = {x: player.x, y: player.y};
            this.lastSeen = {x: player.x, y: player.y};
        }
        
        return false;
    }
    
    dropItem() {
        const gameMap = window.gameInstance.map;
        const itemType = Math.random() < 0.6 ? 'ammo' : 'health';
        
        // Add item to map
        const key = `drop_${Date.now()}_${Math.random()}`;
        gameMap.items.set(key, {
            x: this.x,
            y: this.y,
            type: itemType,
            collected: false,
            bobOffset: Math.random() * Math.PI * 2
        });
    }
    
    canSeePlayer() {
        const player = window.gameInstance.player;
        const gameMap = window.gameInstance.map;
        
        // Check distance first
        if (this.getDistanceToPlayer() > this.sightRange) {
            return false;
        }
        
        // Check line of sight
        return gameMap.hasLineOfSight(this.x, this.y, player.x, player.y);
    }
    
    getDistanceToPlayer() {
        const player = window.gameInstance.player;
        return this.getDistanceTo(player.x, player.y);
    }
    
    getDistanceTo(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getPosition() {
        return {x: this.x, y: this.y};
    }
    
    getFacingAngle() {
        return this.facingAngle;
    }
    
    getHealthPercentage() {
        return this.health / this.maxHealth;
    }
}

// Enemy manager class
class EnemyManager {
    constructor() {
        this.enemies = [];
        this.maxEnemies = 8;
        this.spawnTimer = 0;
        this.spawnInterval = 10.0; // Spawn enemy every 10 seconds
        this.waveSize = 3;
        this.currentWave = 1;
        this.enemiesKilledThisWave = 0;
        this.totalEnemiesKilled = 0;
    }
    
    initialize() {
        this.spawnInitialEnemies();
    }
    
    spawnInitialEnemies() {
        const gameMap = window.gameInstance.map;
        const player = window.gameInstance.player;
        
        // Spawn 3-4 initial enemies
        for (let i = 0; i < Math.min(4, this.maxEnemies); i++) {
            const spawn = gameMap.getRandomSpawn(player.x, player.y, 5.0);
            if (spawn) {
                const enemyType = this.getRandomEnemyType();
                const enemy = new Enemy(spawn.x, spawn.y, enemyType);
                this.enemies.push(enemy);
            }
        }
    }
    
    update(deltaTime) {
        // Update existing enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const shouldKeep = enemy.update(deltaTime);
            
            if (!shouldKeep || (enemy.isDead && enemy.deathTime >= enemy.removeAfterDeath)) {
                if (enemy.isDead && enemy.deathTime >= enemy.removeAfterDeath) {
                    this.enemiesKilledThisWave++;
                    this.totalEnemiesKilled++;
                }
                this.enemies.splice(i, 1);
            }
        }
        
        // Spawn new enemies
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && this.enemies.length < this.maxEnemies) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }
        
        // Check for wave completion
        if (this.enemiesKilledThisWave >= this.waveSize) {
            this.nextWave();
        }
    }
    
    spawnEnemy() {
        const gameMap = window.gameInstance.map;
        const player = window.gameInstance.player;
        
        const spawn = gameMap.getRandomSpawn(player.x, player.y, 4.0);
        if (spawn) {
            const enemyType = this.getRandomEnemyType();
            const enemy = new Enemy(spawn.x, spawn.y, enemyType);
            this.enemies.push(enemy);
        }
    }
    
    getRandomEnemyType() {
        const types = ['imp', 'soldier', 'demon'];
        
        // Add stronger enemies in later waves
        if (this.currentWave >= 3) {
            types.push('baron');
        }
        
        // Weight distribution
        const weights = {
            imp: 0.4,
            soldier: 0.3,
            demon: 0.2,
            baron: 0.1
        };
        
        const random = Math.random();
        let sum = 0;
        
        for (let type of types) {
            sum += weights[type];
            if (random <= sum) {
                return type;
            }
        }
        
        return 'imp'; // Fallback
    }
    
    nextWave() {
        this.currentWave++;
        this.enemiesKilledThisWave = 0;
        this.waveSize += 2; // Increase wave size
        this.maxEnemies = Math.min(12, this.maxEnemies + 1); // Increase max enemies
        this.spawnInterval = Math.max(5.0, this.spawnInterval - 0.5); // Faster spawning
        
        window.gameInstance.ui.showMessage(`WAVE ${this.currentWave}`);
        
        // Spawn some enemies immediately
        for (let i = 0; i < 2; i++) {
            this.spawnEnemy();
        }
    }
    
    getAliveEnemies() {
        return this.enemies.filter(enemy => !enemy.isDead);
    }
    
    getEnemiesInRange(x, y, range) {
        return this.enemies.filter(enemy => {
            if (enemy.isDead) return false;
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= range;
        });
    }
    
    reset() {
        this.enemies = [];
        this.currentWave = 1;
        this.enemiesKilledThisWave = 0;
        this.totalEnemiesKilled = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 10.0;
        this.waveSize = 3;
        this.maxEnemies = 8;
    }
}