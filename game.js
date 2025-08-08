// Game state and configuration
const GAME_CONFIG = {
    canvas: {
        width: 1200,
        height: 800
    },
    soldier: {
        speed: 2,
        sprintSpeed: 3.5,
        size: 12,
        maxHealth: 100,
        fireRate: 10, // frames between shots
        reloadTime: 120, // frames
        magSize: 30,
        totalAmmo: 90,
        range: 150
    },
    zombie: {
        speed: 0.8,
        fastSpeed: 1.5,
        size: 10,
        health: 50,
        damage: 25,
        attackRate: 60
    },
    civilian: {
        speed: 1.2,
        size: 8,
        health: 50,
        fleeDistance: 100
    },
    mission: {
        totalCivilians: 5,
        extractionZone: { x: 1100, y: 400, width: 80, height: 100 }
    }
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameRunning = false;
        this.gameWon = false;
        this.gameLost = false;
        this.frame = 0;
        
        // Game entities
        this.soldiers = [];
        this.zombies = [];
        this.civilians = [];
        this.bullets = [];
        this.obstacles = [];
        
        // Game stats
        this.civiliansRescued = 0;
        this.zombiesEliminated = 0;
        
        // Controls
        this.targetX = null;
        this.targetY = null;
        this.sprinting = false;
        this.holdPosition = false;
        this.followMode = true;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.generateLevel();
        this.startGame();
    }
    
    setupEventListeners() {
        // Canvas click for movement
        this.canvas.addEventListener('click', (e) => {
            if (!this.gameRunning) return;
            
            const rect = this.canvas.getBoundingClientRect();
            this.targetX = e.clientX - rect.left;
            this.targetY = e.clientY - rect.top;
            
            if (!this.holdPosition) {
                this.soldiers.forEach(soldier => {
                    soldier.setTarget(this.targetX, this.targetY);
                });
            }
        });
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 's':
                    this.toggleSprint();
                    break;
                case 'h':
                    this.toggleHoldPosition();
                    break;
                case 'f':
                    this.toggleFollowMode();
                    break;
                case 'r':
                    this.reloadAll();
                    break;
            }
        });
        
        // Action bar buttons
        document.getElementById('sprint-toggle').addEventListener('click', () => this.toggleSprint());
        document.getElementById('hold-position').addEventListener('click', () => this.toggleHoldPosition());
        document.getElementById('follow-mode').addEventListener('click', () => this.toggleFollowMode());
        document.getElementById('reload-all').addEventListener('click', () => this.reloadAll());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartGame());
    }
    
    generateLevel() {
        // Create soldiers (spec ops team)
        this.soldiers = [
            new Soldier(100, 350, 'Alpha'),
            new Soldier(120, 380, 'Bravo'),
            new Soldier(80, 380, 'Charlie')
        ];
        
        // Create obstacles (barriers)
        this.obstacles = [
            new Obstacle(300, 200, 100, 20),
            new Obstacle(500, 400, 20, 150),
            new Obstacle(700, 100, 80, 30),
            new Obstacle(800, 500, 120, 25),
            new Obstacle(400, 600, 200, 20),
            new Obstacle(900, 200, 30, 100)
        ];
        
        // Create civilians
        for (let i = 0; i < GAME_CONFIG.mission.totalCivilians; i++) {
            let x, y;
            do {
                x = Math.random() * (this.canvas.width - 200) + 100;
                y = Math.random() * (this.canvas.height - 200) + 100;
            } while (this.isPositionBlocked(x, y, 50));
            
            this.civilians.push(new Civilian(x, y));
        }
        
        // Create initial zombies
        this.spawnZombies(3);
    }
    
    spawnZombies(count) {
        for (let i = 0; i < count; i++) {
            let x, y;
            // Spawn at edges
            if (Math.random() < 0.5) {
                x = Math.random() < 0.5 ? 0 : this.canvas.width;
                y = Math.random() * this.canvas.height;
            } else {
                x = Math.random() * this.canvas.width;
                y = Math.random() < 0.5 ? 0 : this.canvas.height;
            }
            
            const type = Math.random() < 0.7 ? 'normal' : 'fast';
            this.zombies.push(new Zombie(x, y, type));
        }
    }
    
    isPositionBlocked(x, y, margin = 0) {
        return this.obstacles.some(obstacle => 
            x + margin > obstacle.x && x - margin < obstacle.x + obstacle.width &&
            y + margin > obstacle.y && y - margin < obstacle.y + obstacle.height
        );
    }
    
    startGame() {
        this.gameRunning = true;
        this.gameLoop();
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        this.update();
        this.render();
        this.frame++;
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // Spawn more zombies periodically
        if (this.frame % 600 === 0) { // Every 10 seconds at 60fps
            this.spawnZombies(Math.floor(Math.random() * 2) + 1);
        }
        
        // Update soldiers
        this.soldiers.forEach(soldier => soldier.update(this));
        
        // Update zombies
        this.zombies.forEach(zombie => zombie.update(this));
        
        // Update civilians
        this.civilians.forEach(civilian => civilian.update(this));
        
        // Update bullets
        this.bullets.forEach(bullet => bullet.update(this));
        
        // Remove dead entities
        this.zombies = this.zombies.filter(zombie => zombie.health > 0);
        this.bullets = this.bullets.filter(bullet => !bullet.toRemove);
        
        // Check civilian rescue
        this.civilians.forEach((civilian, index) => {
            if (civilian.inExtractionZone(GAME_CONFIG.mission.extractionZone)) {
                this.civilians.splice(index, 1);
                this.civiliansRescued++;
                this.updateUI();
            }
        });
        
        // Check win/lose conditions
        this.checkGameEnd();
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#1a2f1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw extraction zone
        const ez = GAME_CONFIG.mission.extractionZone;
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        this.ctx.fillRect(ez.x, ez.y, ez.width, ez.height);
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(ez.x, ez.y, ez.width, ez.height);
        
        // Draw extraction zone label
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('EXTRACTION', ez.x + 5, ez.y - 5);
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => obstacle.render(this.ctx));
        
        // Draw target indicator
        if (this.targetX && this.targetY && !this.holdPosition) {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.targetX, this.targetY, 15, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Draw entities
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.civilians.forEach(civilian => civilian.render(this.ctx));
        this.zombies.forEach(zombie => zombie.render(this.ctx));
        this.soldiers.forEach(soldier => soldier.render(this.ctx, this));
        
        // Draw UI overlays
        this.drawMinimap();
    }
    
    drawMinimap() {
        const minimapSize = 150;
        const minimapX = this.canvas.width - minimapSize - 10;
        const minimapY = 10;
        const scaleX = minimapSize / this.canvas.width;
        const scaleY = minimapSize / this.canvas.height;
        
        // Minimap background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
        this.ctx.strokeStyle = '#666';
        this.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Draw entities on minimap
        this.soldiers.forEach(soldier => {
            this.ctx.fillStyle = '#0080ff';
            this.ctx.fillRect(
                minimapX + soldier.x * scaleX - 1,
                minimapY + soldier.y * scaleY - 1,
                2, 2
            );
        });
        
        this.zombies.forEach(zombie => {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(
                minimapX + zombie.x * scaleX - 1,
                minimapY + zombie.y * scaleY - 1,
                2, 2
            );
        });
        
        this.civilians.forEach(civilian => {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillRect(
                minimapX + civilian.x * scaleX - 1,
                minimapY + civilian.y * scaleY - 1,
                2, 2
            );
        });
    }
    
    toggleSprint() {
        this.sprinting = !this.sprinting;
        document.getElementById('sprint-toggle').classList.toggle('active', this.sprinting);
    }
    
    toggleHoldPosition() {
        this.holdPosition = !this.holdPosition;
        document.getElementById('hold-position').classList.toggle('active', this.holdPosition);
        if (this.holdPosition) {
            this.soldiers.forEach(soldier => soldier.clearTarget());
        }
    }
    
    toggleFollowMode() {
        this.followMode = !this.followMode;
        document.getElementById('follow-mode').classList.toggle('active', this.followMode);
    }
    
    reloadAll() {
        this.soldiers.forEach(soldier => soldier.startReload());
    }
    
    updateUI() {
        document.getElementById('civilians-rescued').textContent = `Civilians Rescued: ${this.civiliansRescued}/${GAME_CONFIG.mission.totalCivilians}`;
        document.getElementById('zombies-eliminated').textContent = `Zombies Eliminated: ${this.zombiesEliminated}`;
        
        this.soldiers.forEach((soldier, index) => {
            const statusEl = document.getElementById(`soldier-${index + 1}`);
            if (statusEl) {
                const healthBar = statusEl.querySelector('.health-fill');
                const ammoCount = statusEl.querySelector('.ammo-count');
                
                healthBar.style.width = `${(soldier.health / GAME_CONFIG.soldier.maxHealth) * 100}%`;
                ammoCount.textContent = `${soldier.currentAmmo}/${soldier.totalAmmo}`;
            }
        });
    }
    
    checkGameEnd() {
        // Win condition: all civilians rescued
        if (this.civiliansRescued >= GAME_CONFIG.mission.totalCivilians && !this.gameWon) {
            this.gameWon = true;
            this.gameRunning = false;
            this.showGameOver('Mission Complete!', 'All civilians have been successfully evacuated.');
        }
        
        // Lose condition: all soldiers dead
        const aliveSoldiers = this.soldiers.filter(s => s.health > 0);
        if (aliveSoldiers.length === 0 && !this.gameLost) {
            this.gameLost = true;
            this.gameRunning = false;
            this.showGameOver('Mission Failed!', 'All squad members have been eliminated.');
        }
    }
    
    showGameOver(title, message) {
        document.getElementById('game-over-title').textContent = title;
        document.getElementById('game-over-message').textContent = message;
        document.getElementById('game-over-modal').classList.remove('hidden');
    }
    
    restartGame() {
        // Reset game state
        this.gameRunning = false;
        this.gameWon = false;
        this.gameLost = false;
        this.frame = 0;
        this.civiliansRescued = 0;
        this.zombiesEliminated = 0;
        
        // Clear entities
        this.soldiers = [];
        this.zombies = [];
        this.civilians = [];
        this.bullets = [];
        
        // Reset controls
        this.targetX = null;
        this.targetY = null;
        this.sprinting = false;
        this.holdPosition = false;
        this.followMode = true;
        
        // Reset UI
        document.getElementById('game-over-modal').classList.add('hidden');
        document.querySelectorAll('.action-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('follow-mode').classList.add('active');
        
        // Regenerate level and start
        this.generateLevel();
        this.updateUI();
        this.startGame();
    }
}

