// Civilian class - innocent people that need to be rescued
class Civilian extends Entity {
    constructor(x, y) {
        super(x, y);
        
        this.size = 5;
        this.maxSpeed = 60;
        this.color = '#87CEEB';
        this.health = 50;
        this.maxHealth = 50;
        
        // Civilian-specific properties
        this.infected = false;
        this.infectionTime = 0;
        this.infectionDuration = 5000; // 5 seconds to turn
        this.rescued = false;
        this.panicLevel = 0; // 0-1, affects behavior
        this.fleeTarget = null;
        
        // AI properties
        this.lastTargetScan = 0;
        this.targetScanInterval = 400;
        this.wanderDirection = Math.random() * Math.PI * 2;
        this.wanderTimer = 0;
        this.wanderDuration = 2000 + Math.random() * 3000;
        
        // Visual properties
        this.animationTime = Math.random() * 1000;
        this.fearShakeAmount = 0;
    }

    update(deltaTime, game) {
        super.update(deltaTime);
        
        if (!this.alive) return;
        
        const now = performance.now();
        
        // Update animation
        this.animationTime += deltaTime * 1000;
        
        // Handle infection
        if (this.infected) {
            this.updateInfection(deltaTime, game);
            return; // Skip other behaviors when infected
        }
        
        // Scan for threats and soldiers
        if (now - this.lastTargetScan >= this.targetScanInterval) {
            this.scanEnvironment(game);
            this.lastTargetScan = now;
        }
        
        // Update panic level
        this.updatePanicLevel(game);
        
        // Movement behavior
        if (this.fleeTarget) {
            this.fleeFromThreat(deltaTime, game);
        } else if (this.panicLevel > 0.3) {
            this.panicMovement(deltaTime, game);
        } else {
            this.normalMovement(deltaTime, game);
        }
    }

    updateInfection(deltaTime, game) {
        this.infectionTime += deltaTime * 1000;
        
        if (this.infectionTime >= this.infectionDuration) {
            // Transform into zombie
            this.turnIntoZombie(game);
        } else {
            // Show infection progress
            this.color = this.interpolateColor('#87CEEB', '#8B4513', this.infectionTime / this.infectionDuration);
        }
    }

    scanEnvironment(game) {
        let nearestThreat = null;
        let nearestThreatDistance = 100; // Fear radius
        let nearestSoldier = null;
        let nearestSoldierDistance = 150; // Rescue radius
        
        // Look for zombie threats
        for (const zombie of game.zombies) {
            if (!zombie.alive) continue;
            
            const distance = this.position.distanceTo(zombie.position);
            if (distance < nearestThreatDistance) {
                nearestThreat = zombie;
                nearestThreatDistance = distance;
            }
        }
        
        // Look for soldiers (safety)
        for (const soldier of game.soldiers) {
            if (!soldier.alive) continue;
            
            const distance = this.position.distanceTo(soldier.position);
            if (distance < nearestSoldierDistance) {
                nearestSoldier = soldier;
                nearestSoldierDistance = distance;
            }
        }
        
        this.fleeTarget = nearestThreat;
        
        // Check if rescued
        if (nearestSoldier && nearestSoldierDistance < 20) {
            this.rescued = true;
        }
    }

    updatePanicLevel(game) {
        let targetPanic = 0;
        
        // Increase panic based on nearby zombies
        for (const zombie of game.zombies) {
            if (!zombie.alive) continue;
            
            const distance = this.position.distanceTo(zombie.position);
            if (distance < 80) {
                targetPanic += (80 - distance) / 80 * 0.5;
            }
        }
        
        // Decrease panic if soldiers are nearby
        for (const soldier of game.soldiers) {
            if (!soldier.alive) continue;
            
            const distance = this.position.distanceTo(soldier.position);
            if (distance < 50) {
                targetPanic -= (50 - distance) / 50 * 0.3;
            }
        }
        
        targetPanic = Math.max(0, Math.min(1, targetPanic));
        
        // Smooth panic level changes
        this.panicLevel += (targetPanic - this.panicLevel) * 0.1;
        
        // Update fear shake
        this.fearShakeAmount = this.panicLevel * 2;
    }

