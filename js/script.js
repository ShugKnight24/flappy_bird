"use strict";

// Game Configuration
const CONFIG = {
  // Physics
  GRAVITY: 0.4, // Gravity acceleration (pixels per frame²)
  FLAP_VELOCITY: -7, // Upward velocity when flapping
  MAX_FALL_SPEED: 8, // Terminal velocity
  MAX_RISE_SPEED: -10, // Maximum upward speed

  // Pipe settings
  GAP_PIXELS: 120, // Gap between top and bottom pipes
  TOP_PIPE_HEIGHT: 242, // Height of pipe image
  PIPE_SPEED: 2, // How fast pipes move left
  PIPE_SPAWN_DISTANCE: 180, // Distance between pipe spawns
  MIN_PIPE_HEIGHT: 50, // Minimum visible pipe height
  MAX_PIPE_VARIANCE: 100, // Max vertical change between consecutive pipes

  // Difficulty scaling
  DIFFICULTY_INCREASE_SCORE: 5, // Score interval for difficulty increase
  MIN_GAP_PIXELS: 80, // Minimum gap at highest difficulty
  GAP_DECREASE_RATE: 5, // Gap reduction per difficulty level
  MAX_PIPE_SPEED: 4, // Maximum pipe speed
  SPEED_INCREASE_RATE: 0.2, // Speed increase per difficulty level

  // Bird animation
  ROTATION_SPEED: 3, // How fast bird rotates
  MAX_ROTATION: 90, // Maximum downward rotation
  MIN_ROTATION: -25, // Maximum upward rotation

  // Game feel
  SCREEN_SHAKE_DURATION: 200, // Screen shake duration on death (ms)
  SCREEN_SHAKE_INTENSITY: 5, // Screen shake intensity
};

// Game Modes
const GAME_MODES = {
  classic: {
    name: "Classic",
    description: "Original gameplay - pure skill",
    icon: "▶",
    color: "#3b82f6",
    features: {
      wind: false,
      movingPipes: false,
      powerUps: false,
      coins: false,
      trail: false,
    },
  },
  wind: {
    name: "Wind Runner",
    description: "Random wind gusts affect flight",
    icon: "≋",
    color: "#06b6d4",
    features: {
      wind: true,
      movingPipes: false,
      powerUps: false,
      coins: false,
      trail: true,
    },
  },
  moving: {
    name: "Moving Pipes",
    description: "Pipes that move up and down",
    icon: "↕",
    color: "#10b981",
    features: {
      wind: false,
      movingPipes: true,
      powerUps: false,
      coins: false,
      trail: false,
    },
  },
  powerup: {
    name: "Power-Up",
    description: "Collect power-ups and coins",
    icon: "⚡",
    color: "#eab308",
    features: {
      wind: false,
      movingPipes: false,
      powerUps: true,
      coins: true,
      trail: false,
    },
  },
  chaos: {
    name: "Chaos",
    description: "Everything enabled - ultimate challenge!",
    icon: "✦",
    color: "#ef4444",
    features: {
      wind: true,
      movingPipes: true,
      powerUps: true,
      coins: true,
      trail: true,
    },
  },
};

// Wind System
class WindSystem {
  constructor() {
    this.currentWind = 0; // Current wind force (-1 to 1)
    this.targetWind = 0; // Target wind to interpolate to
    this.gustTimer = 0; // Timer for wind gusts
    this.gustInterval = 120; // Frames between gusts
    this.maxWindForce = 0.15; // Maximum wind effect
    this.particles = []; // Wind particles for visualization
  }

  update() {
    this.gustTimer++;

    // Randomly change wind direction
    if (this.gustTimer >= this.gustInterval) {
      this.gustTimer = 0;
      this.targetWind = (Math.random() - 0.5) * 2 * this.maxWindForce;
      this.gustInterval = 60 + Math.random() * 120; // Randomize next gust
    }

    // Smoothly interpolate to target wind
    this.currentWind += (this.targetWind - this.currentWind) * 0.02;

    // Update wind particles
    this.updateParticles();
  }

  updateParticles() {
    // Spawn new wind particles
    if (Math.random() < Math.abs(this.currentWind) * 3) {
      const direction = this.currentWind > 0 ? 1 : -1;
      this.particles.push({
        x: direction > 0 ? -10 : canvas.width + 10,
        y: Math.random() * canvas.height,
        speed: (2 + Math.random() * 2) * direction,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.3,
      });
    }

    // Update existing particles
    this.particles = this.particles.filter((p) => {
      p.x += p.speed * 3;
      p.y += Math.sin(p.x * 0.05) * 0.5;
      return p.x > -20 && p.x < canvas.width + 20;
    });
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = "rgba(200, 220, 255, 0.5)";
    this.particles.forEach((p) => {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * 3, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // Draw wind indicator
    if (Math.abs(this.currentWind) > 0.02) {
      this.drawWindIndicator(ctx);
    }
  }

  drawWindIndicator(ctx) {
    const indicatorX = canvas.width / 2;
    const indicatorY = 35;
    const arrowLength = Math.abs(this.currentWind) * 150;
    const direction = this.currentWind > 0 ? 1 : -1;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;

    // Arrow line
    ctx.beginPath();
    ctx.moveTo(indicatorX - arrowLength * direction, indicatorY);
    ctx.lineTo(indicatorX + arrowLength * direction, indicatorY);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(indicatorX + arrowLength * direction, indicatorY);
    ctx.lineTo(indicatorX + (arrowLength - 8) * direction, indicatorY - 5);
    ctx.lineTo(indicatorX + (arrowLength - 8) * direction, indicatorY + 5);
    ctx.closePath();
    ctx.fill();

    // Wind label
    ctx.font = "10px Verdana";
    ctx.textAlign = "center";
    ctx.fillText("WIND", indicatorX, indicatorY + 15);

    ctx.restore();
  }

  getForce() {
    return this.currentWind;
  }

  reset() {
    this.currentWind = 0;
    this.targetWind = 0;
    this.gustTimer = 0;
    this.particles = [];
  }
}

// Power Ups
const POWER_UP_TYPES = {
  shield: {
    name: "Shield",
    color: "#3498db",
    icon: "◈",
    duration: 0, // Instant use on collision
    description: "One-time collision protection",
  },
  slowmo: {
    name: "Slow Motion",
    color: "#9b59b6",
    icon: "◎",
    duration: 300, // 5 seconds at 60fps
    description: "Slows game speed temporarily",
  },
  mini: {
    name: "Mini Bird",
    color: "#e74c3c",
    icon: "◇",
    duration: 360, // 6 seconds
    description: "Shrinks hitbox temporarily",
  },
  ghost: {
    name: "Ghost",
    color: "#95a5a6",
    icon: "◌",
    duration: 180, // 3 seconds
    description: "Pass through one pipe",
  },
  doublePoints: {
    name: "Double Points",
    color: "#f1c40f",
    icon: "✦",
    duration: 600, // 10 seconds
    description: "2x score multiplier",
  },
  magnet: {
    name: "Magnet",
    color: "#e91e63",
    icon: "⊛",
    duration: 480, // 8 seconds
    description: "Attracts nearby coins",
  },
};

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = POWER_UP_TYPES[type];
    this.size = 24;
    this.collected = false;
    this.bobOffset = Math.random() * Math.PI * 2;
    this.glowPhase = 0;
  }

