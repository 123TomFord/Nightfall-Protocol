// Main Game class - handles game state, entities, and rendering
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.gameTime = 0;
        
        // Entities
        this.soldiers = [];
        this.zombies = [];
        this.civilians = [];
        this.effects = [];
        
        // Game settings
        this.selectedSoldiers = [];
        this.currentMode = 'follow';
        this.sprintMode = false;
        
        // Mission objectives
        this.objectives = {
            zombiesKilled: 0,
            civiliansRescued: 0,
            civiliansLost: 0,
            totalZombies: 0,
            totalCivilians: 0
        };
        
        // Spawn settings
        this.zombieSpawnTimer = 0;
        this.zombieSpawnInterval = 3000; // ms
        this.maxZombies = 20;
        
        // Input handling
        this.mousePos = new Vector2(0, 0);
        this.keys = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createInitialEntities();
        this.updateUI();
        this.start();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // UI button events
        document.getElementById('sprint-toggle').addEventListener('click', () => this.toggleSprint());
        document.getElementById('hold-position').addEventListener('click', () => this.setMode('hold'));
        document.getElementById('follow-mode').addEventListener('click', () => this.setMode('follow'));
        document.getElementById('overwatch').addEventListener('click', () => this.setMode('overwatch'));
    }

    createInitialEntities() {
        // Create fire team (3 soldiers)
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const soldier1 = new Soldier(centerX - 20, centerY, 'Alpha');
        const soldier2 = new Soldier(centerX, centerY + 15, 'Bravo');
        const soldier3 = new Soldier(centerX + 20, centerY, 'Charlie');
        
        // Set formation offsets
        soldier1.setFormationOffset(new Vector2(-20, 0));
        soldier2.setFormationOffset(new Vector2(0, 15));
        soldier3.setFormationOffset(new Vector2(20, 0));
        
        this.soldiers.push(soldier1, soldier2, soldier3);
        this.selectedSoldiers = [...this.soldiers];
        
        // Create barriers/obstacles
        this.barriers = [];
        this.createBarriers();
        
        // Create initial civilians
        for (let i = 0; i < 8; i++) {
            const x = Math.random() * (this.canvas.width - 100) + 50;
            const y = Math.random() * (this.canvas.height - 100) + 50;
            
            // Don't spawn too close to soldiers or barriers
            const distanceToSoldiers = Math.min(...this.soldiers.map(s => 
                Vector2.distance(new Vector2(x, y), s.position)
            ));
            
            const distanceToBarriers = Math.min(...this.barriers.map(b => 
                Vector2.distance(new Vector2(x, y), new Vector2(b.x + b.width/2, b.y + b.height/2))
            ));
            
            if (distanceToSoldiers > 100 && distanceToBarriers > 50) {
                this.civilians.push(new Civilian(x, y));
            }
        }
        
        this.objectives.totalCivilians = this.civilians.length;
        
        // Create initial zombies
        for (let i = 0; i < 5; i++) {
            this.spawnZombie();
        }
    }

    createBarriers() {
        // Create some strategic barriers
        const barriers = [
            { x: 200, y: 150, width: 80, height: 20 },
            { x: 500, y: 250, width: 20, height: 100 },
            { x: 800, y: 200, width: 60, height: 20 },
            { x: 300, y: 400, width: 100, height: 20 },
            { x: 600, y: 500, width: 20, height: 80 },
            { x: 900, y: 450, width: 80, height: 20 }
        ];
        
        this.barriers = barriers;
    }

    spawnZombie() {
        if (this.zombies.filter(z => z.alive).length >= this.maxZombies) return;
        
        // Spawn at random edge of screen
        let x, y;
        const edge = Math.floor(Math.random() * 4);
        
        switch (edge) {
            case 0: // Top
                x = Math.random() * this.canvas.width;
                y = -20;
                break;
            case 1: // Right
                x = this.canvas.width + 20;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // Bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 20;
                break;
            case 3: // Left
                x = -20;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        const zombie = Zombie.createRandom(x, y);
        this.zombies.push(zombie);
        this.objectives.totalZombies++;
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clickPos = new Vector2(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
        
        // Move selected soldiers to clicked position
        for (const soldier of this.selectedSoldiers) {
            soldier.moveTo(clickPos);
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.set(
            e.clientX - rect.left,
            e.clientY - rect.top
        );
    }

    handleKeyDown(e) {
        this.keys[e.key.toLowerCase()] = true;
        
        switch (e.key.toLowerCase()) {
            case 's':
                this.toggleSprint();
                break;
            case 'h':
                this.setMode('hold');
                break;
            case 'f':
                this.setMode('follow');
                break;
            case 'o':
                this.setMode('overwatch');
                break;
            case ' ':
                this.togglePause();
                e.preventDefault();
                break;
        }
    }

    handleKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
    }

    toggleSprint() {
        this.sprintMode = !this.sprintMode;
        
        for (const soldier of this.selectedSoldiers) {
            soldier.setSprint(this.sprintMode);
        }
        
        this.updateActionBarUI();
    }

    setMode(mode) {
        this.currentMode = mode;
        
        for (const soldier of this.selectedSoldiers) {
            soldier.setMode(mode);
        }
        
        this.updateActionBarUI();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            document.body.classList.add('game-paused');
        } else {
            document.body.classList.remove('game-paused');
        }
    }

    start() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;
        
        if (!this.isPaused) {
            this.update(deltaTime);
        }
        
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        this.gameTime += deltaTime;
        
        // Update all entities
        this.updateEntities(deltaTime);
        
        // Spawn zombies periodically
        this.updateZombieSpawning(deltaTime);
        
        // Update effects
        this.updateEffects(deltaTime);
        
        // Check win/lose conditions
        this.checkGameState();
        
        // Update UI
        this.updateUI();
    }

    updateEntities(deltaTime) {
        // Update soldiers
        for (const soldier of this.soldiers) {
            soldier.update(deltaTime, this);
        }
        
        // Update zombies
        for (const zombie of this.zombies) {
            zombie.update(deltaTime, this);
            
            // Remove dead zombies
            if (!zombie.alive) {
                this.objectives.zombiesKilled++;
            }
        }
        this.zombies = this.zombies.filter(z => z.alive);
        
        // Update civilians
        for (const civilian of this.civilians) {
            civilian.update(deltaTime, this);
            
            if (civilian.rescued && civilian.alive) {
                this.objectives.civiliansRescued++;
                civilian.alive = false; // Remove rescued civilians
            } else if (!civilian.alive) {
                this.objectives.civiliansLost++;
            }
        }
        this.civilians = this.civilians.filter(c => c.alive);
    }

    updateZombieSpawning(deltaTime) {
        this.zombieSpawnTimer += deltaTime * 1000;
        
        if (this.zombieSpawnTimer >= this.zombieSpawnInterval) {
            this.spawnZombie();
            this.zombieSpawnTimer = 0;
            
            // Gradually decrease spawn interval to increase difficulty
            this.zombieSpawnInterval = Math.max(1500, this.zombieSpawnInterval - 50);
        }
    }

    updateEffects(deltaTime) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.time += deltaTime * 1000;
            
            if (effect.time >= effect.duration) {
                this.effects.splice(i, 1);
            }
        }
    }

    checkGameState() {
        const aliveSoldiers = this.soldiers.filter(s => s.alive).length;
        const aliveZombies = this.zombies.filter(z => z.alive).length;
        const aliveCivilians = this.civilians.filter(c => c.alive).length;
        
        // Lose condition: all soldiers dead
        if (aliveSoldiers === 0) {
            this.gameOver(false);
        }
        
        // Win condition: all zombies dead and all remaining civilians rescued
        if (aliveZombies === 0 && aliveCivilians === 0) {
            this.gameOver(true);
        }
    }

    gameOver(won) {
        this.isPaused = true;
        
        const message = won ? 'MISSION ACCOMPLISHED!' : 'MISSION FAILED!';
        const stats = `
            Zombies Eliminated: ${this.objectives.zombiesKilled}
            Civilians Rescued: ${this.objectives.civiliansRescued}
            Civilians Lost: ${this.objectives.civiliansLost}
        `;
        
        setTimeout(() => {
            alert(message + '\n\n' + stats);
        }, 100);
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw entities
        this.renderEntities();
        
        // Draw effects
        this.renderEffects();
        
        // Draw UI overlays
        this.renderGameUI();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 1;
        
        const gridSize = 50;
        
        for (let x = 0; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }

    renderEntities() {
        // Draw barriers first
        this.renderBarriers();
        
        // Draw civilians (background)
        for (const civilian of this.civilians) {
            civilian.render(this.ctx);
        }
        
        // Draw zombies
        for (const zombie of this.zombies) {
            zombie.render(this.ctx);
        }
        
        // Draw soldiers last (foreground)
        for (const soldier of this.soldiers) {
            soldier.render(this.ctx);
        }
    }

    renderBarriers() {
        this.ctx.fillStyle = '#666666';
        this.ctx.strokeStyle = '#999999';
        this.ctx.lineWidth = 2;
        
        for (const barrier of this.barriers) {
            this.ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
            this.ctx.strokeRect(barrier.x, barrier.y, barrier.width, barrier.height);
        }
    }

    renderEffects() {
        for (const effect of this.effects) {
            const alpha = 1 - (effect.time / effect.duration);
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            switch (effect.type) {
                case 'bulletTrail':
                    this.ctx.strokeStyle = '#ffff00';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(effect.start.x, effect.start.y);
                    this.ctx.lineTo(effect.end.x, effect.end.y);
                    this.ctx.stroke();
                    break;
                    
                case 'attack':
                    this.ctx.fillStyle = '#ff4444';
                    this.ctx.beginPath();
                    this.ctx.arc(effect.position.x, effect.position.y, 5 + (effect.time / 50), 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
                    
                case 'transformation':
                    this.ctx.strokeStyle = '#8B4513';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(effect.position.x, effect.position.y, effect.time / 10, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
                    
                case 'acidSpit':
                    this.ctx.fillStyle = '#9B59B6';
                    const progress = effect.time / effect.duration;
                    const currentPos = Vector2.lerp(effect.start, effect.end, progress);
                    this.ctx.beginPath();
                    this.ctx.arc(currentPos.x, currentPos.y, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                    break;
            }
            
            this.ctx.restore();
        }
    }

    renderGameUI() {
        // Draw cursor crosshair
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.mousePos.x - 10, this.mousePos.y);
        this.ctx.lineTo(this.mousePos.x + 10, this.mousePos.y);
        this.ctx.moveTo(this.mousePos.x, this.mousePos.y - 10);
        this.ctx.lineTo(this.mousePos.x, this.mousePos.y + 10);
        this.ctx.stroke();
    }

    updateUI() {
        // Update mission objective
        const objectiveText = `Eliminate zombies (${this.objectives.zombiesKilled} killed) • Rescue civilians (${this.objectives.civiliansRescued} rescued, ${this.objectives.civiliansLost} lost)`;
        document.getElementById('objective').textContent = objectiveText;
        
        // Update team status
        this.soldiers.forEach((soldier, index) => {
            const memberElement = document.getElementById(`soldier-${index + 1}`);
            if (memberElement) {
                const healthFill = memberElement.querySelector('.health-fill');
                const ammoCount = memberElement.querySelector('.ammo-count');
                const ammoStatus = soldier.getAmmoStatus();
                
                healthFill.style.width = `${soldier.getHealthPercent() * 100}%`;
                ammoCount.textContent = soldier.weapon.reloading ? 'RELOAD' : `${ammoStatus.current}/${ammoStatus.total}`;
                
                // Update color based on health
                if (soldier.getHealthPercent() < 0.3) {
                    healthFill.style.background = '#ff4444';
                } else if (soldier.getHealthPercent() < 0.6) {
                    healthFill.style.background = '#ffaa00';
                } else {
                    healthFill.style.background = '#44ff44';
                }
            }
        });
    }

    updateActionBarUI() {
        // Update button states
        document.querySelectorAll('.action-btn').forEach(btn => btn.classList.remove('active'));
        
        if (this.sprintMode) {
            document.getElementById('sprint-toggle').classList.add('active');
        }
        
        document.getElementById(this.currentMode === 'hold' ? 'hold-position' : 
                             this.currentMode === 'overwatch' ? 'overwatch' : 'follow-mode')
                             .classList.add('active');
    }

    addEffect(effect) {
        effect.time = 0;
        this.effects.push(effect);
    }

    addZombie(zombie) {
        this.zombies.push(zombie);
    }

    getAllEntities() {
        return [...this.soldiers, ...this.zombies, ...this.civilians];
    }

    getBarriers() {
        return this.barriers;
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});