// Entity classes
class Entity {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.health = 100;
        this.maxHealth = 100;
    }
    
    distanceTo(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }
    
    angleTo(other) {
        return Math.atan2(other.y - this.y, other.x - this.x);
    }
    
    moveTowards(x, y, speed) {
        const angle = Math.atan2(y - this.y, x - this.x);
        this.x += Math.cos(angle) * speed;
        this.y += Math.sin(angle) * speed;
    }
    
    isColliding(other) {
        return this.distanceTo(other) < (this.size + other.size) / 2;
    }
}

class Soldier extends Entity {
    constructor(x, y, name) {
        super(x, y, GAME_CONFIG.soldier.size);
        this.name = name;
        this.health = GAME_CONFIG.soldier.maxHealth;
        this.maxHealth = GAME_CONFIG.soldier.maxHealth;
        
        this.targetX = null;
        this.targetY = null;
        this.currentAmmo = GAME_CONFIG.soldier.magSize;
        this.totalAmmo = GAME_CONFIG.soldier.totalAmmo;
        this.reloading = false;
        this.reloadTimer = 0;
        this.fireTimer = 0;
        this.angle = 0;
    }
    
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    clearTarget() {
        this.targetX = null;
        this.targetY = null;
    }
    
    update(game) {
        if (this.health <= 0) return;
        
        // Handle reloading
        if (this.reloading) {
            this.reloadTimer--;
            if (this.reloadTimer <= 0) {
                const ammoNeeded = GAME_CONFIG.soldier.magSize - this.currentAmmo;
                const ammoToReload = Math.min(ammoNeeded, this.totalAmmo);
                this.currentAmmo += ammoToReload;
                this.totalAmmo -= ammoToReload;
                this.reloading = false;
            }
            return;
        }
        
        // Auto-reload if empty
        if (this.currentAmmo <= 0 && this.totalAmmo > 0) {
            this.startReload();
            return;
        }
        
        // Movement
        if (this.targetX !== null && this.targetY !== null && !game.holdPosition) {
            const distance = Math.sqrt((this.targetX - this.x) ** 2 + (this.targetY - this.y) ** 2);
            if (distance > 5) {
                const speed = game.sprinting ? GAME_CONFIG.soldier.sprintSpeed : GAME_CONFIG.soldier.speed;
                
                // Check for obstacle collision and pathfind around
                const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
                const nextX = this.x + Math.cos(angle) * speed;
                const nextY = this.y + Math.sin(angle) * speed;
                
                if (!game.isPositionBlocked(nextX, nextY, this.size / 2)) {
                    this.x = nextX;
                    this.y = nextY;
                } else {
                    // Simple obstacle avoidance - try alternative angles
                    for (let i = 1; i <= 8; i++) {
                        const altAngle = angle + (i % 2 === 0 ? 1 : -1) * (i * Math.PI / 8);
                        const altX = this.x + Math.cos(altAngle) * speed;
                        const altY = this.y + Math.sin(altAngle) * speed;
                        
                        if (!game.isPositionBlocked(altX, altY, this.size / 2)) {
                            this.x = altX;
                            this.y = altY;
                            break;
                        }
                    }
                }
            }
        }
        
        // Combat - find nearest zombie and shoot
        if (!game.sprinting && this.currentAmmo > 0) {
            const nearestZombie = this.findNearestZombie(game.zombies);
            if (nearestZombie && this.distanceTo(nearestZombie) <= GAME_CONFIG.soldier.range) {
                this.angle = this.angleTo(nearestZombie);
                
                if (this.fireTimer <= 0) {
                    this.fire(game, nearestZombie);
                    this.fireTimer = GAME_CONFIG.soldier.fireRate;
                }
            }
        }
        
        if (this.fireTimer > 0) this.fireTimer--;
    }
    
