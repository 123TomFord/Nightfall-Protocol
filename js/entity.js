// Base Entity class for all game objects
class Entity {
    constructor(x, y) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.size = 8;
        this.maxSpeed = 100;
        this.health = 100;
        this.maxHealth = 100;
        this.alive = true;
        this.color = '#ffffff';
        this.angle = 0;
        this.target = null;
        this.lastUpdate = 0;
    }

    // Update the entity
    update(deltaTime) {
        if (!this.alive) return;

        // Apply velocity
        this.position.add(Vector2.fromAngle(0, this.velocity.x * deltaTime));
        this.position.add(Vector2.fromAngle(Math.PI / 2, this.velocity.y * deltaTime));

        // Store last update time
        this.lastUpdate = performance.now();
    }

    // Render the entity
    render(ctx) {
        if (!this.alive) return;

        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.angle);
        
        // Default circle rendering
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    // Check collision with another entity
    collidesWith(other) {
        const distance = this.position.distanceTo(other.position);
        return distance < (this.size + other.size);
    }

    // Take damage
    takeDamage(amount) {
        if (!this.alive) return;
        
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
    }

    // Heal the entity
    heal(amount) {
        if (!this.alive) return;
        
        this.health = Math.min(this.health + amount, this.maxHealth);
    }

    // Get health percentage
    getHealthPercent() {
        return this.health / this.maxHealth;
    }

    // Move towards a target position
    moveTowards(target, speed, deltaTime) {
        const direction = target.clone().subtract(this.position).normalize();
        const moveDistance = Math.min(speed * deltaTime, this.position.distanceTo(target));
        
        this.position.add(direction.multiply(moveDistance));
    }

    // Look at a target position
    lookAt(target) {
        this.angle = this.position.angleTo(target);
    }

    // Check if entity is within a certain distance of target
    isNear(target, distance) {
        return this.position.distanceTo(target) <= distance;
    }

    // Get the entity's bounds for collision detection
    getBounds() {
        return {
            left: this.position.x - this.size,
            right: this.position.x + this.size,
            top: this.position.y - this.size,
            bottom: this.position.y + this.size
        };
    }

    // Check if entity is within screen bounds
    isOnScreen(screenWidth, screenHeight) {
        const bounds = this.getBounds();
        return bounds.right >= 0 && bounds.left <= screenWidth &&
               bounds.bottom >= 0 && bounds.top <= screenHeight;
    }

    // Simple pathfinding - avoid obstacles
    avoidObstacles(obstacles, avoidanceRadius = 50) {
        const avoidanceForce = new Vector2(0, 0);
        
        for (const obstacle of obstacles) {
            if (obstacle === this) continue;
            
            const distance = this.position.distanceTo(obstacle.position);
            if (distance < avoidanceRadius) {
                const avoidDirection = this.position.clone().subtract(obstacle.position).normalize();
                const strength = (avoidanceRadius - distance) / avoidanceRadius;
                avoidanceForce.add(avoidDirection.multiply(strength));
            }
        }
        
        return avoidanceForce;
    }

    // Check collision with rectangular barriers
    checkBarrierCollision(barriers) {
        for (const barrier of barriers) {
            if (this.position.x + this.size > barrier.x &&
                this.position.x - this.size < barrier.x + barrier.width &&
                this.position.y + this.size > barrier.y &&
                this.position.y - this.size < barrier.y + barrier.height) {
                return barrier;
            }
        }
        return null;
    }

    // Avoid barrier collision by adjusting position
    avoidBarriers(barriers, moveVector) {
        const testPosition = this.position.clone().add(moveVector);
        
        for (const barrier of barriers) {
            if (testPosition.x + this.size > barrier.x &&
                testPosition.x - this.size < barrier.x + barrier.width &&
                testPosition.y + this.size > barrier.y &&
                testPosition.y - this.size < barrier.y + barrier.height) {
                
                // Calculate push-out direction
                const barrierCenter = new Vector2(
                    barrier.x + barrier.width / 2,
                    barrier.y + barrier.height / 2
                );
                
                const pushDirection = this.position.clone().subtract(barrierCenter).normalize();
                
                // Adjust move vector to slide along barrier
                const dot = Vector2.dot(moveVector, pushDirection);
                if (dot < 0) {
                    moveVector.subtract(pushDirection.multiply(dot));
                }
            }
        }
        
        return moveVector;
    }

    // Cleanup method
    destroy() {
        this.alive = false;
        this.target = null;
    }
}