  update(speed) {
    this.x -= speed;
    this.bobOffset += 0.08;
    this.glowPhase += 0.1;
  }

  draw(ctx) {
    if (this.collected) return;

    const bobY = this.y + Math.sin(this.bobOffset) * 5;
    const glowSize = 3 + Math.sin(this.glowPhase) * 2;

    ctx.save();

    // Glow effect
    ctx.shadowColor = this.config.color;
    ctx.shadowBlur = 10 + glowSize;

    // Background circle
    ctx.fillStyle = this.config.color;
    ctx.beginPath();
    ctx.arc(this.x, bobY, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.beginPath();
    ctx.arc(this.x - 3, bobY - 3, this.size / 4, 0, Math.PI * 2);
    ctx.fill();

    // Icon
    ctx.shadowBlur = 0;
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.config.icon, this.x, bobY);

    ctx.restore();
  }

  checkCollision(bird) {
    if (this.collected) return false;

    const birdCenterX = bird.x + bird.image.width / 2;
    const birdCenterY = bird.y + bird.image.height / 2;
    const bobY = this.y + Math.sin(this.bobOffset) * 5;

    const distance = Math.sqrt(
      Math.pow(this.x - birdCenterX, 2) + Math.pow(bobY - birdCenterY, 2)
    );

    return distance < this.size / 2 + 15;
  }
}

class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 16;
    this.collected = false;
    this.rotation = Math.random() * Math.PI * 2;
    this.bobOffset = Math.random() * Math.PI * 2;
  }

  update(speed, magnetActive, birdX, birdY) {
    this.x -= speed;
    this.rotation += 0.15;
    this.bobOffset += 0.06;

    // Magnet effect - move toward bird
    if (magnetActive && !this.collected) {
      const dx = birdX - this.x;
      const dy = birdY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 100) {
        this.x += (dx / distance) * 3;
        this.y += (dy / distance) * 3;
      }
    }
  }

  draw(ctx) {
    if (this.collected) return;

    const bobY = this.y + Math.sin(this.bobOffset) * 3;
    const scaleX = Math.cos(this.rotation);

    ctx.save();
    ctx.translate(this.x, bobY);
    ctx.scale(scaleX, 1);

    // Coin shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(2, 2, this.size / 2, this.size / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Coin body
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Coin highlight
    ctx.fillStyle = "#FFF8DC";
    ctx.beginPath();
    ctx.arc(-2, -2, this.size / 4, 0, Math.PI * 2);
    ctx.fill();

    // Dollar sign
    if (Math.abs(scaleX) > 0.3) {
      ctx.fillStyle = "#B8860B";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 1);
    }

    ctx.restore();
  }

  checkCollision(bird, magnetActive) {
    if (this.collected) return false;

    const birdCenterX = bird.x + bird.image.width / 2;
    const birdCenterY = bird.y + bird.image.height / 2;
    const bobY = this.y + Math.sin(this.bobOffset) * 3;

    const distance = Math.sqrt(
      Math.pow(this.x - birdCenterX, 2) + Math.pow(bobY - birdCenterY, 2)
    );

    const collectionRadius = magnetActive ? 20 : 15;
    return distance < this.size / 2 + collectionRadius;
  }
}

class ActivePowerUps {
  constructor() {
    this.effects = {};
    this.shield = false;
    this.ghostUsed = false;
  }

  activate(type) {
    const config = POWER_UP_TYPES[type];

    if (type === "shield") {
      this.shield = true;
      return;
    }

    if (type === "ghost") {
      this.ghostUsed = false;
    }

    this.effects[type] = {
      remaining: config.duration,
      maxDuration: config.duration,
    };
  }

  update() {
    Object.keys(this.effects).forEach((type) => {
      this.effects[type].remaining--;
      if (this.effects[type].remaining <= 0) {
        delete this.effects[type];
      }
    });
  }

  isActive(type) {
    if (type === "shield") return this.shield;
    return !!this.effects[type];
  }

  useShield() {
    if (this.shield) {
      this.shield = false;
      return true;
    }
    return false;
  }

  useGhost() {
    if (this.isActive("ghost") && !this.ghostUsed) {
      this.ghostUsed = true;
      return true;
    }
    return false;
  }

  getMultiplier() {
    return this.isActive("doublePoints") ? 2 : 1;
  }

  getSlowFactor() {
    return this.isActive("slowmo") ? 0.5 : 1;
  }

  getMiniScale() {
    return this.isActive("mini") ? 0.6 : 1;
  }

  draw(ctx, canvasWidth) {
    let y = 50;
    const x = canvasWidth - 10;

    // Draw shield indicator
    if (this.shield) {
      ctx.save();
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "right";
      ctx.fillStyle = POWER_UP_TYPES.shield.color;
      ctx.fillText("◈ Shield Ready", x, y);
      ctx.restore();
      y += 18;
    }

    // Draw active timed effects
    Object.keys(this.effects).forEach((type) => {
      const effect = this.effects[type];
      const config = POWER_UP_TYPES[type];
      const progress = effect.remaining / effect.maxDuration;

      ctx.save();

      // Background bar
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(x - 80, y - 10, 80, 14);

      // Progress bar
      ctx.fillStyle = config.color;
      ctx.fillRect(x - 80, y - 10, 80 * progress, 14);

      // Icon and name
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "right";
      ctx.fillStyle = "#FFF";
      ctx.fillText(`${config.icon} ${config.name}`, x - 3, y);

      ctx.restore();
      y += 18;
    });
  }

  reset() {
    this.effects = {};
    this.shield = false;
    this.ghostUsed = false;
  }
}

// Trail Effects
class TrailSystem {
  constructor() {
    this.positions = [];
    this.maxLength = 15;
  }

  update(x, y, rotation) {
    this.positions.unshift({ x, y, rotation, alpha: 1 });

    if (this.positions.length > this.maxLength) {
      this.positions.pop();
    }

    // Fade out trail
    this.positions.forEach((pos, i) => {
      pos.alpha = 1 - i / this.maxLength;
    });
  }