    findNearestZombie(zombies) {
        let nearest = null;
        let minDistance = Infinity;
        
        zombies.forEach(zombie => {
            if (zombie.health > 0) {
                const distance = this.distanceTo(zombie);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = zombie;
                }
            }
        });
        
        return nearest;
    }
    
    fire(game, target) {
        if (this.currentAmmo <= 0) return;
        
        const bullet = new Bullet(this.x, this.y, this.angle, this);
        game.bullets.push(bullet);
        this.currentAmmo--;
        game.updateUI();
    }
    
    startReload() {
        if (this.totalAmmo > 0 && this.currentAmmo < GAME_CONFIG.soldier.magSize && !this.reloading) {
            this.reloading = true;
            this.reloadTimer = GAME_CONFIG.soldier.reloadTime;
        }
    }
    
    render(ctx, game) {
        if (this.health <= 0) return;
        
        // Draw soldier
        ctx.fillStyle = this.reloading ? '#ffaa00' : '#0080ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw weapon direction
        if (!game.sprinting && this.currentAmmo > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(
                this.x + Math.cos(this.angle) * (this.size + 5),
                this.y + Math.sin(this.angle) * (this.size + 5)
            );
            ctx.stroke();
        }
        
        // Draw health bar
        if (this.health < this.maxHealth) {
            const barWidth = this.size;
            const barHeight = 3;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.size / 2 - 8;
            
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(barX, barY, (this.health / this.maxHealth) * barWidth, barHeight);
        }
        
        // Draw reload indicator
        if (this.reloading) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = '10px Arial';
            ctx.fillText('RELOAD', this.x - 15, this.y + this.size);
        }
    }
}

