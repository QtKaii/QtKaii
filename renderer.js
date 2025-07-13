// 3D Raycasting Renderer for Pocket DOOM 2.0
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        
        // Rendering settings
        this.fov = Math.PI / 3; // 60 degrees
        this.maxRenderDistance = 20;
        this.wallHeight = 1.0;
        this.rayCount = 0;
        
        // Color palettes
        this.wallColors = {
            1: '#666666', // Basic wall
            2: '#8B4513'  // Door
        };
        
        this.floorColor = '#333333';
        this.ceilingColor = '#111111';
        
        // Textures (simple colored patterns)
        this.wallTextures = {};
        this.generateTextures();
        
        // Effects
        this.explosions = [];
        this.muzzleFlashOpacity = 0;
        
        // Performance settings
        this.renderQuality = 1.0; // 1.0 = full quality, 0.5 = half quality for performance
        
        this.resize();
    }
    
    resize() {
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        
        // Ensure we have valid dimensions
        if (this.width === 0 || this.height === 0) {
            this.width = Math.max(this.width, 375); // Fallback minimum width
            this.height = Math.max(this.height, 667); // Fallback minimum height
        }
        
        // Adjust canvas resolution based on device pixel ratio and quality setting
        const dpr = window.devicePixelRatio || 1;
        const effectiveRatio = dpr * this.renderQuality;
        
        this.canvas.width = this.width * effectiveRatio;
        this.canvas.height = this.height * effectiveRatio;
        
        // Reset transform before scaling to prevent accumulation
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(effectiveRatio, effectiveRatio);
        
        // Calculate ray count based on width
        this.rayCount = Math.floor(this.width / 2); // One ray per 2 pixels for performance
        
        // Image smoothing off for pixelated look
        this.ctx.imageSmoothingEnabled = false;
        
        if (this.debug) {
            console.log(`Canvas resized: ${this.width}x${this.height}, DPR: ${dpr}, Quality: ${this.renderQuality}`);
        }
    }
    
    generateTextures() {
        // Generate simple procedural textures
        const textureSize = 64;
        
        // Wall texture 1 - Stone
        this.wallTextures[1] = this.generateStoneTexture(textureSize);
        
        // Door texture - Wood
        this.wallTextures[2] = this.generateWoodTexture(textureSize);
    }
    
    generateStoneTexture(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Base gray
        ctx.fillStyle = '#666666';
        ctx.fillRect(0, 0, size, size);
        
        // Add noise
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 60;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
    
    generateWoodTexture(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Base brown
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, 0, size, size);
        
        // Wood grain lines
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        
        for (let y = 0; y < size; y += 8) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y + (Math.random() - 0.5) * 4);
            ctx.stroke();
        }
        
        return canvas;
    }
    
    render(player, gameMap, enemies, weapon) {
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Render floor and ceiling
        this.renderFloorAndCeiling();
        
        // Render walls using raycasting
        this.renderWalls(player, gameMap);
        
        // Render sprites (enemies, items, projectiles)
        this.renderSprites(player, gameMap, enemies, weapon);
        
        // Render effects
        this.renderEffects();
        
        // Render weapon (first person view)
        this.renderWeapon(weapon);
    }
    
    renderFloorAndCeiling() {
        const horizonY = this.height / 2;
        
        // Ceiling
        this.ctx.fillStyle = this.ceilingColor;
        this.ctx.fillRect(0, 0, this.width, horizonY);
        
        // Floor
        this.ctx.fillStyle = this.floorColor;
        this.ctx.fillRect(0, horizonY, this.width, horizonY);
    }
    
    renderWalls(player, gameMap) {
        const rayAngleStep = this.fov / this.rayCount;
        const distanceToScreen = (this.width / 2) / Math.tan(this.fov / 2);
        
        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = player.angle - this.fov / 2 + i * rayAngleStep;
            const rayResult = this.castRay(player.x, player.y, rayAngle, gameMap);
            
            if (rayResult.hit) {
                // Calculate wall slice position and height
                const x = (i / this.rayCount) * this.width;
                const correctedDistance = rayResult.distance * Math.cos(rayAngle - player.angle);
                const wallHeight = (this.wallHeight * distanceToScreen) / correctedDistance;
                
                // Calculate wall slice top and bottom
                const wallTop = (this.height - wallHeight) / 2;
                const wallBottom = wallTop + wallHeight;
                
                // Get wall color/texture
                const wallType = rayResult.wallType;
                const brightness = Math.max(0.3, 1.0 - correctedDistance / this.maxRenderDistance);
                
                // Handle doors
                let color = this.wallColors[wallType] || this.wallColors[1];
                if (wallType === 2) {
                    const door = gameMap.doors.get(`${rayResult.mapX},${rayResult.mapY}`);
                    if (door && door.openProgress > 0) {
                        // Door is opening/open - adjust rendering
                        const openAmount = door.openProgress;
                        if (rayResult.side === 0) { // Vertical door
                            if (rayResult.wallX < openAmount) {
                                continue; // Skip rendering this part of the door
                            }
                        } else { // Horizontal door
                            if (rayResult.wallY < openAmount) {
                                continue;
                            }
                        }
                    }
                }
                
                // Apply brightness
                const rgb = this.hexToRgb(color);
                const darkenedColor = `rgb(${Math.floor(rgb.r * brightness)}, ${Math.floor(rgb.g * brightness)}, ${Math.floor(rgb.b * brightness)})`;
                
                // Draw wall slice
                this.ctx.fillStyle = darkenedColor;
                this.ctx.fillRect(Math.floor(x), Math.floor(wallTop), Math.ceil(this.width / this.rayCount), Math.ceil(wallHeight));
                
                // Add subtle vertical lines for texture
                if (i % 4 === 0) {
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * brightness})`;
                    this.ctx.fillRect(Math.floor(x), Math.floor(wallTop), 1, Math.ceil(wallHeight));
                }
            }
        }
    }
    
    castRay(startX, startY, angle, gameMap) {
        const rayDirX = Math.cos(angle);
        const rayDirY = Math.sin(angle);
        
        let mapX = Math.floor(startX);
        let mapY = Math.floor(startY);
        
        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);
        
        let hit = false;
        let side; // 0 = vertical wall, 1 = horizontal wall
        let sideDistX, sideDistY;
        let stepX, stepY;
        
        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (startX - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - startX) * deltaDistX;
        }
        
        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (startY - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - startY) * deltaDistY;
        }
        
        // DDA algorithm
        let distance = 0;
        while (!hit && distance < this.maxRenderDistance) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }
            
            const wallType = gameMap.getTile(mapX, mapY);
            if (wallType > 0) {
                hit = true;
                
                // Calculate distance
                if (side === 0) {
                    distance = (mapX - startX + (1 - stepX) / 2) / rayDirX;
                } else {
                    distance = (mapY - startY + (1 - stepY) / 2) / rayDirY;
                }
                
                // Calculate wall hit position for texturing
                let wallX, wallY;
                if (side === 0) {
                    wallY = startY + distance * rayDirY;
                    wallX = wallY - Math.floor(wallY);
                } else {
                    wallX = startX + distance * rayDirX;
                    wallY = wallX - Math.floor(wallX);
                }
                
                return {
                    hit: true,
                    distance: distance,
                    wallType: wallType,
                    mapX: mapX,
                    mapY: mapY,
                    side: side,
                    wallX: wallX,
                    wallY: wallY
                };
            }
        }
        
        return { hit: false, distance: this.maxRenderDistance };
    }
    
    renderSprites(player, gameMap, enemies, weapon) {
        const sprites = [];
        
        // Add enemies to sprite list
        for (let enemy of enemies) {
            if (!enemy.isDead) {
                sprites.push({
                    x: enemy.x,
                    y: enemy.y,
                    type: 'enemy',
                    enemy: enemy,
                    distance: this.getDistance(player.x, player.y, enemy.x, enemy.y)
                });
            }
        }
        
        // Add items to sprite list
        for (let [key, item] of gameMap.items.entries()) {
            if (!item.collected) {
                sprites.push({
                    x: item.x,
                    y: item.y,
                    type: 'item',
                    item: item,
                    distance: this.getDistance(player.x, player.y, item.x, item.y)
                });
            }
        }
        
        // Add projectiles to sprite list
        for (let projectile of weapon.projectiles) {
            sprites.push({
                x: projectile.x,
                y: projectile.y,
                type: 'projectile',
                projectile: projectile,
                distance: this.getDistance(player.x, player.y, projectile.x, projectile.y)
            });
        }
        
        // Sort sprites by distance (far to near)
        sprites.sort((a, b) => b.distance - a.distance);
        
        // Render sprites
        for (let sprite of sprites) {
            this.renderSprite(sprite, player);
        }
    }
    
    renderSprite(sprite, player) {
        const dx = sprite.x - player.x;
        const dy = sprite.y - player.y;
        const distance = sprite.distance;
        
        if (distance > this.maxRenderDistance) return;
        
        // Calculate sprite position relative to player
        const angle = Math.atan2(dy, dx) - player.angle;
        const spriteX = distance * Math.cos(angle);
        const spriteY = distance * Math.sin(angle);
        
        // Check if sprite is in front of player
        if (spriteX <= 0) return;
        
        // Project to screen
        const screenX = (this.width / 2) + (spriteY / spriteX) * (this.width / 2) / Math.tan(this.fov / 2);
        const spriteSize = Math.max(20, (this.height / spriteX) * 0.5);
        
        // Check if sprite is visible on screen
        if (screenX < -spriteSize || screenX > this.width + spriteSize) return;
        
        // Calculate brightness based on distance
        const brightness = Math.max(0.3, 1.0 - distance / this.maxRenderDistance);
        
        // Render based on sprite type
        if (sprite.type === 'enemy') {
            this.renderEnemySprite(sprite.enemy, screenX, spriteSize, brightness);
        } else if (sprite.type === 'item') {
            this.renderItemSprite(sprite.item, screenX, spriteSize, brightness);
        } else if (sprite.type === 'projectile') {
            this.renderProjectileSprite(sprite.projectile, screenX, spriteSize, brightness);
        }
    }
    
    renderEnemySprite(enemy, screenX, size, brightness) {
        const centerY = this.height / 2;
        const halfSize = size / 2;
        
        // Get enemy color
        const baseColor = enemy.color;
        const rgb = this.hexToRgb(baseColor);
        const color = `rgba(${Math.floor(rgb.r * brightness)}, ${Math.floor(rgb.g * brightness)}, ${Math.floor(rgb.b * brightness)}, 1)`;
        
        // Simple enemy sprite - circle with eyes
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(screenX, centerY, halfSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eyes
        const eyeSize = size * 0.1;
        const eyeOffset = size * 0.2;
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(screenX - eyeOffset, centerY - eyeOffset, eyeSize, 0, Math.PI * 2);
        this.ctx.arc(screenX + eyeOffset, centerY - eyeOffset, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Health bar above enemy
        if (enemy.health < enemy.maxHealth) {
            const barWidth = size;
            const barHeight = 4;
            const barY = centerY - halfSize - 10;
            const healthPercent = enemy.health / enemy.maxHealth;
            
            // Background
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.fillRect(screenX - barWidth/2, barY, barWidth, barHeight);
            
            // Health
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            this.ctx.fillRect(screenX - barWidth/2, barY, barWidth * healthPercent, barHeight);
        }
    }
    
    renderItemSprite(item, screenX, size, brightness) {
        const centerY = this.height / 2;
        const halfSize = size / 2;
        
        // Bobbing animation
        const bobOffset = Math.sin(item.bobOffset) * size * 0.1;
        const itemY = centerY + bobOffset;
        
        // Item color based on type
        let color;
        if (item.type === 'health') {
            color = `rgba(0, ${Math.floor(255 * brightness)}, 0, 1)`; // Green
        } else {
            color = `rgba(${Math.floor(255 * brightness)}, ${Math.floor(255 * brightness)}, 0, 1)`; // Yellow
        }
        
        // Simple item sprite - diamond shape
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, itemY - halfSize);
        this.ctx.lineTo(screenX + halfSize, itemY);
        this.ctx.lineTo(screenX, itemY + halfSize);
        this.ctx.lineTo(screenX - halfSize, itemY);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Glow effect
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = size * 0.5;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }
    
    renderProjectileSprite(projectile, screenX, size, brightness) {
        const centerY = this.height / 2;
        const halfSize = Math.max(2, size / 4); // Projectiles are smaller
        
        // Projectile color
        let color;
        if (projectile.owner === 'player') {
            color = `rgba(${Math.floor(255 * brightness)}, ${Math.floor(255 * brightness)}, 0, 1)`; // Yellow
        } else {
            color = `rgba(${Math.floor(255 * brightness)}, 0, 0, 1)`; // Red
        }
        
        // Simple projectile sprite - small circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(screenX, centerY, halfSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Trail effect for rockets
        if (projectile.explosive) {
            this.ctx.fillStyle = `rgba(255, 100, 0, ${0.5 * brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(screenX, centerY, halfSize * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    renderWeapon(weapon) {
        const currentWeapon = weapon.getCurrentWeapon();
        const weaponX = this.width * 0.8;
        const weaponY = this.height * 0.8;
        const weaponSize = this.height * 0.3;
        
        // Simple weapon sprite - rectangle representing gun
        this.ctx.fillStyle = '#444444';
        this.ctx.fillRect(weaponX - weaponSize/2, weaponY - weaponSize/2, weaponSize, weaponSize/2);
        
        // Weapon barrel
        this.ctx.fillStyle = '#222222';
        this.ctx.fillRect(weaponX - weaponSize/4, weaponY - weaponSize/2 - 20, weaponSize/2, 15);
        
        // Muzzle flash
        if (weapon.muzzleFlash.active) {
            const flashSize = weaponSize * 0.6;
            const alpha = weapon.muzzleFlash.timeLeft / weapon.muzzleFlash.duration;
            
            this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(weaponX, weaponY - weaponSize/2 - 30, flashSize, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Flash rays
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            this.ctx.lineWidth = 3;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const startX = weaponX + Math.cos(angle) * flashSize * 0.5;
                const startY = weaponY - weaponSize/2 - 30 + Math.sin(angle) * flashSize * 0.5;
                const endX = weaponX + Math.cos(angle) * flashSize;
                const endY = weaponY - weaponSize/2 - 30 + Math.sin(angle) * flashSize;
                
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.lineTo(endX, endY);
                this.ctx.stroke();
            }
        }
    }
    
    renderEffects() {
        // Render explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.timeLeft -= 0.016; // Assume 60 FPS
            
            if (explosion.timeLeft <= 0) {
                this.explosions.splice(i, 1);
                continue;
            }
            
            const alpha = explosion.timeLeft / explosion.duration;
            const size = explosion.maxSize * (1 - alpha);
            
            // Explosion effect - expanding circle
            this.ctx.fillStyle = `rgba(255, ${Math.floor(150 * alpha)}, 0, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(explosion.screenX, explosion.screenY, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner bright core
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(explosion.screenX, explosion.screenY, size * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    addExplosion(worldX, worldY, radius) {
        // Convert world coordinates to screen coordinates
        const player = window.gameInstance.player;
        const dx = worldX - player.x;
        const dy = worldY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.maxRenderDistance) return;
        
        const angle = Math.atan2(dy, dx) - player.angle;
        const spriteX = distance * Math.cos(angle);
        const spriteY = distance * Math.sin(angle);
        
        if (spriteX <= 0) return;
        
        const screenX = (this.width / 2) + (spriteY / spriteX) * (this.width / 2) / Math.tan(this.fov / 2);
        const screenSize = (this.height / spriteX) * radius;
        
        this.explosions.push({
            screenX: screenX,
            screenY: this.height / 2,
            maxSize: screenSize,
            duration: 0.5,
            timeLeft: 0.5
        });
    }
    
    // Utility functions
    getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    // Performance adjustment
    setRenderQuality(quality) {
        this.renderQuality = Math.max(0.25, Math.min(1.0, quality));
        this.resize();
    }
    
    // Auto-adjust quality based on performance
    adjustQualityForPerformance() {
        // Simple performance monitoring
        const now = performance.now();
        if (this.lastFrameTime) {
            const frameDelta = now - this.lastFrameTime;
            const fps = 1000 / frameDelta;
            
            if (fps < 30 && this.renderQuality > 0.5) {
                this.setRenderQuality(this.renderQuality - 0.1);
            } else if (fps > 50 && this.renderQuality < 1.0) {
                this.setRenderQuality(this.renderQuality + 0.05);
            }
        }
        this.lastFrameTime = now;
    }
}