  draw(ctx, birdImage) {
    ctx.save();

    this.positions.forEach((pos, i) => {
      if (i === 0) return; // Skip current position (bird draws itself)

      ctx.globalAlpha = pos.alpha * 0.3;
      ctx.translate(pos.x + birdImage.width / 2, pos.y + birdImage.height / 2);
      ctx.rotate((pos.rotation * Math.PI) / 180);
      ctx.drawImage(birdImage, -birdImage.width / 2, -birdImage.height / 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    });

    ctx.restore();
  }

  reset() {
    this.positions = [];
  }
}

// Main Game Logic
class Game {
  constructor() {
    this.state = "start";
    this.highScores = this.loadHighScores();
    this.difficulty = 1;
    this.screenShake = { active: false, intensity: 0, startTime: 0 };
    this.particleSystem = new ParticleSystem();

    // Game Mode System
    this.currentMode = "classic";
    this.modeFeatures = GAME_MODES.classic.features;

    // New Systems
    this.windSystem = new WindSystem();
    this.activePowerUps = new ActivePowerUps();
    this.trailSystem = new TrailSystem();

    // Collectibles
    this.powerUps = [];
    this.coins = [];
    this.totalCoins = this.loadCoins();
  }

  // Scores per mode & difficulty
  loadHighScores() {
    const saved = localStorage.getItem("flappyHighScoresV2");
    if (saved) {
      return JSON.parse(saved);
    }
    // Migrate from old format
    const oldScores = localStorage.getItem("flappyHighScores");
    if (oldScores) {
      const parsed = JSON.parse(oldScores);
      // Convert old mode-only scores to mode+difficulty format (assume normal difficulty)
      const newScores = {};
      Object.keys(parsed).forEach((mode) => {
        newScores[`${mode}_normal`] = parsed[mode];
        newScores[`${mode}_easy`] = 0;
        newScores[`${mode}_hard`] = 0;
      });
      return newScores;
    }
    // Fresh start or migrate from very old single score
    const oldHighScore = parseInt(localStorage.getItem("flappyHighScore")) || 0;
    const scores = {};
    const modes = ["classic", "wind", "moving", "powerup", "chaos"];
    const difficulties = ["easy", "normal", "hard"];
    modes.forEach((mode) => {
      difficulties.forEach((diff) => {
        scores[`${mode}_${diff}`] =
          mode === "classic" && diff === "normal" ? oldHighScore : 0;
      });
    });
    return scores;
  }

  saveHighScores() {
    localStorage.setItem("flappyHighScoresV2", JSON.stringify(this.highScores));
  }

  getScoreKey(
    mode = this.currentMode,
    difficulty = Settings.current.difficulty
  ) {
    return `${mode}_${difficulty}`;
  }

  getHighScore(
    mode = this.currentMode,
    difficulty = Settings.current.difficulty
  ) {
    const key = this.getScoreKey(mode, difficulty);
    return this.highScores[key] || 0;
  }

  setHighScore(
    score,
    mode = this.currentMode,
    difficulty = Settings.current.difficulty
  ) {
    const key = this.getScoreKey(mode, difficulty);
    if (score > this.getHighScore(mode, difficulty)) {
      this.highScores[key] = score;
      this.saveHighScores();
      return true; // New high score
    }
    return false;
  }

  // Legacy getter for backward compatibility
  get highScore() {
    return this.getHighScore();
  }

  loadHighScore() {
    return this.getHighScore();
  }

  saveHighScore() {
    this.saveHighScores();
  }

  loadCoins() {
    return parseInt(localStorage.getItem("flappyCoins")) || 0;
  }

  saveCoins() {
    localStorage.setItem("flappyCoins", this.totalCoins.toString());
    // Update UI display
    const coinsElement = document.getElementById("total-coins");
    if (coinsElement) {
      coinsElement.textContent = this.totalCoins;
    }
  }

  setMode(modeKey) {
    if (GAME_MODES[modeKey]) {
      this.currentMode = modeKey;
      this.modeFeatures = GAME_MODES[modeKey].features;
    }
  }

  endGame() {
    this.state = "end";
    this.triggerScreenShake();
  }

  pauseGame() {
    this.state = "paused";
  }

  startGame() {
    this.state = "playing";
  }

  triggerScreenShake() {
    this.screenShake = {
      active: true,
      intensity: CONFIG.SCREEN_SHAKE_INTENSITY,
      startTime: Date.now(),
    };
  }

  updateScreenShake() {
    if (!this.screenShake.active) return { x: 0, y: 0 };

    const elapsed = Date.now() - this.screenShake.startTime;
    if (elapsed > CONFIG.SCREEN_SHAKE_DURATION) {
      this.screenShake.active = false;
      return { x: 0, y: 0 };
    }

    const progress = elapsed / CONFIG.SCREEN_SHAKE_DURATION;
    const currentIntensity = this.screenShake.intensity * (1 - progress);

    return {
      x: (Math.random() - 0.5) * currentIntensity * 2,
      y: (Math.random() - 0.5) * currentIntensity * 2,
    };
  }

  getCurrentGap() {
    const reduction =
      Math.floor(score / CONFIG.DIFFICULTY_INCREASE_SCORE) *
      CONFIG.GAP_DECREASE_RATE;
    return Math.max(CONFIG.MIN_GAP_PIXELS, CONFIG.GAP_PIXELS - reduction);
  }

  getCurrentSpeed() {
    const increase =
      Math.floor(score / CONFIG.DIFFICULTY_INCREASE_SCORE) *
      CONFIG.SPEED_INCREASE_RATE;
    const baseSpeed = Math.min(
      CONFIG.MAX_PIPE_SPEED,
      CONFIG.PIPE_SPEED + increase
    );
    return baseSpeed * this.activePowerUps.getSlowFactor();
  }

  spawnPowerUp(x, minY, maxY) {
    if (!this.modeFeatures.powerUps) return;

    // 15% chance to spawn power-up
    if (Math.random() > 0.15) return;

    const types = Object.keys(POWER_UP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const y = minY + Math.random() * (maxY - minY);

    this.powerUps.push(new PowerUp(x, y, type));
  }

  spawnCoins(x, minY, maxY, count = 3) {
    if (!this.modeFeatures.coins) return;

    // 40% chance to spawn coins
    if (Math.random() > 0.4) return;

    const spacing = (maxY - minY) / (count + 1);
    for (let i = 0; i < count; i++) {
      const y = minY + spacing * (i + 1) + (Math.random() - 0.5) * 20;
      this.coins.push(new Coin(x, y));
    }
  }

  resetCollectibles() {
    this.powerUps = [];
    this.coins = [];
    this.activePowerUps.reset();
    this.windSystem.reset();
    this.trailSystem.reset();
  }
}

// Particles & Effects
class Particle {
  constructor(x, y, color, velocity, life) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.velocity = velocity;
    this.life = life;
    this.maxLife = life;
    this.size = Math.random() * 4 + 2;
  }

  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.velocity.y += 0.1; // Particle gravity
    this.life--;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push(
        new Particle(
          x,
          y,
          color,
          { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          30 + Math.random() * 20
        )
      );
    }
  }

  emitScore(x, y) {
    this.emit(x, y, 10, "#FFD700"); // Gold particles for scoring
  }

  emitDeath(x, y) {
    this.emit(x, y, 20, "#FF4444"); // Red particles for death
  }

  update() {
    this.particles = this.particles.filter((p) => p.update());
  }

  draw(ctx) {
    this.particles.forEach((p) => p.draw(ctx));
  }
}