class Zombie extends Entity {
    constructor(x, y, type = 'normal') {
        super(x, y, GAME_CONFIG.zombie.size);
        this.type = type;
        this.health = GAME_CONFIG.zombie.health;
        this.maxHealth = GAME_CONFIG.zombie.health;
        this.speed = type === 'fast' ? GAME_CONFIG.zombie.fastSpeed : GAME_CONFIG.zombie.speed;
        this.attackTimer = 0;
        this.target = null;
    }
    
    update(game) {
        if (this.health <= 0) return;
        
        // Find nearest target (soldiers first, then civilians)
        this.target = this.findNearestTarget(game.soldiers, game.civilians);
        
        if (this.target) {
            // Move towards target
            this.moveTowards(this.target.x, this.target.y, this.speed);
            
            // Attack if close enough
            if (this.isColliding(this.target) && this.attackTimer <= 0) {
                this.attack(this.target, game);
                this.attackTimer = GAME_CONFIG.zombie.attackRate;
            }
        }
        
        if (this.attackTimer > 0) this.attackTimer--;
    }
    
    findNearestTarget(soldiers, civilians) {
        let nearest = null;
        let minDistance = Infinity;
        
        // Check soldiers first (priority targets)
        soldiers.forEach(soldier => {
            if (soldier.health > 0) {
                const distance = this.distanceTo(soldier);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = soldier;
                }
            }
        });
        
