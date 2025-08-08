// Zombie class - various types of undead enemies
class Zombie extends Entity {
    constructor(x, y, type = 'basic') {
        super(x, y);
        
        this.type = type;
        this.setupType();
        
        // AI properties
        this.target = null;
        this.lastTargetScan = 0;
        this.targetScanInterval = 500; // ms
        this.attackCooldown = 0;
        this.attackDamage = 15;
        this.attackRange = 20;
        this.infectionChance = 0.3;
        
        // Visual properties
        this.animationTime = Math.random() * 1000;
        this.bobAmount = 1;
        this.originalY = y;
    }

    setupType() {
        switch (this.type) {
            case 'basic':
                this.health = 60;
                this.maxHealth = 60;
                this.maxSpeed = 40;
                this.size = 7;
                this.color = '#8B4513';
                this.attackDamage = 15;
                this.infectionChance = 0.3;
                break;
                
            case 'fast':
                this.health = 40;
                this.maxHealth = 40;
                this.maxSpeed = 80;
                this.size = 6;
                this.color = '#FF6B6B';
                this.attackDamage = 12;
                this.infectionChance = 0.2;
                this.targetScanInterval = 300;
                break;
                
            case 'tank':
                this.health = 150;
                this.maxHealth = 150;
                this.maxSpeed = 25;
                this.size = 10;
                this.color = '#4ECDC4';
                this.attackDamage = 25;
                this.infectionChance = 0.4;
                this.targetScanInterval = 700;
                break;
                
            case 'spitter':
                this.health = 45;
                this.maxHealth = 45;
                this.maxSpeed = 35;
                this.size = 7;
                this.color = '#9B59B6';
                this.attackDamage = 8;
                this.attackRange = 80;
                this.infectionChance = 0.6;
                this.targetScanInterval = 400;
                break;
        }
    }

    update(deltaTime, game) {
        super.update(deltaTime);
        
        if (!this.alive) return;
        
        const now = performance.now();
        
        // Update animation
        this.animationTime += deltaTime * 1000;
        
        // Reduce attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime * 1000;
        }
        
        // Scan for targets
        if (now - this.lastTargetScan >= this.targetScanInterval) {
            this.scanForTargets(game);
            this.lastTargetScan = now;
        }
        
        // Move towards target
        if (this.target && this.target.alive) {
            this.moveTowardsTarget(deltaTime, game);
            this.tryAttack(game);
        } else {
            // Wander randomly if no target
            this.wander(deltaTime);
        }
    }

    scanForTargets(game) {
        let nearestTarget = null;
        let nearestDistance = 200; // Detection range
        
        // Priority 1: Look for soldiers
        for (const soldier of game.soldiers) {
            if (!soldier.alive) continue;
            
            const distance = this.position.distanceTo(soldier.position);
            if (distance < nearestDistance) {
                nearestTarget = soldier;
                nearestDistance = distance;
            }
        }
        
        // Priority 2: Look for civilians if no soldiers nearby
        if (!nearestTarget) {
            for (const civilian of game.civilians) {
                if (!civilian.alive || civilian.infected) continue;
                
                const distance = this.position.distanceTo(civilian.position);
                if (distance < nearestDistance) {
                    nearestTarget = civilian;
                    nearestDistance = distance;
                }
            }
        }
        
        this.target = nearestTarget;
    }

    moveTowardsTarget(deltaTime, game) {
        if (!this.target || !this.target.alive) return;
        
        const targetPos = this.target.position;
        const distance = this.position.distanceTo(targetPos);
        
        if (distance > this.attackRange) {
            // Simple obstacle avoidance
            const avoidance = this.avoidObstacles(game.getAllEntities().filter(e => e !== this && e !== this.target), 15);
            const direction = targetPos.clone().subtract(this.position).normalize();
            
            // Add some randomness to movement to make it less predictable
            const randomOffset = new Vector2(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            
            direction.add(avoidance.multiply(0.3)).add(randomOffset).normalize();
            
            const moveVector = direction.multiply(this.maxSpeed * deltaTime * 0.001);
            
            // Avoid barriers
            const adjustedMove = this.avoidBarriers(game.getBarriers(), moveVector);
            
            this.position.add(adjustedMove);
            this.angle = direction.angle();
        }
    }

    tryAttack(game) {
        if (!this.target || !this.target.alive || this.attackCooldown > 0) return;
        
        const distance = this.position.distanceTo(this.target.position);
        
        if (distance <= this.attackRange) {
            this.attack(this.target, game);
        }
    }

    attack(target, game) {
        this.attackCooldown = 1000; // 1 second cooldown
        
        // Deal damage
        target.takeDamage(this.attackDamage);
        
        // Special attack effects based on type
        if (this.type === 'spitter' && distance > this.size + target.size) {
            // Spitter can attack at range
            game.addEffect({
                type: 'acidSpit',
                start: this.position.clone(),
                end: target.position.clone(),
                duration: 300
            });
        }
        
        // Try to infect civilians
        if (target.constructor.name === 'Civilian' && Math.random() < this.infectionChance) {
            target.startInfection();
        }
        
        // Create attack effect
        game.addEffect({
            type: 'attack',
            position: target.position.clone(),
            duration: 200
        });
    }

    wander(deltaTime) {
        // Simple random movement when no target
        if (Math.random() < 0.02) { // Change direction occasionally
            this.angle = Math.random() * Math.PI * 2;
        }
        
        const direction = Vector2.fromAngle(this.angle);
        this.position.add(direction.multiply(this.maxSpeed * 0.3 * deltaTime * 0.001));
    }

    render(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Apply bobbing animation
        const bobOffset = Math.sin(this.animationTime * 0.003) * this.bobAmount;
        ctx.translate(0, bobOffset);
        
        ctx.rotate(this.angle);
        
        // Draw body based on type
        ctx.fillStyle = this.color;
        
        switch (this.type) {
            case 'basic':
                ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
                break;
                
            case 'fast':
                // Draw as diamond for fast zombies
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size, 0);
                ctx.lineTo(0, this.size);
                ctx.lineTo(-this.size, 0);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'tank':
                // Draw as larger circle for tank zombies
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'spitter':
                // Draw as hexagon for spitter zombies
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI * 2) / 6;
                    const x = Math.cos(angle) * this.size;
                    const y = Math.sin(angle) * this.size;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
                break;
        }
        
        // Draw eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-2, -2, 1, 1);
        ctx.fillRect(1, -2, 1, 1);
        
        // Draw health bar for stronger zombies
        if (this.type === 'tank' || this.getHealthPercent() < 1.0) {
            const healthPercent = this.getHealthPercent();
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-this.size/2, -this.size - 5, this.size, 1);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(-this.size/2, -this.size - 5, this.size * healthPercent, 1);
        }
        
        ctx.restore();
    }

    // Static method to create random zombie types
    static createRandom(x, y) {
        const types = ['basic', 'fast', 'tank', 'spitter'];
        const weights = [0.5, 0.25, 0.15, 0.1]; // Spawn probabilities
        
        let random = Math.random();
        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return new Zombie(x, y, types[i]);
            }
        }
        
        return new Zombie(x, y, 'basic');
    }

    // Get zombie info for debugging/UI
    getInfo() {
        return {
            type: this.type,
            health: Math.ceil(this.health),
            maxHealth: this.maxHealth,
            target: this.target ? this.target.constructor.name : 'None'
        };
    }
}