// Game Assets
class GameAsset {
  constructor(src) {
    const asset = new Image();
    asset.src = src;
    return asset;
  }
}

class AudioAsset {
  constructor(src) {
    const asset = new Audio();
    asset.src = src;
    asset.volume = 0.3; // Reasonable default volume
    return asset;
  }
}

// Bird - It's the word...
class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.velocity = 0; // Current vertical velocity
    this.rotation = 0; // Current rotation angle
    this.flapCooldown = 0; // Prevents spam flapping
    this.image = new GameAsset("img/bird.png");
    this.horizontalVelocity = 0; // For wind effects
  }

  flap() {
    if (this.flapCooldown > 0) return false;

    this.velocity = CONFIG.FLAP_VELOCITY;
    this.flapCooldown = 5; // 5 frames cooldown
    return true;
  }

  update(windForce = 0, slowFactor = 1) {
    // Apply gravity (affected by slow motion)
    this.velocity += CONFIG.GRAVITY * slowFactor;

    // Clamp velocity
    this.velocity = Math.max(
      CONFIG.MAX_RISE_SPEED,
      Math.min(CONFIG.MAX_FALL_SPEED, this.velocity)
    );

    // Update position (affected by slow motion)
    this.y += this.velocity * slowFactor;

    // Apply wind effect (horizontal drift)
    if (windForce !== 0) {
      this.horizontalVelocity += windForce * 0.5;
      this.horizontalVelocity *= 0.95; // Damping
      // Don't actually move bird horizontally, but could add visual tilt
    }

    // Update rotation based on velocity
    if (this.velocity < 0) {
      // Rising - rotate upward
      this.rotation = Math.max(
        CONFIG.MIN_ROTATION,
        this.rotation - CONFIG.ROTATION_SPEED
      );
    } else {
      // Falling - rotate downward
      this.rotation = Math.min(
        CONFIG.MAX_ROTATION,
        this.rotation + CONFIG.ROTATION_SPEED * 0.5
      );
    }

    // Add wind tilt to rotation
    this.rotation += windForce * 30;

    // Update cooldown
    if (this.flapCooldown > 0) this.flapCooldown--;
  }

  reset(y) {
    this.y = y;
    this.velocity = 0;
    this.rotation = 0;
    this.flapCooldown = 0;
    this.horizontalVelocity = 0;
  }

  draw(ctx, scale = 1) {
    ctx.save();

    const centerX = this.x + this.image.width / 2;
    const centerY = this.y + this.image.height / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
    ctx.restore();
  }

  // Get hitbox adjusted for mini power-up
  getHitbox(scale = 1) {
    const padding = 3;
    const width = (this.image.width - padding * 2) * scale;
    const height = (this.image.height - padding * 2) * scale;
    const offsetX = (this.image.width - width) / 2;
    const offsetY = (this.image.height - height) / 2;

    return {
      left: this.x + offsetX,
      right: this.x + offsetX + width,
      top: this.y + offsetY,
      bottom: this.y + offsetY + height,
    };
  }
}

// Pipe
class Pipe {
  constructor(x, y, gap, isMoving = false) {
    this.x = x;
    this.y = y;
    this.baseY = y; // Original Y for moving pipes
    this.gap = gap || CONFIG.GAP_PIXELS;
    this.passed = false; // Track if bird passed this pipe
    this.topImage = new GameAsset("img/top_pipe.png");
    this.bottomImage = new GameAsset("img/bottom_pipe.png");

    // Moving pipe properties
    this.isMoving = isMoving;
    this.moveSpeed = 0.5 + Math.random() * 0.5; // Random speed
    this.moveRange = 30 + Math.random() * 20; // Random range
    this.movePhase = Math.random() * Math.PI * 2; // Random starting phase
    this.moveDirection = Math.random() > 0.5 ? 1 : -1; // Random direction
  }

  update() {
    if (this.isMoving) {
      this.movePhase += this.moveSpeed * 0.05;
      this.y =
        this.baseY +
        Math.sin(this.movePhase) * this.moveRange * this.moveDirection;
    }
  }

  getGapHeight() {
    return CONFIG.TOP_PIPE_HEIGHT + this.gap;
  }

  // Get the actual gap boundaries for collision and spawning
  getGapBounds() {
    const topPipeBottom = this.y + CONFIG.TOP_PIPE_HEIGHT;
    const bottomPipeTop = this.y + this.getGapHeight();
    return { top: topPipeBottom, bottom: bottomPipeTop };
  }
}

// Smart pipe generator that ensures playability
class PipeGenerator {
  constructor() {
    this.lastPipeY = null;
    this.pipeCount = 0;
  }

  generate(x, currentGap, enableMoving = false) {
    let newY;
    const minY = -CONFIG.TOP_PIPE_HEIGHT + CONFIG.MIN_PIPE_HEIGHT;
    const maxY = -CONFIG.MIN_PIPE_HEIGHT;

    if (this.lastPipeY === null) {
      // First pipe - center it
      newY = (minY + maxY) / 2;
    } else {
      // Constrain new pipe position based on last pipe
      const minNewY = Math.max(minY, this.lastPipeY - CONFIG.MAX_PIPE_VARIANCE);
      const maxNewY = Math.min(maxY, this.lastPipeY + CONFIG.MAX_PIPE_VARIANCE);

      // Add some randomness within the constrained range
      newY = minNewY + Math.random() * (maxNewY - minNewY);
    }

    this.lastPipeY = newY;
    this.pipeCount++;

    // Moving pipes start appearing after pipe 3, with increasing frequency
    const shouldMove =
      enableMoving &&
      this.pipeCount > 3 &&
      Math.random() < Math.min(0.6, 0.2 + this.pipeCount * 0.05);

    return new Pipe(x, newY, currentGap, shouldMove);
  }

  reset() {
    this.lastPipeY = null;
    this.pipeCount = 0;
  }
}

// game init
const game = new Game();
const pipeGenerator = new PipeGenerator();

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const backgroundImage = new GameAsset("img/background.png");
const foregroundImage = new GameAsset("img/foreground.png");

const bird = new Bird(50, 150);
const pipes = [pipeGenerator.generate(canvas.width, CONFIG.GAP_PIXELS, false)];
let score = 0;
let sessionCoins = 0; // Coins collected this session
let frameCount = 0;

// Foreground scrolling
let foregroundX = 0;

const fly = new AudioAsset("audio/fly.mp3");
const earnedPoint = new AudioAsset("audio/score.mp3");
const coinSound = new AudioAsset("audio/score.mp3"); // Reuse score sound for coins
const powerUpSound = new AudioAsset("audio/score.mp3"); // Reuse for power-ups

