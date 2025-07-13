// Map system for Pocket DOOM 2.0
class GameMap {
    constructor() {
        this.width = 20;
        this.height = 20;
        this.tileSize = 1.0;
        
        // Map data: 0 = empty, 1 = wall, 2 = door, 3 = health pickup, 4 = ammo pickup
        this.grid = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,0,0,0,1,1,1,1,1,1,0,0,0,1,1,0,1],
            [1,0,1,3,0,0,0,0,0,0,0,0,0,0,0,0,4,1,0,1],
            [1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,1,1,2,1,1,1,1,2,1,1,0,0,0,0,1],
            [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
            [1,0,0,0,0,1,0,3,0,0,0,0,4,0,1,0,0,0,0,1],
            [1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
            [1,0,0,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1],
            [1,0,1,4,1,0,0,0,0,0,0,0,0,0,0,1,3,1,0,1],
            [1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];
        
        // Door states
        this.doors = new Map();
        this.initializeDoors();
        
        // Item pickups
        this.items = new Map();
        this.initializeItems();
        
        // Enemy spawn points
        this.enemySpawns = [
            {x: 3.5, y: 3.5},
            {x: 16.5, y: 3.5},
            {x: 8.5, y: 8.5},
            {x: 11.5, y: 8.5},
            {x: 3.5, y: 16.5},
            {x: 16.5, y: 16.5},
            {x: 7.5, y: 11.5},
            {x: 12.5, y: 11.5}
        ];
    }
    
    initializeDoors() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 2) {
                    this.doors.set(`${x},${y}`, {
                        x: x,
                        y: y,
                        isOpen: false,
                        openProgress: 0.0, // 0.0 = closed, 1.0 = fully open
                        opening: false,
                        closing: false
                    });
                }
            }
        }
    }
    
    initializeItems() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 3 || this.grid[y][x] === 4) {
                    this.items.set(`${x},${y}`, {
                        x: x + 0.5,
                        y: y + 0.5,
                        type: this.grid[y][x] === 3 ? 'health' : 'ammo',
                        collected: false,
                        bobOffset: Math.random() * Math.PI * 2 // For bobbing animation
                    });
                }
            }
        }
    }
    
    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 1; // Treat out of bounds as walls
        }
        return this.grid[Math.floor(y)][Math.floor(x)];
    }
    
    isWall(x, y) {
        const tile = this.getTile(x, y);
        if (tile === 1) return true;
        if (tile === 2) {
            // Check door state
            const doorKey = `${Math.floor(x)},${Math.floor(y)}`;
            const door = this.doors.get(doorKey);
            return door ? door.openProgress < 0.8 : true;
        }
        return false;
    }
    
    isPassable(x, y) {
        return !this.isWall(x, y);
    }
    
    // Collision detection for circular entities
    checkCollision(x, y, radius = 0.2) {
        const corners = [
            [x - radius, y - radius],
            [x + radius, y - radius],
            [x - radius, y + radius],
            [x + radius, y + radius]
        ];
        
        for (let [cx, cy] of corners) {
            if (this.isWall(cx, cy)) {
                return true;
            }
        }
        return false;
    }
    
    // Get valid movement position considering collisions
    getValidPosition(oldX, oldY, newX, newY, radius = 0.2) {
        let validX = newX;
        let validY = newY;
        
        // Check X movement first
        if (this.checkCollision(newX, oldY, radius)) {
            validX = oldX;
        }
        
        // Check Y movement
        if (this.checkCollision(validX, newY, radius)) {
            validY = oldY;
        }
        
        return {x: validX, y: validY};
    }
    
    // Door interaction
    interactWithDoor(x, y) {
        const doorX = Math.floor(x);
        const doorY = Math.floor(y);
        const doorKey = `${doorX},${doorY}`;
        const door = this.doors.get(doorKey);
        
        if (door && !door.opening && !door.closing) {
            if (door.isOpen) {
                door.closing = true;
                door.opening = false;
            } else {
                door.opening = true;
                door.closing = false;
            }
            return true;
        }
        return false;
    }
    
    // Update door animations
    updateDoors(deltaTime) {
        const doorSpeed = 2.0; // doors per second
        
        for (let door of this.doors.values()) {
            if (door.opening) {
                door.openProgress += doorSpeed * deltaTime;
                if (door.openProgress >= 1.0) {
                    door.openProgress = 1.0;
                    door.opening = false;
                    door.isOpen = true;
                }
            } else if (door.closing) {
                door.openProgress -= doorSpeed * deltaTime;
                if (door.openProgress <= 0.0) {
                    door.openProgress = 0.0;
                    door.closing = false;
                    door.isOpen = false;
                }
            }
        }
    }
    
    // Check for item pickup
    checkItemPickup(x, y, radius = 0.3) {
        for (let [key, item] of this.items.entries()) {
            if (!item.collected) {
                const dx = x - item.x;
                const dy = y - item.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < radius) {
                    item.collected = true;
                    return {
                        type: item.type,
                        key: key,
                        item: item
                    };
                }
            }
        }
        return null;
    }
    
    // Update item animations
    updateItems(deltaTime) {
        for (let item of this.items.values()) {
            if (!item.collected) {
                item.bobOffset += deltaTime * 3.0; // Bobbing speed
            }
        }
    }
    
    // Get nearest enemy spawn point
    getNearestSpawn(x, y) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (let spawn of this.enemySpawns) {
            const dx = x - spawn.x;
            const dy = y - spawn.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = spawn;
            }
        }
        
        return nearest;
    }
    
    // Get random spawn point away from player
    getRandomSpawn(playerX, playerY, minDistance = 5.0) {
        const validSpawns = this.enemySpawns.filter(spawn => {
            const dx = playerX - spawn.x;
            const dy = playerY - spawn.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance >= minDistance;
        });
        
        if (validSpawns.length === 0) {
            return this.enemySpawns[Math.floor(Math.random() * this.enemySpawns.length)];
        }
        
        return validSpawns[Math.floor(Math.random() * validSpawns.length)];
    }
    
    // A* pathfinding for enemy AI
    findPath(startX, startY, endX, endY) {
        const start = {x: Math.floor(startX), y: Math.floor(startY)};
        const end = {x: Math.floor(endX), y: Math.floor(endY)};
        
        if (this.isWall(end.x, end.y)) {
            return [];
        }
        
        const openSet = [start];
        const closedSet = new Set();
        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();
        
        const key = (node) => `${node.x},${node.y}`;
        
        gScore.set(key(start), 0);
        fScore.set(key(start), this.heuristic(start, end));
        
        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(key(openSet[i])) < fScore.get(key(current))) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }
            
            if (current.x === end.x && current.y === end.y) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({x: node.x + 0.5, y: node.y + 0.5});
                    node = cameFrom.get(key(node));
                }
                return path;
            }
            
            openSet.splice(currentIndex, 1);
            closedSet.add(key(current));
            
            // Check neighbors
            const neighbors = [
                {x: current.x + 1, y: current.y},
                {x: current.x - 1, y: current.y},
                {x: current.x, y: current.y + 1},
                {x: current.x, y: current.y - 1}
            ];
            
            for (let neighbor of neighbors) {
                const neighborKey = key(neighbor);
                
                if (closedSet.has(neighborKey) || this.isWall(neighbor.x, neighbor.y)) {
                    continue;
                }
                
                const tentativeGScore = gScore.get(key(current)) + 1;
                
                if (!openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
                    continue;
                }
                
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));
            }
        }
        
        return []; // No path found
    }
    
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
    
    // Check line of sight between two points
    hasLineOfSight(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const x = Math.floor(x1);
        const y = Math.floor(y1);
        const n = 1 + dx + dy;
        const x_inc = (x2 > x1) ? 1 : -1;
        const y_inc = (y2 > y1) ? 1 : -1;
        let error = dx - dy;
        
        dx *= 2;
        dy *= 2;
        
        for (let i = 0; i < n; i++) {
            if (this.isWall(x, y)) {
                return false;
            }
            
            if (error > 0) {
                x += x_inc;
                error -= dy;
            } else {
                y += y_inc;
                error += dx;
            }
        }
        
        return true;
    }
}