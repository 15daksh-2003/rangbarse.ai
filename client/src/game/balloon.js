let nextId = 0;

export class Balloon {
  constructor({ x, y, vx, vy, radius, color }) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.state = 'active'; // active | caught | thrown | hit | missed
    this.opacity = 1;
    this.attachedHand = null;
  }

  update() {
    if (this.state === 'active') {
      this.x += this.vx;
      this.y += this.vy;
      this.radius += 0.3; // Grow as it "approaches"
    } else if (this.state === 'thrown') {
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  isOffScreen(w, h) {
    return (
      this.x < -this.radius * 2 ||
      this.x > w + this.radius * 2 ||
      this.y < -this.radius * 2 ||
      this.y > h + this.radius * 2
    );
  }
}