// Collision Detection
const checkCollision = (pipe, bird, activePowerUps) => {
  const scale = activePowerUps ? activePowerUps.getMiniScale() : 1;
  const hitbox = bird.getHitbox(scale);

  // Pipe bounds
  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + pipe.topImage.width;
  const topPipeBottom = pipe.y + CONFIG.TOP_PIPE_HEIGHT;
  const bottomPipeTop = pipe.y + pipe.getGapHeight();

  // Check horizontal overlap
  const horizontalOverlap = hitbox.right > pipeLeft && hitbox.left < pipeRight;

  // Check pipe collisions
  const hitTopPipe = hitbox.top < topPipeBottom;
  const hitBottomPipe = hitbox.bottom > bottomPipeTop;

  // Check ground collision
  const hitGround = hitbox.bottom >= canvas.height - foregroundImage.height;

  // Check ceiling collision
  const hitCeiling = hitbox.top <= 0;

  const hitPipe = horizontalOverlap && (hitTopPipe || hitBottomPipe);

  // Ghost mode - can pass through one pipe
  if (hitPipe && activePowerUps && activePowerUps.useGhost()) {
    return false;
  }

  return hitPipe || hitGround || hitCeiling;
};

// Rendering System
function drawGame() {
  const shake = game.updateScreenShake();

  ctx.save();
  ctx.translate(shake.x, shake.y);

  // Background
  ctx.drawImage(backgroundImage, 0, 0);

  // Wind particles (behind everything)
  if (game.modeFeatures.wind) {
    game.windSystem.draw(ctx);
  }

  // Pipes
  for (let i = 0; i < pipes.length; i++) {
    const pipe = pipes[i];

    // Moving pipe indicator
    if (pipe.isMoving) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 100, 100, 0.3)";
      ctx.fillRect(pipe.x, 0, pipe.topImage.width, canvas.height);
      ctx.restore();
    }

    ctx.drawImage(pipe.topImage, pipe.x, pipe.y);
    ctx.drawImage(pipe.bottomImage, pipe.x, pipe.y + pipe.getGapHeight());
  }

  // Coins
  game.coins.forEach((coin) => coin.draw(ctx));

  // Power-ups
  game.powerUps.forEach((powerUp) => powerUp.draw(ctx));

  // Scrolling foreground
  ctx.drawImage(
    foregroundImage,
    foregroundX,
    canvas.height - foregroundImage.height
  );
  ctx.drawImage(
    foregroundImage,
    foregroundX + foregroundImage.width,
    canvas.height - foregroundImage.height
  );

  // Trail effect (behind bird)
  if (game.modeFeatures.trail) {
    game.trailSystem.draw(ctx, bird.image);
  }

  // Bird with rotation and scale
  const birdScale = game.activePowerUps.getMiniScale();

  // Ghost effect
  if (game.activePowerUps.isActive("ghost")) {
    ctx.globalAlpha = 0.5;
  }

  // Shield glow
  if (game.activePowerUps.shield) {
    ctx.save();
    ctx.shadowColor = "#3498db";
    ctx.shadowBlur = 15;
    bird.draw(ctx, birdScale);
    ctx.restore();
  } else {
    bird.draw(ctx, birdScale);
  }

  ctx.globalAlpha = 1;

  // Particles
  game.particleSystem.draw(ctx);

  // Active power-ups UI
  game.activePowerUps.draw(ctx, canvas.width);

  // Score display with shadow for readability
  ctx.fillStyle = "#000";
  ctx.font = "bold 24px Verdana";
  ctx.fillText("Score: " + score, 12, canvas.height - 18);
  ctx.fillStyle = "#FFF";
  ctx.fillText("Score: " + score, 10, canvas.height - 20);

  // Coin display - positioned below HUD
  if (game.modeFeatures.coins) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 12px Verdana";
    ctx.fillText("◉ " + sessionCoins, 16, 55);
  }

  // Multiplier indicator
  if (game.activePowerUps.isActive("doublePoints")) {
    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 16px Verdana";
    ctx.fillText("2X POINTS!", canvas.width / 2 - 40, 70);
  }

  // Difficulty indicator
  const currentDifficulty =
    Math.floor(score / CONFIG.DIFFICULTY_INCREASE_SCORE) + 1;

  // HUD Panel - Top left
  ctx.save();

  // Mode and difficulty badge background
  const mode = GAME_MODES[game.currentMode];
  const diffName =
    Settings.current.difficulty.charAt(0).toUpperCase() +
    Settings.current.difficulty.slice(1);

  // Draw mode badge
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.roundRect(8, 8, 90, 32, 6);
  ctx.fill();

  // Mode color accent bar
  ctx.fillStyle = mode.color;
  ctx.fillRect(8, 8, 4, 32);

  // Mode icon and name
  ctx.font = "bold 11px Verdana";
  ctx.fillStyle = mode.color;
  ctx.textAlign = "left";
  ctx.fillText(mode.icon + " " + mode.name, 16, 22);

  // Difficulty indicator
  ctx.font = "10px Verdana";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(diffName + " • Lv." + currentDifficulty, 16, 35);

  ctx.restore();

  ctx.restore();

  // Update UI high score display
  document.getElementById("high-score").textContent = game.highScore;
}

function drawStartScreen() {
  ctx.drawImage(backgroundImage, 0, 0);
  ctx.drawImage(foregroundImage, 0, canvas.height - foregroundImage.height);

  // Semi-transparent overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = "#FFF";
  ctx.font = "bold 32px Verdana";
  ctx.textAlign = "center";
  ctx.fillText("Flappy Bird", canvas.width / 2, 60);

  // Current mode display
  const currentMode = GAME_MODES[game.currentMode];
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 16px Verdana";
  ctx.fillText(currentMode.icon + " " + currentMode.name, canvas.width / 2, 95);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "12px Verdana";
  ctx.fillText(currentMode.description, canvas.width / 2, 115);

  // Animated bird preview
  const previewY = 140 + Math.sin(frameCount * 0.1) * 10;
  ctx.drawImage(bird.image, canvas.width / 2 - bird.image.width / 2, previewY);

  // Instructions
  ctx.fillStyle = "#FFF";
  ctx.font = "14px Verdana";
  ctx.fillText("Press ENTER to Start", canvas.width / 2, 220);
  ctx.fillText("Space or ↑ to Flap", canvas.width / 2, 245);

  // Mode selection hint
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "11px Verdana";
  ctx.fillText("Press 1-5 to change mode", canvas.width / 2, 280);

  // Mode list with background card
  const modeListX = 10;
  const modeListY = 295;
  const modeListWidth = 130;
  const modeListHeight = 110;

  // Card background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.beginPath();
  ctx.roundRect(modeListX, modeListY, modeListWidth, modeListHeight, 8);
  ctx.fill();

  // Card border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Mode items
  ctx.font = "11px Verdana";
  ctx.textAlign = "left";
  let modeY = modeListY + 20;
  let modeNum = 1;
  Object.keys(GAME_MODES).forEach((key) => {
    const mode = GAME_MODES[key];
    const isActive = key === game.currentMode;

    // Highlight background for active mode
    if (isActive) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.roundRect(modeListX + 4, modeY - 12, modeListWidth - 8, 18, 4);
      ctx.fill();
    }

    ctx.fillStyle = isActive ? mode.color : "rgba(255, 255, 255, 0.6)";
    ctx.font = isActive ? "bold 11px Verdana" : "11px Verdana";
    ctx.fillText(
      `${modeNum}. ${mode.icon} ${mode.name}`,
      modeListX + 10,
      modeY
    );
    modeY += 18;
    modeNum++;
  });

  // Total coins
  ctx.textAlign = "right";
  ctx.fillStyle = "#FFD700";
  ctx.font = "12px Verdana";
  ctx.fillText(
    "◉ " + game.totalCoins + " coins",
    canvas.width - 10,
    canvas.height - 20
  );

  ctx.textAlign = "left";
}