    fleeFromThreat(deltaTime, game) {
        if (!this.fleeTarget || !this.fleeTarget.alive) {
            this.fleeTarget = null;
            return;
        }
        
        const fleeDirection = this.position.clone().subtract(this.fleeTarget.position).normalize();
        
        // Add some randomness to avoid getting stuck
        const randomOffset = new Vector2(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
        );
        fleeDirection.add(randomOffset).normalize();
        
        // Avoid obstacles while fleeing
        const avoidance = this.avoidObstacles(game.getAllEntities(), 20);
        fleeDirection.add(avoidance.multiply(0.4)).normalize();
        
        const fleeSpeed = this.maxSpeed * (1 + this.panicLevel);
        const moveVector = fleeDirection.multiply(fleeSpeed * deltaTime * 0.001);
        
        // Avoid barriers
        const adjustedMove = this.avoidBarriers(game.getBarriers(), moveVector);
        
        this.position.add(adjustedMove);
    }

    panicMovement(deltaTime, game) {
        // Erratic movement when panicked
        if (Math.random() < 0.1) {
            this.wanderDirection += (Math.random() - 0.5) * Math.PI;
        }
        
        const direction = Vector2.fromAngle(this.wanderDirection);
        const panicSpeed = this.maxSpeed * this.panicLevel;
        const moveVector = direction.multiply(panicSpeed * deltaTime * 0.001);
        
        // Avoid barriers
        const adjustedMove = this.avoidBarriers(game.getBarriers(), moveVector);
        
        this.position.add(adjustedMove);
    }

    normalMovement(deltaTime, game) {
        this.wanderTimer += deltaTime * 1000;
        
        if (this.wanderTimer >= this.wanderDuration) {
            // Change direction
            this.wanderDirection = Math.random() * Math.PI * 2;
            this.wanderTimer = 0;
            this.wanderDuration = 2000 + Math.random() * 3000;
        }
        
        const direction = Vector2.fromAngle(this.wanderDirection);
        const walkSpeed = this.maxSpeed * 0.3;
        const moveVector = direction.multiply(walkSpeed * deltaTime * 0.001);
        
        // Avoid barriers
        const adjustedMove = this.avoidBarriers(game.getBarriers(), moveVector);
        
        this.position.add(adjustedMove);
    }

    startInfection() {
        if (this.infected || !this.alive) return;
        
        this.infected = true;
        this.infectionTime = 0;
    }

    turnIntoZombie(game) {
        // Create a new zombie at this position
        const zombie = new Zombie(this.position.x, this.position.y, 'basic');
        game.addZombie(zombie);
        
        // Remove this civilian
        this.alive = false;
        
        // Add transformation effect
        game.addEffect({
            type: 'transformation',
            position: this.position.clone(),
            duration: 500
        });
    }

    render(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Apply fear shake
        if (this.fearShakeAmount > 0) {
            const shakeX = (Math.random() - 0.5) * this.fearShakeAmount;
            const shakeY = (Math.random() - 0.5) * this.fearShakeAmount;
            ctx.translate(shakeX, shakeY);
        }
        
        // Draw body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes based on state
        ctx.fillStyle = this.infected ? '#ff0000' : '#000000';
        ctx.fillRect(-1.5, -1, 1, 1);
        ctx.fillRect(0.5, -1, 1, 1);
        
        // Draw infection progress
        if (this.infected) {
            const progress = this.infectionTime / this.infectionDuration;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 2, -Math.PI/2, -Math.PI/2 + progress * Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw rescue indicator
        if (this.rescued) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw panic indicator
        if (this.panicLevel > 0.5) {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(-1, -this.size - 8, 2, 3);
        }
        
        ctx.restore();
    }

    // Helper method to interpolate between colors
    interpolateColor(color1, color2, factor) {
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Get civilian status for UI/debugging
    getStatus() {
        return {
            infected: this.infected,
            rescued: this.rescued,
            panicLevel: Math.round(this.panicLevel * 100),
            health: Math.ceil(this.health)
        };
    }
}