        // If no soldiers nearby, target civilians
        if (minDistance > 200) {
            civilians.forEach(civilian => {
                const distance = this.distanceTo(civilian);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = civilian;
                }
            });
        }
        
        return nearest;
    }
    
    attack(target, game) {
        target.health -= GAME_CONFIG.zombie.damage;
        
        // Convert civilian to zombie
        if (target instanceof Civilian && target.health <= 0) {
            game.civilians = game.civilians.filter(c => c !== target);
            game.zombies.push(new Zombie(target.x, target.y, 'normal'));
        }
        
        game.updateUI();
    }
    
    render(ctx) {
        if (this.health <= 0) return;
        
        // Draw zombie
        ctx.fillStyle = this.type === 'fast' ? '#ff6600' : '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        if (this.health < this.maxHealth) {
            const barWidth = this.size;
            const barHeight = 2;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.size / 2 - 6;
            
            ctx.fillStyle = '#660000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, (this.health / this.maxHealth) * barWidth, barHeight);
        }
    }
}

class Civilian extends Entity {
    constructor(x, y) {
        super(x, y, GAME_CONFIG.civilian.size);
        this.health = GAME_CONFIG.civilian.health;
        this.maxHealth = GAME_CONFIG.civilian.health;
        this.speed = GAME_CONFIG.civilian.speed;
        this.fleeTarget = null;
        this.rescued = false;
    }
    
    update(game) {
        if (this.health <= 0 || this.rescued) return;
        
        // Flee from nearby zombies
        const nearbyZombie = this.findNearbyZombie(game.zombies);
        if (nearbyZombie) {
            const fleeAngle = this.angleTo(nearbyZombie) + Math.PI; // Opposite direction
            this.x += Math.cos(fleeAngle) * this.speed;
            this.y += Math.sin(fleeAngle) * this.speed;
        } else {
            // Move towards extraction zone
            const ez = GAME_CONFIG.mission.extractionZone;
            const centerX = ez.x + ez.width / 2;
            const centerY = ez.y + ez.height / 2;
            
            if (this.distanceTo({x: centerX, y: centerY}) > 50) {
                this.moveTowards(centerX, centerY, this.speed * 0.5);
            }
        }
        
        // Keep within bounds
        this.x = Math.max(this.size, Math.min(this.x, game.canvas.width - this.size));
        this.y = Math.max(this.size, Math.min(this.y, game.canvas.height - this.size));
    }
    
    findNearbyZombie(zombies) {
        return zombies.find(zombie => 
            zombie.health > 0 && this.distanceTo(zombie) < GAME_CONFIG.civilian.fleeDistance
        );
    }
    
    inExtractionZone(zone) {
        return this.x >= zone.x && this.x <= zone.x + zone.width &&
               this.y >= zone.y && this.y <= zone.y + zone.height;
    }
    
    render(ctx) {
        if (this.health <= 0) return;
        
        // Draw civilian
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            const barWidth = this.size;
            const barHeight = 2;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.size / 2 - 6;
            
            ctx.fillStyle = '#666600';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(barX, barY, (this.health / this.maxHealth) * barWidth, barHeight);
        }
    }
}

class Bullet extends Entity {
    constructor(x, y, angle, shooter) {
        super(x, y, 2);
        this.angle = angle;
        this.speed = 8;
        this.damage = 50;
        this.shooter = shooter;
        this.toRemove = false;
        this.maxDistance = GAME_CONFIG.soldier.range;
        this.traveledDistance = 0;
    }
    
    update(game) {
        // Move bullet
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.traveledDistance += this.speed;
        
        // Check bounds
        if (this.x < 0 || this.x > game.canvas.width || 
            this.y < 0 || this.y > game.canvas.height ||
            this.traveledDistance > this.maxDistance) {
            this.toRemove = true;
            return;
        }
        
        // Check obstacle collision
        if (game.isPositionBlocked(this.x, this.y)) {
            this.toRemove = true;
            return;
        }
        
        // Check zombie collision
        game.zombies.forEach(zombie => {
            if (zombie.health > 0 && this.isColliding(zombie)) {
                zombie.health -= this.damage;
                if (zombie.health <= 0) {
                    game.zombiesEliminated++;
                    game.updateUI();
                }
                this.toRemove = true;
            }
        });
    }
    
    render(ctx) {
        ctx.fillStyle = '#ffff88';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Obstacle extends Entity {
    constructor(x, y, width, height) {
        super(x, y, 0);
        this.width = width;
        this.height = height;
    }
    
    render(ctx) {
        ctx.fillStyle = '#666666';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#888888';
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

// Start the game when page loads
let game;
window.addEventListener('load', () => {
    game = new Game();
});