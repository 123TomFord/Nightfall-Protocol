// Vector2 class for 2D math operations
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    // Create a copy of this vector
    clone() {
        return new Vector2(this.x, this.y);
    }

    // Set the values of this vector
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    // Add another vector to this one
    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    // Subtract another vector from this one
    subtract(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }

    // Multiply this vector by a scalar
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    // Divide this vector by a scalar
    divide(scalar) {
        if (scalar !== 0) {
            this.x /= scalar;
            this.y /= scalar;
        }
        return this;
    }

    // Get the magnitude (length) of this vector
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    // Get the squared magnitude (faster than magnitude for comparisons)
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }

    // Normalize this vector to unit length
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.divide(mag);
        }
        return this;
    }

    // Get the distance to another vector
    distanceTo(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Get the squared distance to another vector (faster for comparisons)
    distanceToSquared(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return dx * dx + dy * dy;
    }

    // Get the angle of this vector in radians
    angle() {
        return Math.atan2(this.y, this.x);
    }

    // Get the angle to another vector in radians
    angleTo(vector) {
        return Math.atan2(vector.y - this.y, vector.x - this.x);
    }

    // Rotate this vector by an angle in radians
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x * cos - this.y * sin;
        const y = this.x * sin + this.y * cos;
        this.x = x;
        this.y = y;
        return this;
    }

    // Linear interpolation between this vector and another
    lerp(vector, t) {
        this.x += (vector.x - this.x) * t;
        this.y += (vector.y - this.y) * t;
        return this;
    }

    // Static methods for creating vectors
    static zero() {
        return new Vector2(0, 0);
    }

    static one() {
        return new Vector2(1, 1);
    }

    static up() {
        return new Vector2(0, -1);
    }

    static down() {
        return new Vector2(0, 1);
    }

    static left() {
        return new Vector2(-1, 0);
    }

    static right() {
        return new Vector2(1, 0);
    }

    // Static method to create a vector from an angle and magnitude
    static fromAngle(angle, magnitude = 1) {
        return new Vector2(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }

    // Static method to calculate distance between two vectors
    static distance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Static method to calculate dot product
    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y;
    }

    // Static method to linear interpolate between two vectors
    static lerp(v1, v2, t) {
        return new Vector2(
            v1.x + (v2.x - v1.x) * t,
            v1.y + (v2.y - v1.y) * t
        );
    }
}