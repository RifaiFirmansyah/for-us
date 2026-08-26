// js/confetti.js - Particle and Confetti Engine for Special Moments
class ConfettiEngine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'confetti-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '99999';
    document.body.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.resize();
    
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(options = {}) {
    const count = options.count || 100;
    const originX = options.x !== undefined ? options.x : window.innerWidth / 2;
    const originY = options.y !== undefined ? options.y : window.innerHeight / 2;
    const colors = options.colors || ['#ff758c', '#ff7eb3', '#fbc2eb', '#a18cd1', '#ffd166', '#06d6a0', '#118ab2'];
    const shapes = options.shapes || ['circle', 'rect', 'heart'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 5,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        alpha: 1,
        decay: Math.random() * 0.015 + 0.008,
        gravity: 0.25
      });
    }

    if (!this.animationId) {
      this.animate();
    }
  }

  drawHeart(ctx, x, y, size, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(0, topCurveHeight);
    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size, 0, size);
    ctx.bezierCurveTo(0, size, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rotationSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > this.canvas.height + 20) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.shape === 'heart') {
        this.drawHeart(this.ctx, p.x, p.y, p.size, p.color, p.alpha);
      } else {
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        }
      }
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  celebrate() {
    // Cannon from left & right
    this.burst({ x: window.innerWidth * 0.2, y: window.innerHeight * 0.8, count: 80 });
    setTimeout(() => {
      this.burst({ x: window.innerWidth * 0.8, y: window.innerHeight * 0.8, count: 80 });
    }, 250);
    setTimeout(() => {
      this.burst({ x: window.innerWidth * 0.5, y: window.innerHeight * 0.4, count: 120, shapes: ['heart', 'circle', 'rect'] });
    }, 500);
  }
}

window.confetti = new ConfettiEngine();
