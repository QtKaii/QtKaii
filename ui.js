// UI system for Pocket DOOM 2.0
class UISystem {
    constructor() {
        this.elements = {
            hud: document.getElementById('hud'),
            healthBar: document.getElementById('healthFill'),
            healthValue: document.getElementById('healthValue'),
            armorBar: document.getElementById('armorFill'),
            armorValue: document.getElementById('armorValue'),
            currentWeapon: document.getElementById('currentWeapon'),
            ammoCount: document.getElementById('ammoCount'),
            score: document.getElementById('scoreValue'),
            
            touchControls: document.getElementById('touchControls'),
            
            pauseMenu: document.getElementById('pauseMenu'),
            gameOverMenu: document.getElementById('gameOverMenu'),
            helpMenu: document.getElementById('helpMenu'),
            loadingScreen: document.getElementById('loadingScreen'),
            
            finalScore: document.getElementById('finalScore'),
            loadingFill: document.getElementById('loadingFill'),
            startBtn: document.getElementById('startBtn')
        };
        
        this.messages = [];
        this.messageTimeout = 3000; // 3 seconds
        
        this.initializeEventListeners();
        this.createMessageContainer();
        this.detectMobile();
    }
    
    initializeEventListeners() {
        // Menu buttons
        document.getElementById('resumeBtn').addEventListener('click', () => {
            window.gameInstance.togglePause();
        });
        
        document.getElementById('restartBtn').addEventListener('click', () => {
            window.gameInstance.restart();
        });
        
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showHelp();
        });
        
        document.getElementById('helpBtn2').addEventListener('click', () => {
            this.showHelp();
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            window.gameInstance.restart();
        });
        
        document.getElementById('backBtn').addEventListener('click', () => {
            this.hideHelp();
        });
        
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.elements.helpMenu.classList.contains('hidden')) {
                    window.gameInstance.togglePause();
                } else {
                    this.hideHelp();
                }
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Prevent context menu on mobile
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#touchControls')) {
                e.preventDefault();
            }
        });
    }
    
    createMessageContainer() {
        this.messageContainer = document.createElement('div');
        this.messageContainer.id = 'messageContainer';
        this.messageContainer.style.cssText = `
            position: absolute;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 15;
            pointer-events: none;
            text-align: center;
        `;
        document.getElementById('gameContainer').appendChild(this.messageContainer);
    }
    
    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                       || window.innerWidth <= 768;
        
        if (isMobile) {
            this.elements.touchControls.style.display = 'block';
            document.body.classList.add('mobile');
        } else {
            this.elements.touchControls.style.display = 'none';
            document.body.classList.add('desktop');
        }
    }
    
    updateHUD(player, weapon, enemies) {
        // Health bar
        const healthPercent = (player.health / player.maxHealth) * 100;
        this.elements.healthBar.style.width = `${healthPercent}%`;
        this.elements.healthValue.textContent = Math.ceil(player.health);
        
        // Armor bar
        const armorPercent = (player.armor / player.maxArmor) * 100;
        this.elements.armorBar.style.width = `${armorPercent}%`;
        this.elements.armorValue.textContent = Math.ceil(player.armor);
        
        // Weapon info
        const currentWeapon = weapon.getCurrentWeapon();
        this.elements.currentWeapon.textContent = currentWeapon.name;
        this.elements.ammoCount.textContent = weapon.getCurrentAmmo();
        
        // Score
        this.elements.score.textContent = player.score;
        
        // Update health bar color based on health
        if (player.health < 25) {
            this.elements.healthBar.style.background = '#ff0000';
        } else if (player.health < 50) {
            this.elements.healthBar.style.background = '#ff8800';
        } else {
            this.elements.healthBar.style.background = '#00ff00';
        }
        
        // Flash HUD when player is hurt
        if (player.invulnerable && player.invulnerabilityTime > 0.5) {
            const flashIntensity = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
            this.elements.hud.style.filter = `brightness(${1 + flashIntensity * 0.5}) saturate(${1 + flashIntensity})`;
        } else {
            this.elements.hud.style.filter = '';
        }
    }
    
    showMessage(text, duration = this.messageTimeout) {
        const messageElement = document.createElement('div');
        messageElement.textContent = text;
        messageElement.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            color: #ffff00;
            padding: 10px 20px;
            margin: 5px 0;
            border: 2px solid #fff;
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            text-shadow: 2px 2px 4px #000;
            animation: messageSlideIn 0.3s ease-out;
        `;
        
        this.messageContainer.appendChild(messageElement);
        
        // Add CSS animation
        if (!document.getElementById('messageAnimations')) {
            const style = document.createElement('style');
            style.id = 'messageAnimations';
            style.textContent = `
                @keyframes messageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes messageSlideOut {
                    from {
                        opacity: 1;
                        transform: translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Remove message after duration
        setTimeout(() => {
            messageElement.style.animation = 'messageSlideOut 0.3s ease-in';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 300);
        }, duration);
    }
    
    showPauseMenu() {
        this.elements.pauseMenu.classList.remove('hidden');
        this.hideHelpMenu();
        this.hideGameOverMenu();
    }
    
    hidePauseMenu() {
        this.elements.pauseMenu.classList.add('hidden');
    }
    
    showGameOver(finalScore) {
        this.elements.finalScore.textContent = finalScore;
        this.elements.gameOverMenu.classList.remove('hidden');
        this.hidePauseMenu();
        this.hideHelpMenu();
    }
    
    hideGameOverMenu() {
        this.elements.gameOverMenu.classList.add('hidden');
    }
    
    showHelp() {
        this.elements.helpMenu.classList.remove('hidden');
        this.hidePauseMenu();
        this.hideGameOverMenu();
    }
    
    hideHelp() {
        this.elements.helpMenu.classList.add('hidden');
        
        // Return to appropriate menu
        if (window.gameInstance && window.gameInstance.gameState === 'paused') {
            this.showPauseMenu();
        } else if (window.gameInstance && window.gameInstance.gameState === 'gameOver') {
            this.showGameOver(window.gameInstance.player.score);
        }
    }
    
    hideHelpMenu() {
        this.elements.helpMenu.classList.add('hidden');
    }
    
    showLoadingScreen() {
        this.elements.loadingScreen.classList.remove('hidden');
        this.hideAllMenus();
    }
    
    hideLoadingScreen() {
        this.elements.loadingScreen.classList.add('hidden');
    }
    
    updateLoadingProgress(progress) {
        this.elements.loadingFill.style.width = `${progress}%`;
        
        if (progress >= 100) {
            setTimeout(() => {
                this.elements.startBtn.classList.remove('hidden');
            }, 500);
        }
    }
    
    startGame() {
        this.hideLoadingScreen();
        if (window.gameInstance) {
            window.gameInstance.start();
        }
    }
    
    hideAllMenus() {
        this.elements.pauseMenu.classList.add('hidden');
        this.elements.gameOverMenu.classList.add('hidden');
        this.elements.helpMenu.classList.add('hidden');
    }
    
    showHUD() {
        this.elements.hud.style.display = 'block';
    }
    
    hideHUD() {
        this.elements.hud.style.display = 'none';
    }
    
    handleResize() {
        this.detectMobile();
        
        // Adjust touch controls for different screen sizes
        if (window.innerWidth < 480) {
            // Very small screens - make touch controls smaller
            const joysticks = document.querySelectorAll('.joystick');
            joysticks.forEach(joystick => {
                joystick.style.width = '80px';
                joystick.style.height = '80px';
            });
            
            const buttons = document.querySelectorAll('.touch-button');
            buttons.forEach(button => {
                button.style.padding = '12px 16px';
                button.style.fontSize = '12px';
            });
        } else {
            // Reset to normal size
            const joysticks = document.querySelectorAll('.joystick');
            joysticks.forEach(joystick => {
                joystick.style.width = '100px';
                joystick.style.height = '100px';
            });
            
            const buttons = document.querySelectorAll('.touch-button');
            buttons.forEach(button => {
                button.style.padding = '15px 20px';
                button.style.fontSize = '14px';
            });
        }
    }
    
    // Visual effects
    screenFlash(color = 'rgba(255, 0, 0, 0.5)', duration = 200) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${color};
            z-index: 25;
            pointer-events: none;
            animation: flashFade ${duration}ms ease-out;
        `;
        
        // Add flash animation if not exists
        if (!document.getElementById('flashAnimations')) {
            const style = document.createElement('style');
            style.id = 'flashAnimations';
            style.textContent = `
                @keyframes flashFade {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.getElementById('gameContainer').appendChild(flash);
        
        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, duration);
    }
    
    screenShake(intensity = 5, duration = 300) {
        const gameContainer = document.getElementById('gameContainer');
        const originalTransform = gameContainer.style.transform;
        
        let shakeTime = 0;
        const shakeInterval = setInterval(() => {
            shakeTime += 16; // ~60fps
            
            if (shakeTime >= duration) {
                clearInterval(shakeInterval);
                gameContainer.style.transform = originalTransform;
                return;
            }
            
            const progress = shakeTime / duration;
            const currentIntensity = intensity * (1 - progress);
            
            const x = (Math.random() - 0.5) * currentIntensity;
            const y = (Math.random() - 0.5) * currentIntensity;
            
            gameContainer.style.transform = `translate(${x}px, ${y}px)`;
        }, 16);
    }
    
    updateWaveDisplay(wave, enemiesKilled, totalEnemies) {
        // Could add a wave counter to the HUD if needed
        const waveInfo = document.getElementById('waveInfo');
        if (waveInfo) {
            waveInfo.textContent = `WAVE ${wave}`;
        }
    }
    
    // Accessibility features
    enableHighContrast() {
        document.body.classList.add('high-contrast');
    }
    
    disableHighContrast() {
        document.body.classList.remove('high-contrast');
    }
    
    increaseFontSize() {
        document.body.classList.add('large-font');
    }
    
    decreaseFontSize() {
        document.body.classList.remove('large-font');
    }
    
    // Touch feedback
    vibrate(pattern = [100]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
    
    // Performance monitoring display
    showFPS(fps) {
        let fpsDisplay = document.getElementById('fpsDisplay');
        if (!fpsDisplay) {
            fpsDisplay = document.createElement('div');
            fpsDisplay.id = 'fpsDisplay';
            fpsDisplay.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: #00ff00;
                padding: 5px 10px;
                font-family: monospace;
                font-size: 12px;
                z-index: 20;
                border: 1px solid #00ff00;
            `;
            document.getElementById('gameContainer').appendChild(fpsDisplay);
        }
        
        fpsDisplay.textContent = `FPS: ${fps.toFixed(1)}`;
        
        // Color based on performance
        if (fps < 30) {
            fpsDisplay.style.color = '#ff0000';
        } else if (fps < 50) {
            fpsDisplay.style.color = '#ffff00';
        } else {
            fpsDisplay.style.color = '#00ff00';
        }
    }
    
    hideFPS() {
        const fpsDisplay = document.getElementById('fpsDisplay');
        if (fpsDisplay) {
            fpsDisplay.remove();
        }
    }
    
    // Game state indicators
    showGameState(state) {
        // Remove any existing state indicator
        const existingIndicator = document.getElementById('gameStateIndicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Don't show indicator for normal playing state
        if (state === 'playing') return;
        
        const indicator = document.createElement('div');
        indicator.id = 'gameStateIndicator';
        indicator.style.cssText = `
            position: absolute;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: #ffff00;
            padding: 10px 20px;
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            border: 2px solid #ffff00;
            z-index: 20;
            text-align: center;
        `;
        
        switch (state) {
            case 'paused':
                indicator.textContent = 'PAUSED';
                break;
            case 'loading':
                indicator.textContent = 'LOADING...';
                break;
            case 'gameOver':
                indicator.textContent = 'GAME OVER';
                indicator.style.color = '#ff0000';
                indicator.style.borderColor = '#ff0000';
                break;
        }
        
        document.getElementById('gameContainer').appendChild(indicator);
    }
    
    hideGameStateIndicator() {
        const indicator = document.getElementById('gameStateIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    // Touch control feedback
    highlightTouchControl(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            setTimeout(() => {
                element.style.backgroundColor = '';
            }, 100);
        }
    }
    
    // Debug information
    showDebugInfo(debugData) {
        let debugDisplay = document.getElementById('debugDisplay');
        if (!debugDisplay) {
            debugDisplay = document.createElement('div');
            debugDisplay.id = 'debugDisplay';
            debugDisplay.style.cssText = `
                position: absolute;
                bottom: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                padding: 10px;
                font-family: monospace;
                font-size: 10px;
                z-index: 20;
                border: 1px solid #00ff00;
                max-width: 300px;
            `;
            document.getElementById('gameContainer').appendChild(debugDisplay);
        }
        
        let debugText = '';
        for (const [key, value] of Object.entries(debugData)) {
            debugText += `${key}: ${value}\n`;
        }
        debugDisplay.textContent = debugText;
    }
    
    hideDebugInfo() {
        const debugDisplay = document.getElementById('debugDisplay');
        if (debugDisplay) {
            debugDisplay.remove();
        }
    }
}