function drawPausedScreen() {
  drawGame();

  // Pause overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FFF";
  ctx.font = "bold 28px Verdana";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2 - 20);

  ctx.font = "16px Verdana";
  ctx.fillText("Press ENTER or P", canvas.width / 2, canvas.height / 2 + 20);
  ctx.fillText("to continue", canvas.width / 2, canvas.height / 2 + 45);

  ctx.textAlign = "left";
}

function drawEndScreen() {
  drawGame();

  // Death overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FF4444";
  ctx.font = "bold 32px Verdana";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 3);

  ctx.fillStyle = "#FFF";
  ctx.font = "bold 20px Verdana";
  ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 - 20);

  // Show coins earned
  if (game.modeFeatures.coins && sessionCoins > 0) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "16px Verdana";
    ctx.fillText(
      "◉ +" + sessionCoins + " coins",
      canvas.width / 2,
      canvas.height / 2 + 5
    );
  }

  if (score >= game.highScore && score > 0) {
    ctx.fillStyle = "#FFD700";
    ctx.fillText("NEW HIGH SCORE!", canvas.width / 2, canvas.height / 2 + 30);
  }

  ctx.fillStyle = "#FFF";
  ctx.font = "16px Verdana";
  ctx.fillText(
    "Press ENTER to Restart",
    canvas.width / 2,
    canvas.height / 2 + 70
  );

  // Mode info card at bottom
  const currentMode = GAME_MODES[game.currentMode];
  const diffName =
    Settings.current.difficulty.charAt(0).toUpperCase() +
    Settings.current.difficulty.slice(1);
  const currentDifficulty =
    Math.floor(score / CONFIG.DIFFICULTY_INCREASE_SCORE) + 1;
  const modeCardWidth = 140;
  const modeCardHeight = 36;
  const modeCardX = (canvas.width - modeCardWidth) / 2;
  const modeCardY = canvas.height / 2 + 85;

  // Card background
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.beginPath();
  ctx.roundRect(modeCardX, modeCardY, modeCardWidth, modeCardHeight, 8);
  ctx.fill();

  // Mode color accent
  ctx.fillStyle = currentMode.color;
  ctx.fillRect(modeCardX, modeCardY + 6, 3, modeCardHeight - 12);

  // Mode icon and name
  ctx.textAlign = "center";
  ctx.fillStyle = currentMode.color;
  ctx.font = "bold 12px Verdana";
  ctx.fillText(
    currentMode.icon + " " + currentMode.name,
    canvas.width / 2,
    modeCardY + 14
  );

  // Difficulty indicator
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "10px Verdana";
  ctx.fillText(
    diffName + " • Lv." + currentDifficulty,
    canvas.width / 2,
    modeCardY + 28
  );

  ctx.textAlign = "left";
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  frameCount++;

  switch (game.state) {
    case "start":
      drawStartScreen();
      break;
    case "paused":
      drawPausedScreen();
      break;
    case "end":
      drawEndScreen();
      break;
    case "playing":
      drawGame();
      break;
  }
}

// Game Logic
function moveUp() {
  if (bird.flap()) {
    fly.currentTime = 0; // Reset audio to allow rapid plays
    fly.play();
  }
}

function updateGame() {
  if (game.state !== "playing") return;

  const slowFactor = game.activePowerUps.getSlowFactor();
  const windForce = game.modeFeatures.wind ? game.windSystem.getForce() : 0;

  // Update wind system
  if (game.modeFeatures.wind) {
    game.windSystem.update();
  }

  // Update active power-ups
  game.activePowerUps.update();

  // Update bird physics
  bird.update(windForce, slowFactor);

  // Update trail
  if (game.modeFeatures.trail) {
    game.trailSystem.update(bird.x, bird.y, bird.rotation);
  }

  // Update foreground scrolling
  const currentSpeed = game.getCurrentSpeed();
  foregroundX -= currentSpeed;
  if (foregroundX <= -foregroundImage.width) {
    foregroundX = 0;
  }

  // Update particles
  game.particleSystem.update();

  // Update pipes
  const currentGap = game.getCurrentGap();

  let i = 0;
  while (i < pipes.length) {
    pipes[i].x -= currentSpeed;

    // Update moving pipes
    if (pipes[i].isMoving) {
      pipes[i].update();
    }

    // Spawn new pipe
    if (
      !pipes[i].passed &&
      pipes[i].x < canvas.width - CONFIG.PIPE_SPAWN_DISTANCE
    ) {
      // Check if we need a new pipe
      const lastPipe = pipes[pipes.length - 1];
      if (lastPipe.x < canvas.width - CONFIG.PIPE_SPAWN_DISTANCE) {
        const newPipe = pipeGenerator.generate(
          canvas.width,
          currentGap,
          game.modeFeatures.movingPipes
        );
        pipes.push(newPipe);

        // Spawn collectibles in the gap
        const gapBounds = newPipe.getGapBounds();
        game.spawnPowerUp(
          canvas.width + 30,
          gapBounds.top + 10,
          gapBounds.bottom - 10
        );
        game.spawnCoins(
          canvas.width + 50,
          gapBounds.top + 10,
          gapBounds.bottom - 10,
          3
        );
      }
    }

    // Remove off-screen pipes
    if (pipes[i].x < -pipes[i].topImage.width) {
      pipes.splice(i, 1);
      continue;
    }

    // Check collision
    if (checkCollision(pipes[i], bird, game.activePowerUps)) {
      // Check if shield can save us
      if (game.activePowerUps.useShield()) {
        // Shield used! Create visual feedback
        game.particleSystem.emit(
          bird.x + bird.image.width / 2,
          bird.y + bird.image.height / 2,
          15,
          "#3498db"
        );
      } else {
        game.particleSystem.emitDeath(
          bird.x + bird.image.width / 2,
          bird.y + bird.image.height / 2
        );
        // Update mode-specific high score
        game.setHighScore(score);
        // Save coins earned
        game.totalCoins += sessionCoins;
        game.saveCoins();
        // Update UI displays
        updateHighScoreDisplay();
        updateTotalCoinsDisplay();
        game.endGame();
        return;
      }
    }

    // Score when passing pipe center
    const pipeCenter = pipes[i].x + pipes[i].topImage.width / 2;
    const birdCenter = bird.x + bird.image.width / 2;

    if (!pipes[i].passed && pipeCenter < birdCenter) {
      pipes[i].passed = true;
      const points = game.activePowerUps.getMultiplier();
      score += points;
      earnedPoint.currentTime = 0;
      earnedPoint.play();

      // Emit score particles
      game.particleSystem.emitScore(
        bird.x + bird.image.width,
        bird.y + bird.image.height / 2
      );

      // Extra particles for double points
      if (points > 1) {
        game.particleSystem.emit(
          bird.x + bird.image.width,
          bird.y + bird.image.height / 2,
          5,
          "#f1c40f"
        );
      }
    }

    i++;
  }

  // Update and check power-ups
  const birdCenterX = bird.x + bird.image.width / 2;
  const birdCenterY = bird.y + bird.image.height / 2;

  game.powerUps = game.powerUps.filter((powerUp) => {
    powerUp.update(currentSpeed);

    // Remove if off-screen
    if (powerUp.x < -30) return false;

    // Check collection
    if (powerUp.checkCollision(bird)) {
      powerUp.collected = true;
      game.activePowerUps.activate(powerUp.type);
      powerUpSound.currentTime = 0;
      powerUpSound.play();

      // Visual feedback
      game.particleSystem.emit(powerUp.x, powerUp.y, 10, powerUp.config.color);

      return false;
    }

    return true;
  });

  // Update and check coins
  const magnetActive = game.activePowerUps.isActive("magnet");

  game.coins = game.coins.filter((coin) => {
    coin.update(currentSpeed, magnetActive, birdCenterX, birdCenterY);

    // Remove if off-screen
    if (coin.x < -20) return false;

    // Check collection
    if (coin.checkCollision(bird, magnetActive)) {
      coin.collected = true;
      sessionCoins++;
      coinSound.currentTime = 0;
      coinSound.play();

      // Visual feedback
      game.particleSystem.emit(coin.x, coin.y, 5, "#FFD700");

      return false;
    }

    return true;
  });
}

