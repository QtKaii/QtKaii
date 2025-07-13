// Audio system for Pocket DOOM 2.0
class AudioSystem {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.7;
        this.enabled = true;
        
        // Audio context for better browser support
        this.audioContext = null;
        this.masterGain = null;
        
        this.initializeAudioContext();
        this.generateSounds();
    }
    
    initializeAudioContext() {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 1.0;
            
            // Resume audio context on user interaction (required by browsers)
            document.addEventListener('click', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
            
        } catch (error) {
            console.warn('Web Audio API not supported, falling back to HTML5 audio');
            this.audioContext = null;
        }
    }
    
    generateSounds() {
        // Generate procedural sounds using Web Audio API
        if (this.audioContext) {
            this.generateWebAudioSounds();
        } else {
            this.generateHTMLAudioSounds();
        }
    }
    
    generateWebAudioSounds() {
        // Pistol shot
        this.sounds.shoot = () => this.createGunshot(0.2, 800, 100);
        
        // Shotgun
        this.sounds.shotgun = () => this.createGunshot(0.4, 600, 80);
        
        // Chaingun
        this.sounds.chaingun = () => this.createGunshot(0.15, 900, 120);
        
        // Rocket
        this.sounds.rocket = () => this.createRocket();
        
        // Explosion
        this.sounds.explosion = () => this.createExplosion();
        
        // Enemy death
        this.sounds.enemyDeath = () => this.createEnemyDeath();
        
        // Enemy shoot
        this.sounds.enemyShoot = () => this.createEnemyShoot();
        
        // Enemy attack (melee)
        this.sounds.enemyAttack = () => this.createEnemyAttack();
        
        // Player hurt
        this.sounds.playerHurt = () => this.createPlayerHurt();
        
        // Player death
        this.sounds.playerDeath = () => this.createPlayerDeath();
        
        // Door open
        this.sounds.doorOpen = () => this.createDoorOpen();
        
        // Item pickup
        this.sounds.itemPickup = () => this.createItemPickup();
        
        // Weapon switch
        this.sounds.weaponSwitch = () => this.createWeaponSwitch();
        
        // Footsteps
        this.sounds.footstep = () => this.createFootstep();
    }
    
    generateHTMLAudioSounds() {
        // Fallback: create simple beep sounds using oscillator
        // This is a simplified version for browsers without full Web Audio support
        this.sounds = {
            shoot: () => this.playBeep(800, 0.1),
            shotgun: () => this.playBeep(600, 0.2),
            chaingun: () => this.playBeep(900, 0.05),
            rocket: () => this.playBeep(400, 0.3),
            explosion: () => this.playBeep(200, 0.5),
            enemyDeath: () => this.playBeep(300, 0.4),
            enemyShoot: () => this.playBeep(700, 0.1),
            enemyAttack: () => this.playBeep(500, 0.2),
            playerHurt: () => this.playBeep(400, 0.3),
            playerDeath: () => this.playBeep(250, 1.0),
            doorOpen: () => this.playBeep(1000, 0.3),
            itemPickup: () => this.playBeep(1200, 0.2),
            weaponSwitch: () => this.playBeep(800, 0.1),
            footstep: () => this.playBeep(300, 0.05)
        };
    }
    
    createGunshot(duration, frequency, noiseFreq) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const noiseNode = this.createNoise();
        const noiseGain = this.audioContext.createGain();
        
        // Main tone
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.3, this.audioContext.currentTime + duration);
        
        // Noise component
        noiseGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        // Main gain envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        // Connect nodes
        oscillator.connect(gainNode);
        noiseNode.connect(noiseGain);
        gainNode.connect(this.masterGain);
        noiseGain.connect(this.masterGain);
        
        // Start and stop
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        noiseNode.start(currentTime);
        oscillator.stop(currentTime + duration);
        noiseNode.stop(currentTime + duration);
    }
    
    createNoise() {
        const bufferSize = this.audioContext.sampleRate * 0.1; // 0.1 seconds of noise
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        
        return noise;
    }
    
    createRocket() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.8, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.5);
    }
    
    createExplosion() {
        const noiseNode = this.createNoise();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filterNode.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.8);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
        
        noiseNode.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        noiseNode.start(currentTime);
        noiseNode.stop(currentTime + 0.8);
    }
    
    createEnemyDeath() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.6);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.6, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.6);
    }
    
    createEnemyShoot() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.2);
    }
    
    createEnemyAttack() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(250, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(500, this.audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.3);
    }
    
    createPlayerHurt() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.6, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.4);
    }
    
    createPlayerDeath() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 1.5);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.8, this.audioContext.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 1.5);
    }
    
    createDoorOpen() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.3);
        oscillator.frequency.linearRampToValueAtTime(200, this.audioContext.currentTime + 0.6);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.4, this.audioContext.currentTime + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.6);
    }
    
    createItemPickup() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
        oscillator.frequency.linearRampToValueAtTime(1000, this.audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.5, this.audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.2);
    }
    
    createWeaponSwitch() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.05);
        oscillator.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.1);
    }
    
    createFootstep() {
        const noiseNode = this.createNoise();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        filterNode.type = 'highpass';
        filterNode.frequency.setValueAtTime(500, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.2, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        noiseNode.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        noiseNode.start(currentTime);
        noiseNode.stop(currentTime + 0.1);
    }
    
    playBeep(frequency, duration) {
        if (!this.audioContext) {
            // Fallback for very old browsers
            console.log(`Beep: ${frequency}Hz for ${duration}s`);
            return;
        }
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);
    }
    
    playSound(soundName) {
        if (!this.enabled || !this.sounds[soundName]) {
            return;
        }
        
        try {
            this.sounds[soundName]();
        } catch (error) {
            console.warn(`Failed to play sound ${soundName}:`, error);
        }
    }
    
    playBackgroundMusic() {
        if (!this.audioContext || !this.enabled) return;
        
        // Create a simple background music loop
        this.createBackgroundMusic();
    }
    
    createBackgroundMusic() {
        // Create a simple ambient background music
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        oscillator1.type = 'sine';
        oscillator1.frequency.value = 60; // Low bass
        
        oscillator2.type = 'triangle';
        oscillator2.frequency.value = 120; // Harmonic
        
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 400;
        
        gainNode.gain.value = this.musicVolume * 0.1; // Very quiet background
        
        oscillator1.connect(filterNode);
        oscillator2.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const currentTime = this.audioContext.currentTime;
        oscillator1.start(currentTime);
        oscillator2.start(currentTime);
        
        // Stop after 30 seconds and restart (simple loop)
        oscillator1.stop(currentTime + 30);
        oscillator2.stop(currentTime + 30);
        
        // Restart after a short pause
        setTimeout(() => {
            if (this.enabled) {
                this.createBackgroundMusic();
            }
        }, 31000);
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = enabled ? 1.0 : 0.0;
        }
    }
    
    toggle() {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }
}