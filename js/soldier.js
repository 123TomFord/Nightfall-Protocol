// Soldier class - represents spec ops team members
class Soldier extends Entity {
    constructor(x, y, name = 'Soldier') {
        super(x, y);
        
        this.name = name;
        this.size = 6;
        this.maxSpeed = 120;
        this.color = '#00ff00';
        this.health = 100;
        this.maxHealth = 100;
        
        // Combat properties
        this.weapon = {
            damage: 25,
            range: 150,
            fireRate: 300, // ms between shots
            magazineSize: 30,
            ammo: 30,
            totalAmmo: 120,
            reloadTime: 2000, // ms
            lastShot: 0,
            reloading: false,
            reloadStartTime: 0
        };
        
        // Movement properties
        this.isSprinting = false;
        this.sprintMultiplier = 1.8;
        this.formationOffset = new Vector2(0, 0);
        this.orderPosition = null;
        this.mode = 'follow'; // follow, hold, overwatch
        
        // AI properties
        this.lastTargetScan = 0;
        this.targetScanInterval = 200; // ms
        this.currentTarget = null;
        this.alertLevel = 0; // 0-1, affects behavior
        
        // Visual properties
        this.bodyAngle = 0;
        this.weaponAngle = 0;
        this.muzzleFlash = false;
        this.muzzleFlashTime = 0;
    }

    update(deltaTime, game) {
        super.update(deltaTime);
        
        if (!this.alive) return;
        
        const now = performance.now();
        
        // Update weapon state
        this.updateWeapon(now);
        
        // Update muzzle flash
        if (this.muzzleFlash && now - this.muzzleFlashTime > 100) {
            this.muzzleFlash = false;
        }
        
        // AI behavior based on mode
        this.updateBehavior(deltaTime, game, now);
        
        // Movement
        this.updateMovement(deltaTime, game);
        
        // Combat
        this.updateCombat(deltaTime, game, now);
    }

    updateWeapon(now) {
        // Handle reloading
        if (this.weapon.reloading) {
            if (now - this.weapon.reloadStartTime >= this.weapon.reloadTime) {
                this.finishReload();
            }
        } else if (this.weapon.ammo === 0 && this.weapon.totalAmmo > 0) {
            // Auto-reload when empty
            this.startReload();
        }
    }

    updateBehavior(deltaTime, game, now) {
        // Scan for targets periodically
        if (now - this.lastTargetScan >= this.targetScanInterval) {
            this.scanForTargets(game);
            this.lastTargetScan = now;
        }
        
        // Update alert level based on nearby threats
        this.updateAlertLevel(game);
    }

    updateMovement(deltaTime, game) {
        let currentSpeed = this.isSprinting ? this.maxSpeed * this.sprintMultiplier : this.maxSpeed;
        
        if (this.mode === 'follow' && this.orderPosition) {
            // Move to ordered position with formation offset
            const targetPos = this.orderPosition.clone().add(this.formationOffset);
            const distance = this.position.distanceTo(targetPos);
            
            if (distance > 10) {
                // Simple obstacle avoidance
                const avoidance = this.avoidObstacles(game.getAllEntities(), 25);
                const direction = targetPos.clone().subtract(this.position).normalize();
                direction.add(avoidance.multiply(0.5)).normalize();
                
                const moveVector = direction.multiply(currentSpeed * deltaTime * 0.001);
                
                // Check for barrier collision
                const barrier = this.checkBarrierCollision(game.getBarriers());
                if (barrier) {
                    // Slow movement when on barrier
                    currentSpeed *= 0.3;
                    moveVector.multiply(0.3);
                }
                
                // Avoid barrier collisions
                const adjustedMove = this.avoidBarriers(game.getBarriers(), moveVector);
                
                this.position.add(adjustedMove);
                this.bodyAngle = direction.angle();
            }
        }
    }

    updateCombat(deltaTime, game, now) {
        if (this.isSprinting || this.weapon.reloading) return;
        
        // Find and engage targets
        if (this.currentTarget && this.currentTarget.alive) {
            const distance = this.position.distanceTo(this.currentTarget.position);
            
            if (distance <= this.weapon.range) {
                // Aim at target
                this.weaponAngle = this.position.angleTo(this.currentTarget.position);
                
                // Fire if possible
                if (this.canFire(now)) {
                    this.fire(this.currentTarget, game);
                }
            } else {
                this.currentTarget = null;
            }
        }
    }