function resetGame() {
  bird.reset(150);
  pipes.length = 0;
  pipeGenerator.reset();
  pipes.push(
    pipeGenerator.generate(
      canvas.width,
      CONFIG.GAP_PIXELS,
      game.modeFeatures.movingPipes
    )
  );
  score = 0;
  sessionCoins = 0;
  foregroundX = 0;
  game.particleSystem.particles = [];
  game.resetCollectibles();
}

// Game Loop
function gameLoop() {
  updateGame();
  draw();
  requestAnimationFrame(gameLoop);
}

// Inputs & Events
document.addEventListener("keydown", function (event) {
  // Prevent default for game keys to avoid scrolling
  if (["Space", "ArrowUp", "Enter", "Escape"].includes(event.code)) {
    event.preventDefault();
  }

  // Helper to update mode button UI
  function updateModeButtons(modeKey) {
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === modeKey);
    });
  }

  // Mode selection (only on start screen)
  if (game.state === "start") {
    const modeKeys = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"];
    const modeIndex = modeKeys.indexOf(event.code);
    if (modeIndex !== -1) {
      const modeKey = Object.keys(GAME_MODES)[modeIndex];
      if (modeKey) {
        game.setMode(modeKey);
        updateModeButtons(modeKey);
        updateHighScoreDisplay();
        resetGame();
      }
    }
    // Also support numpad
    const numpadKeys = ["Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5"];
    const numpadIndex = numpadKeys.indexOf(event.code);
    if (numpadIndex !== -1) {
      const modeKey = Object.keys(GAME_MODES)[numpadIndex];
      if (modeKey) {
        game.setMode(modeKey);
        updateModeButtons(modeKey);
        updateHighScoreDisplay();
        resetGame();
      }
    }
  }

  if (game.state === "playing") {
    if (event.code === "Space" || event.code === "ArrowUp") {
      moveUp();
    } else if (event.code === "Escape" || event.code === "KeyP") {
      game.pauseGame();
    }
  } else if (game.state === "start" && event.code === "Enter") {
    game.startGame();
  } else if (
    game.state === "paused" &&
    (event.code === "Enter" || event.code === "KeyP")
  ) {
    game.startGame();
  } else if (game.state === "end" && event.code === "Enter") {
    resetGame();
    game.startGame();
  }
});

// Touch/click support for mobile
canvas.addEventListener("click", function () {
  if (game.state === "playing") {
    moveUp();
  } else if (game.state === "start") {
    game.startGame();
  } else if (game.state === "end") {
    resetGame();
    game.startGame();
  }
});

canvas.addEventListener("touchstart", function (event) {
  event.preventDefault();
  if (game.state === "playing") {
    moveUp();
  } else if (game.state === "start") {
    game.startGame();
  } else if (game.state === "end") {
    resetGame();
    game.startGame();
  }
});

// Start the game loop
gameLoop();

