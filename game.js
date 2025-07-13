// Main game engine for Pocket DOOM 2.0
class PocketDoomGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gameState = 'loading'; // loading, playing, paused, gameOver
        
        // Game systems
        this.map = null;
        this.player = null;
        this.enemies = [];
        this.enemyManager = null;
        this.weapon = null;
        this.audio = null;
        this.renderer = null;
        this.ui = null;
        
        // Game loop
        this.lastTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        this.fpsUpdateTime = 0;
        
        // Performance monitoring
        this.performanceStats = {
            frameTime: 0,
            renderTime: 0,
            updateTime: 0
        };
        
        // Debug mode
        this.debugMode = false;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Initialize UI first
            this.ui = new UISystem();
            this.ui.showLoadingScreen();
            
            // Simulate loading progress
            await this.loadGameSystems();
            
            // Initialize game systems
            this.initializeGameSystems();
            
            // Set up game loop
            this.setupGameLoop();
            
            // Complete loading
            this.ui.updateLoadingProgress(100);
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.ui.showMessage('Failed to load game. Please refresh the page.');
        }
    }
    
    async loadGameSystems() {
        const loadingSteps = [
            { name: 'Audio System', progress: 20 },
            { name: 'Map Data', progress: 40 },
            { name: 'Player Systems', progress: 60 },
            { name: 'Enemy AI', progress: 80 },
            { name: 'Renderer', progress: 100 }
        ];
        
        for (let step of loadingSteps) {
            await this.delay(300); // Simulate loading time
            this.ui.updateLoadingProgress(step.progress);
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    initializeGameSystems() {
        // Initialize audio system
        this.audio = new AudioSystem();
        
        // Initialize map
        this.map = new GameMap();
        
        // Initialize player
        this.player = new Player(10.5, 10.5, 0);
        
        // Initialize weapon system
        this.weapon = new WeaponSystem();
        
        // Initialize enemy manager
        this.enemyManager = new EnemyManager();
        this.enemies = this.enemyManager.enemies;
        
        // Initialize renderer
        this.renderer = new Renderer(this.canvas);
        
        // Make game instance globally available
        window.gameInstance = this;
        
        // Set up resize handler
        window.addEventListener('resize', () => this.handleResize());
        
        // Set up visibility change handler (for pause on tab switch)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameState === 'playing') {
                this.pause();
            }
        });
        
        console.log('Game systems initialized successfully');
    }
    
    setupGameLoop() {
        this.gameLoop = this.gameLoop.bind(this);
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);
    }
    
    gameLoop(currentTime) {
        // Calculate delta time
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 1/30); // Max 30 FPS minimum
        
        // Update FPS counter
        this.updateFPS();
        
        // Update game based on state
        if (this.gameState === 'playing') {
            const updateStart = performance.now();
            this.update();
            const updateEnd = performance.now();
            
            const renderStart = performance.now();
            this.render();
            const renderEnd = performance.now();
            
            // Performance tracking
            this.performanceStats.updateTime = updateEnd - updateStart;
            this.performanceStats.renderTime = renderEnd - renderStart;
            this.performanceStats.frameTime = renderEnd - updateStart;
            
            // Auto-adjust render quality based on performance
            this.renderer.adjustQualityForPerformance();
        } else if (this.gameState === 'loading') {
            // Still show a basic render during loading
            this.render();
        }
        
        // Continue game loop
        requestAnimationFrame(this.gameLoop);
    }
    
    update() {
        // Update map (doors, items)
        this.map.updateDoors(this.deltaTime);
        this.map.updateItems(this.deltaTime);
        
        // Update player
        this.player.update(this.deltaTime, this.map);
        
        // Update weapon system
        this.weapon.update(this.deltaTime);
        
        // Update enemies
        this.enemyManager.update(this.deltaTime);
        
        // Update UI
        this.ui.updateHUD(this.player, this.weapon, this.enemies);
        
        // Check win/lose conditions
        this.checkGameConditions();
        
        // Debug information
        if (this.debugMode) {
            this.updateDebugInfo();
        }
    }
    
    render() {
        if (this.renderer && this.gameState !== 'loading') {
            this.renderer.render(this.player, this.map, this.enemies, this.weapon);
        }
    }
    
    updateFPS() {
        this.frameCount++;
        this.fpsUpdateTime += this.deltaTime;
        
        if (this.fpsUpdateTime >= 1.0) {
            this.fps = this.frameCount / this.fpsUpdateTime;
            this.frameCount = 0;
            this.fpsUpdateTime = 0;
            
            if (this.debugMode) {
                this.ui.showFPS(this.fps);
            }
        }
    }
    
    updateDebugInfo() {
        const debugData = {
            'FPS': this.fps.toFixed(1),
            'Frame Time': this.performanceStats.frameTime.toFixed(2) + 'ms',
            'Update Time': this.performanceStats.updateTime.toFixed(2) + 'ms',
            'Render Time': this.performanceStats.renderTime.toFixed(2) + 'ms',
            'Player X': this.player.x.toFixed(2),
            'Player Y': this.player.y.toFixed(2),
            'Player Angle': (this.player.angle * 180 / Math.PI).toFixed(1) + '°',
            'Enemies': this.enemyManager.getAliveEnemies().length,
            'Projectiles': this.weapon.projectiles.length,
            'Wave': this.enemyManager.currentWave,
            'Score': this.player.score
        };
        
        this.ui.showDebugInfo(debugData);
    }
    
    checkGameConditions() {
        // Check if player is dead
        if (this.player.isDead && this.gameState === 'playing') {
            this.gameOver();
        }
        
        // Additional win conditions could be added here
        // For example: if all enemies defeated and no more spawns
    }
    
    start() {
        if (this.gameState === 'loading') {
            this.gameState = 'playing';
            this.ui.hideLoadingScreen();
            this.ui.showHUD();
            this.ui.hideGameStateIndicator();
            
            // Initialize enemies
            this.enemyManager.initialize();
            
            // Start background music
            this.audio.playBackgroundMusic();
            
            // Show initial messages
            this.ui.showMessage('WELCOME TO POCKET DOOM 2.0!');
            setTimeout(() => {
                this.ui.showMessage('SURVIVE THE WAVES!');
            }, 2000);
            
            console.log('Game started');
        }
    }
    
    pause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.ui.showPauseMenu();
            this.ui.showGameState('paused');
            console.log('Game paused');
        }
    }
    
    resume() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.ui.hidePauseMenu();
            this.ui.hideGameStateIndicator();
            console.log('Game resumed');
        }
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.pause();
        } else if (this.gameState === 'paused') {
            this.resume();
        }
    }
    
    gameOver() {
        if (this.gameState !== 'gameOver') {
            this.gameState = 'gameOver';
            this.ui.hideHUD();
            this.ui.showGameOver(this.player.score);
            this.ui.showGameState('gameOver');
            
            // Screen effects
            this.ui.screenFlash('rgba(255, 0, 0, 0.8)', 500);
            this.ui.screenShake(10, 1000);
            this.ui.vibrate([200, 100, 200]);
            
            console.log('Game over - Final score:', this.player.score);
        }
    }
    
    restart() {
        // Reset all game systems
        this.player.reset(10.5, 10.5, 0);
        this.weapon.reset();
        this.enemyManager.reset();
        this.enemies = this.enemyManager.enemies;
        
        // Reset map items
        this.map.initializeItems();
        
        // Reset UI
        this.ui.hideAllMenus();
        this.ui.hideGameStateIndicator();
        this.ui.showHUD();
        
        // Start game
        this.gameState = 'playing';
        this.enemyManager.initialize();
        
        this.ui.showMessage('GAME RESTARTED');
        
        console.log('Game restarted');
    }
    
    handleResize() {
        if (this.renderer) {
            this.renderer.resize();
        }
        if (this.ui) {
            this.ui.handleResize();
        }
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        
        if (this.debugMode) {
            this.ui.showMessage('DEBUG MODE ON');
            console.log('Debug mode enabled');
        } else {
            this.ui.hideFPS();
            this.ui.hideDebugInfo();
            this.ui.showMessage('DEBUG MODE OFF');
            console.log('Debug mode disabled');
        }
        
        return this.debugMode;
    }
    
    toggleAudio() {
        const enabled = this.audio.toggle();
        this.ui.showMessage(enabled ? 'AUDIO ON' : 'AUDIO OFF');
        return enabled;
    }
    
    // Cheat codes (for testing/debugging)
    addScore(points) {
        this.player.addScore(points);
        this.ui.showMessage(`+${points} SCORE`);
    }
    
    healPlayer(amount = 50) {
        if (this.player.heal(amount)) {
            this.ui.showMessage(`+${amount} HEALTH`);
        }
    }
    
    addAmmo(amount = 100) {
        this.weapon.addAmmo(amount, 'bullets');
        this.weapon.addAmmo(amount, 'shells');
        this.weapon.addAmmo(amount, 'rockets');
        this.ui.showMessage('AMMO REFILLED');
    }
    
    unlockAllWeapons() {
        this.weapon.unlockWeapon('shotgun');
        this.weapon.unlockWeapon('chaingun');
        this.weapon.unlockWeapon('rocket');
        this.ui.showMessage('ALL WEAPONS UNLOCKED');
    }
    
    killAllEnemies() {
        for (let enemy of this.enemies) {
            if (!enemy.isDead) {
                enemy.takeDamage(enemy.health);
            }
        }
        this.ui.showMessage('ALL ENEMIES ELIMINATED');
    }
    
    spawnEnemy(type = 'imp') {
        this.enemyManager.spawnEnemy();
        this.ui.showMessage('ENEMY SPAWNED');
    }
    
    nextWave() {
        this.enemyManager.nextWave();
    }
    
    // Performance monitoring
    getPerformanceStats() {
        return {
            fps: this.fps,
            frameTime: this.performanceStats.frameTime,
            updateTime: this.performanceStats.updateTime,
            renderTime: this.performanceStats.renderTime,
            renderQuality: this.renderer.renderQuality
        };
    }
    
    // Save/load game state (localStorage)
    saveGame() {
        const gameData = {
            player: {
                x: this.player.x,
                y: this.player.y,
                angle: this.player.angle,
                health: this.player.health,
                armor: this.player.armor,
                score: this.player.score
            },
            weapon: {
                currentWeapon: this.weapon.currentWeapon,
                unlockedWeapons: Array.from(this.weapon.unlockedWeapons),
                ammo: { ...this.weapon.ammo }
            },
            enemyManager: {
                currentWave: this.enemyManager.currentWave,
                totalEnemiesKilled: this.enemyManager.totalEnemiesKilled
            }
        };
        
        localStorage.setItem('pocketDoomSave', JSON.stringify(gameData));
        this.ui.showMessage('GAME SAVED');
        console.log('Game saved');
    }
    
    loadGame() {
        const saveData = localStorage.getItem('pocketDoomSave');
        if (!saveData) {
            this.ui.showMessage('NO SAVE DATA FOUND');
            return false;
        }
        
        try {
            const gameData = JSON.parse(saveData);
            
            // Restore player state
            this.player.x = gameData.player.x;
            this.player.y = gameData.player.y;
            this.player.angle = gameData.player.angle;
            this.player.health = gameData.player.health;
            this.player.armor = gameData.player.armor;
            this.player.score = gameData.player.score;
            
            // Restore weapon state
            this.weapon.currentWeapon = gameData.weapon.currentWeapon;
            this.weapon.unlockedWeapons = new Set(gameData.weapon.unlockedWeapons);
            this.weapon.ammo = { ...gameData.weapon.ammo };
            
            // Restore enemy manager state
            this.enemyManager.currentWave = gameData.enemyManager.currentWave;
            this.enemyManager.totalEnemiesKilled = gameData.enemyManager.totalEnemiesKilled;
            
            this.ui.showMessage('GAME LOADED');
            console.log('Game loaded');
            return true;
        } catch (error) {
            console.error('Failed to load game:', error);
            this.ui.showMessage('FAILED TO LOAD GAME');
            return false;
        }
    }
    
    // Cleanup
    destroy() {
        // Stop game loop
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
        
        // Clean up event listeners
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('visibilitychange', this.pause);
        
        // Clean up audio
        if (this.audio && this.audio.audioContext) {
            this.audio.audioContext.close();
        }
        
        console.log('Game destroyed');
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Pocket DOOM 2.0...');
    
    // Check for WebGL support (optional enhancement)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        console.warn('WebGL not supported, using 2D canvas rendering');
    }
    
    // Check for Web Audio API support
    if (!window.AudioContext && !window.webkitAudioContext) {
        console.warn('Web Audio API not supported, audio will be limited');
    }
    
    // Initialize the game
    window.pocketDoom = new PocketDoomGame();
    
    // Expose cheat functions to console for debugging
    if (typeof window !== 'undefined') {
        window.cheat = {
            debug: () => window.pocketDoom.toggleDebugMode(),
            audio: () => window.pocketDoom.toggleAudio(),
            heal: (amount) => window.pocketDoom.healPlayer(amount),
            ammo: (amount) => window.pocketDoom.addAmmo(amount),
            score: (points) => window.pocketDoom.addScore(points),
            weapons: () => window.pocketDoom.unlockAllWeapons(),
            kill: () => window.pocketDoom.killAllEnemies(),
            spawn: (type) => window.pocketDoom.spawnEnemy(type),
            wave: () => window.pocketDoom.nextWave(),
            save: () => window.pocketDoom.saveGame(),
            load: () => window.pocketDoom.loadGame(),
            stats: () => window.pocketDoom.getPerformanceStats()
        };
        
        console.log('Cheat codes available via window.cheat object');
        console.log('Example: cheat.debug() to toggle debug mode');
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.pocketDoom) {
        window.pocketDoom.destroy();
    }
});