    scanForTargets(game) {
        let nearestTarget = null;
        let nearestDistance = this.weapon.range;
        
        // Look for zombies first
        for (const zombie of game.zombies) {
            if (!zombie.alive) continue;
            
            const distance = this.position.distanceTo(zombie.position);
            if (distance < nearestDistance) {
                nearestTarget = zombie;
                nearestDistance = distance;
            }
        }
        
        this.currentTarget = nearestTarget;
    }

    updateAlertLevel(game) {
        let nearbyThreats = 0;
        
        for (const zombie of game.zombies) {
            if (zombie.alive && this.position.distanceTo(zombie.position) < 100) {
                nearbyThreats++;
            }
        }
        
        this.alertLevel = Math.min(nearbyThreats / 5, 1.0);
    }

    canFire(now) {
        return !this.weapon.reloading && 
               this.weapon.ammo > 0 && 
               now - this.weapon.lastShot >= this.weapon.fireRate;
    }

    fire(target, game) {
        if (!this.canFire(performance.now())) return false;
        
        const now = performance.now();
        this.weapon.lastShot = now;
        this.weapon.ammo--;
        
        // Create muzzle flash
        this.muzzleFlash = true;
        this.muzzleFlashTime = now;
        
        // Calculate hit chance based on distance and alert level
        const distance = this.position.distanceTo(target.position);
        const accuracy = Math.max(0.3, 1.0 - (distance / this.weapon.range) * 0.5 - this.alertLevel * 0.2);
        
        if (Math.random() < accuracy) {
            target.takeDamage(this.weapon.damage);
            
            // Create bullet trail effect
            game.addEffect({
                type: 'bulletTrail',
                start: this.position.clone(),
                end: target.position.clone(),
                duration: 100
            });
        }
        
        return true;
    }

    startReload() {
        if (this.weapon.totalAmmo === 0 || this.weapon.ammo === this.weapon.magazineSize) return;
        
        this.weapon.reloading = true;
        this.weapon.reloadStartTime = performance.now();
    }

    finishReload() {
        const ammoNeeded = this.weapon.magazineSize - this.weapon.ammo;
        const ammoToLoad = Math.min(ammoNeeded, this.weapon.totalAmmo);
        
        this.weapon.ammo += ammoToLoad;
        this.weapon.totalAmmo -= ammoToLoad;
        this.weapon.reloading = false;
    }

    setMode(mode) {
        this.mode = mode;
        
        if (mode === 'hold') {
            this.orderPosition = this.position.clone();
        }
    }

    setSprint(sprinting) {
        this.isSprinting = sprinting;
        
        // Can't fire while sprinting
        if (sprinting && this.currentTarget) {
            this.currentTarget = null;
        }
    }

    setFormationOffset(offset) {
        this.formationOffset = offset.clone();
    }

    moveTo(position) {
        this.orderPosition = position.clone();
    }

    render(ctx) {
        if (!this.alive) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Draw body
        ctx.rotate(this.bodyAngle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size/2, -this.size/2, this.size, this.size);
        
        // Draw weapon
        ctx.rotate(this.weaponAngle - this.bodyAngle);
        ctx.fillStyle = '#666666';
        ctx.fillRect(0, -1, this.size + 3, 2);
        
        // Draw muzzle flash
        if (this.muzzleFlash) {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.size + 3, -2, 4, 4);
        }
        
        // Draw health bar
        ctx.rotate(-this.weaponAngle);
        const healthPercent = this.getHealthPercent();
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-this.size/2, -this.size - 8, this.size, 2);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-this.size/2, -this.size - 8, this.size * healthPercent, 2);
        
        // Draw name
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 0, -this.size - 12);
        
        ctx.restore();
    }

    // Get current ammo status for UI
    getAmmoStatus() {
        return {
            current: this.weapon.ammo,
            total: this.weapon.totalAmmo,
            reloading: this.weapon.reloading
        };
    }
}