// Settings
const Settings = {
  // Default values
  defaults: {
    difficulty: "normal",
    soundEnabled: true,
    volume: 30,
    gravity: 40,
    flapPower: 70,
    particlesEnabled: true,
    screenShakeEnabled: true,
  },

  // Current values
  current: {},

  // Difficulty presets
  difficultyPresets: {
    easy: {
      gravity: 30,
      flapPower: 80,
      gapPixels: 140,
      pipeSpeed: 1.5,
    },
    normal: {
      gravity: 40,
      flapPower: 70,
      gapPixels: 120,
      pipeSpeed: 2,
    },
    hard: {
      gravity: 55,
      flapPower: 60,
      gapPixels: 95,
      pipeSpeed: 2.5,
    },
  },

  init() {
    // Load saved settings or use defaults
    const saved = localStorage.getItem("flappySettings");
    this.current = saved ? JSON.parse(saved) : { ...this.defaults };
    this.applySettings();
    this.setupEventListeners();
    this.updateUI();
  },

  save() {
    localStorage.setItem("flappySettings", JSON.stringify(this.current));
  },

  applySettings() {
    // Apply difficulty preset
    const preset = this.difficultyPresets[this.current.difficulty];
    if (preset) {
      CONFIG.GRAVITY = preset.gravity / 100;
      CONFIG.FLAP_VELOCITY = -(preset.flapPower / 10);
      CONFIG.GAP_PIXELS = preset.gapPixels;
      CONFIG.PIPE_SPEED = preset.pipeSpeed;
    }

    // Apply custom physics if not using preset
    if (
      this.current.gravity !== this.defaults.gravity ||
      this.current.flapPower !== this.defaults.flapPower
    ) {
      CONFIG.GRAVITY = this.current.gravity / 100;
      CONFIG.FLAP_VELOCITY = -(this.current.flapPower / 10);
    }

    // Apply audio settings
    fly.volume = this.current.soundEnabled ? this.current.volume / 100 : 0;
    earnedPoint.volume = this.current.soundEnabled
      ? this.current.volume / 100
      : 0;
  },

  updateUI() {
    // Difficulty buttons
    document.querySelectorAll(".diff-btn").forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.dataset.difficulty === this.current.difficulty
      );
    });

    // Toggles
    document.getElementById("sound-toggle").checked = this.current.soundEnabled;
    document.getElementById("particles-toggle").checked =
      this.current.particlesEnabled;
    document.getElementById("screenshake-toggle").checked =
      this.current.screenShakeEnabled;

    // Sliders
    document.getElementById("volume-slider").value = this.current.volume;
    document.getElementById("volume-value").textContent =
      this.current.volume + "%";

    document.getElementById("gravity-slider").value = this.current.gravity;
    document.getElementById("gravity-value").textContent = (
      this.current.gravity / 100
    ).toFixed(2);

    document.getElementById("flap-slider").value = this.current.flapPower;
    document.getElementById("flap-value").textContent = (
      this.current.flapPower / 10
    ).toFixed(1);
  },

  setupEventListeners() {
    const modal = document.getElementById("settings-modal");
    const settingsBtn = document.getElementById("settings-btn");
    const closeBtn = document.getElementById("settings-close");
    const overlay = document.getElementById("settings-overlay");

    // Open/close modal
    settingsBtn.addEventListener("click", () => {
      modal.classList.add("active");
      if (game.state === "playing") {
        game.pauseGame();
      }
    });

    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    overlay.addEventListener("click", () => modal.classList.remove("active"));

    // Difficulty buttons
    document.querySelectorAll(".diff-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.current.difficulty = btn.dataset.difficulty;
        const preset = this.difficultyPresets[this.current.difficulty];
        this.current.gravity = preset.gravity;
        this.current.flapPower = (preset.flapPower * 10) / 10; // Normalize
        this.save();
        this.applySettings();
        this.updateUI();
        // Update high score display for new difficulty
        updateHighScoreDisplay();
        // Sync difficulty pills in panel
        updatePanelStats();
      });
    });

    // Sound toggle
    document.getElementById("sound-toggle").addEventListener("change", (e) => {
      this.current.soundEnabled = e.target.checked;
      this.save();
      this.applySettings();
    });

    // Volume slider
    document.getElementById("volume-slider").addEventListener("input", (e) => {
      this.current.volume = parseInt(e.target.value);
      document.getElementById("volume-value").textContent =
        this.current.volume + "%";
      this.save();
      this.applySettings();
    });

    // Gravity slider
    document.getElementById("gravity-slider").addEventListener("input", (e) => {
      this.current.gravity = parseInt(e.target.value);
      document.getElementById("gravity-value").textContent = (
        this.current.gravity / 100
      ).toFixed(2);
      this.save();
      this.applySettings();
    });

    // Flap power slider
    document.getElementById("flap-slider").addEventListener("input", (e) => {
      this.current.flapPower = parseInt(e.target.value);
      document.getElementById("flap-value").textContent = (
        this.current.flapPower / 10
      ).toFixed(1);
      this.save();
      this.applySettings();
    });

    // Particles toggle
    document
      .getElementById("particles-toggle")
      .addEventListener("change", (e) => {
        this.current.particlesEnabled = e.target.checked;
        this.save();
      });

    // Screen shake toggle
    document
      .getElementById("screenshake-toggle")
      .addEventListener("change", (e) => {
        this.current.screenShakeEnabled = e.target.checked;
        this.save();
      });

    // Reset high score
    document.getElementById("reset-highscore").addEventListener("click", () => {
      if (confirm("Are you sure you want to reset all high scores?")) {
        // Reset all mode+difficulty combinations
        const modes = ["classic", "wind", "moving", "powerup", "chaos"];
        const difficulties = ["easy", "normal", "hard"];
        game.highScores = {};
        modes.forEach((mode) => {
          difficulties.forEach((diff) => {
            game.highScores[`${mode}_${diff}`] = 0;
          });
        });
        game.saveHighScores();
        document.getElementById("high-score").textContent = "0";
      }
    });

    // Reset to defaults
    document.getElementById("reset-settings").addEventListener("click", () => {
      if (confirm("Reset all settings to default?")) {
        this.current = { ...this.defaults };
        this.save();
        this.applySettings();
        this.updateUI();
      }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.code === "Escape" && modal.classList.contains("active")) {
        modal.classList.remove("active");
      }
    });
  },
};

// Override particle and screen shake methods to respect settings
const originalEmitScore = game.particleSystem.emitScore.bind(
  game.particleSystem
);
game.particleSystem.emitScore = function (x, y) {
  if (Settings.current.particlesEnabled) {
    originalEmitScore(x, y);
  }
};

const originalEmitDeath = game.particleSystem.emitDeath.bind(
  game.particleSystem
);
game.particleSystem.emitDeath = function (x, y) {
  if (Settings.current.particlesEnabled) {
    originalEmitDeath(x, y);
  }
};

const originalTriggerScreenShake = game.triggerScreenShake.bind(game);
game.triggerScreenShake = function () {
  if (Settings.current.screenShakeEnabled) {
    originalTriggerScreenShake();
  }
};

// Initialize settings
Settings.init();

// Mode button event listeners
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    if (mode && GAME_MODES[mode] && !game.playing) {
      // Update active state
      document
        .querySelectorAll(".mode-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Change mode
      game.setMode(mode);
      updateHighScoreDisplay();
      updatePanelStats();
    }
  });
});

// Difficulty pill event listeners (in right panel)
document.querySelectorAll(".diff-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    const difficulty = btn.dataset.difficulty;
    if (difficulty && Settings.difficultyPresets[difficulty]) {
      // Update pill active state
      document
        .querySelectorAll(".diff-pill")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Also update settings modal buttons
      document.querySelectorAll(".diff-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.difficulty === difficulty);
      });

      // Apply the difficulty
      Settings.current.difficulty = difficulty;
      const preset = Settings.difficultyPresets[difficulty];
      Settings.current.gravity = preset.gravity;
      Settings.current.flapPower = (preset.flapPower * 10) / 10;
      Settings.save();
      Settings.applySettings();
      Settings.updateUI();

      // Update displays
      updateHighScoreDisplay();
      updatePanelStats();
    }
  });
});

// Update high score display for current mode
function updateHighScoreDisplay() {
  const highScoreElement = document.getElementById("high-score");
  if (highScoreElement) {
    highScoreElement.textContent = game.getHighScore();
  }
  // Also update panel high score
  const panelHighScore = document.getElementById("panel-high-score");
  if (panelHighScore) {
    panelHighScore.textContent = game.getHighScore();
  }
}

// Update panel stats (mode display)
function updatePanelStats() {
  const panelMode = document.getElementById("panel-mode");
  if (panelMode) {
    const mode = GAME_MODES[game.currentMode];
    panelMode.textContent = mode.name;
    panelMode.style.color = mode.color;
  }

  // Sync difficulty pills with current setting
  document.querySelectorAll(".diff-pill").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.dataset.difficulty === Settings.current.difficulty
    );
  });
}

// Update total coins display
function updateTotalCoinsDisplay() {
  const coinsElement = document.getElementById("total-coins");
  if (coinsElement) {
    coinsElement.textContent = game.totalCoins;
  }
}

// Call on load
updateTotalCoinsDisplay();
updateHighScoreDisplay();
updatePanelStats();
