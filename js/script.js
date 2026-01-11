"use strict";

// ============================================
// GAME CONFIGURATION
// ============================================
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

// ============================================
// CORE CLASSES
// ============================================
class Game {
  constructor() {
    this.state = "start";
    this.highScore = this.loadHighScore();
    this.difficulty = 1;
    this.screenShake = { active: false, intensity: 0, startTime: 0 };
    this.particleSystem = new ParticleSystem();
  }

  loadHighScore() {
    return parseInt(localStorage.getItem("flappyHighScore")) || 0;
  }

  saveHighScore() {
    localStorage.setItem("flappyHighScore", this.highScore.toString());
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
    return Math.min(CONFIG.MAX_PIPE_SPEED, CONFIG.PIPE_SPEED + increase);
  }
}

// ============================================
// PARTICLE SYSTEM
// ============================================
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

// ============================================
// GAME ASSETS
// ============================================
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

// ============================================
// BIRD CLASS - Enhanced Physics
// ============================================
class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.velocity = 0; // Current vertical velocity
    this.rotation = 0; // Current rotation angle
    this.flapCooldown = 0; // Prevents spam flapping
    this.image = new GameAsset("img/bird.png");
  }

  flap() {
    if (this.flapCooldown > 0) return false;

    this.velocity = CONFIG.FLAP_VELOCITY;
    this.flapCooldown = 5; // 5 frames cooldown
    return true;
  }

  update() {
    // Apply gravity
    this.velocity += CONFIG.GRAVITY;

    // Clamp velocity
    this.velocity = Math.max(
      CONFIG.MAX_RISE_SPEED,
      Math.min(CONFIG.MAX_FALL_SPEED, this.velocity)
    );

    // Update position
    this.y += this.velocity;

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

    // Update cooldown
    if (this.flapCooldown > 0) this.flapCooldown--;
  }

  reset(y) {
    this.y = y;
    this.velocity = 0;
    this.rotation = 0;
    this.flapCooldown = 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(
      this.x + this.image.width / 2,
      this.y + this.image.height / 2
    );
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2);
    ctx.restore();
  }
}

// ============================================
// PIPE CLASS - Smart Generation
// ============================================
class Pipe {
  constructor(x, y, gap) {
    this.x = x;
    this.y = y;
    this.gap = gap || CONFIG.GAP_PIXELS;
    this.passed = false; // Track if bird passed this pipe
    this.topImage = new GameAsset("img/top_pipe.png");
    this.bottomImage = new GameAsset("img/bottom_pipe.png");
  }

  getGapHeight() {
    return CONFIG.TOP_PIPE_HEIGHT + this.gap;
  }
}

// Smart pipe generator that ensures playability
class PipeGenerator {
  constructor() {
    this.lastPipeY = null;
  }

  generate(x, currentGap) {
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
    return new Pipe(x, newY, currentGap);
  }

  reset() {
    this.lastPipeY = null;
  }
}

// ============================================
// INITIALIZE GAME
// ============================================
const game = new Game();
const pipeGenerator = new PipeGenerator();

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const backgroundImage = new GameAsset("img/background.png");
const foregroundImage = new GameAsset("img/foreground.png");

const bird = new Bird(50, 150);
const pipes = [pipeGenerator.generate(canvas.width, CONFIG.GAP_PIXELS)];
let score = 0;
let frameCount = 0;

// Foreground scrolling
let foregroundX = 0;

const fly = new AudioAsset("audio/fly.mp3");
const earnedPoint = new AudioAsset("audio/score.mp3");

// ============================================
// COLLISION DETECTION
// ============================================
const checkCollision = (pipe, bird) => {
  // Get bird bounding box (slightly smaller for fair gameplay)
  const birdPadding = 3;
  const birdLeft = bird.x + birdPadding;
  const birdRight = bird.x + bird.image.width - birdPadding;
  const birdTop = bird.y + birdPadding;
  const birdBottom = bird.y + bird.image.height - birdPadding;

  // Pipe bounds
  const pipeLeft = pipe.x;
  const pipeRight = pipe.x + pipe.topImage.width;
  const topPipeBottom = pipe.y + CONFIG.TOP_PIPE_HEIGHT;
  const bottomPipeTop = pipe.y + pipe.getGapHeight();

  // Check horizontal overlap
  const horizontalOverlap = birdRight > pipeLeft && birdLeft < pipeRight;

  // Check pipe collisions
  const hitTopPipe = birdTop < topPipeBottom;
  const hitBottomPipe = birdBottom > bottomPipeTop;

  // Check ground collision
  const hitGround = birdBottom >= canvas.height - foregroundImage.height;

  // Check ceiling collision
  const hitCeiling = birdTop <= 0;

  return (
    (horizontalOverlap && (hitTopPipe || hitBottomPipe)) ||
    hitGround ||
    hitCeiling
  );
};

// ============================================
// RENDERING
// ============================================
function drawGame() {
  const shake = game.updateScreenShake();

  ctx.save();
  ctx.translate(shake.x, shake.y);

  // Background
  ctx.drawImage(backgroundImage, 0, 0);

  // Pipes
  for (let i = 0; i < pipes.length; i++) {
    ctx.drawImage(pipes[i].topImage, pipes[i].x, pipes[i].y);
    ctx.drawImage(
      pipes[i].bottomImage,
      pipes[i].x,
      pipes[i].y + pipes[i].getGapHeight()
    );
  }

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

  // Bird with rotation
  bird.draw(ctx);

  // Particles
  game.particleSystem.draw(ctx);

  // Score display with shadow for readability
  ctx.fillStyle = "#000";
  ctx.font = "bold 24px Verdana";
  ctx.fillText("Score: " + score, 12, canvas.height - 18);
  ctx.fillStyle = "#FFF";
  ctx.fillText("Score: " + score, 10, canvas.height - 20);

  // Difficulty indicator
  const currentDifficulty =
    Math.floor(score / CONFIG.DIFFICULTY_INCREASE_SCORE) + 1;
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 12px Verdana";
  ctx.fillText("Level " + currentDifficulty, 10, 20);

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
  ctx.fillText("Flappy Bird", canvas.width / 2, canvas.height / 3);

  // Instructions
  ctx.font = "16px Verdana";
  ctx.fillText("Press ENTER to Start", canvas.width / 2, canvas.height / 2);
  ctx.fillText("Space or ↑ to Flap", canvas.width / 2, canvas.height / 2 + 30);

  // Animated bird preview
  const previewY = canvas.height / 3 + 30 + Math.sin(frameCount * 0.1) * 10;
  ctx.drawImage(bird.image, canvas.width / 2 - bird.image.width / 2, previewY);

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
  ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 - 10);

  if (score >= game.highScore && score > 0) {
    ctx.fillStyle = "#FFD700";
    ctx.fillText("NEW HIGH SCORE!", canvas.width / 2, canvas.height / 2 + 20);
  }

  ctx.fillStyle = "#FFF";
  ctx.font = "16px Verdana";
  ctx.fillText(
    "Press ENTER to Restart",
    canvas.width / 2,
    canvas.height / 2 + 60
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

// ============================================
// GAME LOGIC
// ============================================
function moveUp() {
  if (bird.flap()) {
    fly.currentTime = 0; // Reset audio to allow rapid plays
    fly.play();
  }
}

function updateGame() {
  if (game.state !== "playing") return;

  // Update bird physics
  bird.update();

  // Update foreground scrolling
  foregroundX -= game.getCurrentSpeed();
  if (foregroundX <= -foregroundImage.width) {
    foregroundX = 0;
  }

  // Update particles
  game.particleSystem.update();

  // Update pipes
  const currentSpeed = game.getCurrentSpeed();
  const currentGap = game.getCurrentGap();

  let i = 0;
  while (i < pipes.length) {
    pipes[i].x -= currentSpeed;

    // Spawn new pipe
    if (
      !pipes[i].passed &&
      pipes[i].x < canvas.width - CONFIG.PIPE_SPAWN_DISTANCE
    ) {
      // Check if we need a new pipe
      const lastPipe = pipes[pipes.length - 1];
      if (lastPipe.x < canvas.width - CONFIG.PIPE_SPAWN_DISTANCE) {
        pipes.push(pipeGenerator.generate(canvas.width, currentGap));
      }
    }

    // Remove off-screen pipes
    if (pipes[i].x < -pipes[i].topImage.width) {
      pipes.splice(i, 1);
      continue;
    }

    // Check collision
    if (checkCollision(pipes[i], bird)) {
      game.particleSystem.emitDeath(
        bird.x + bird.image.width / 2,
        bird.y + bird.image.height / 2
      );
      if (score > game.highScore) {
        game.highScore = score;
        game.saveHighScore();
      }
      game.endGame();
      return;
    }

    // Score when passing pipe center
    const pipeCenter = pipes[i].x + pipes[i].topImage.width / 2;
    const birdCenter = bird.x + bird.image.width / 2;

    if (!pipes[i].passed && pipeCenter < birdCenter) {
      pipes[i].passed = true;
      score++;
      earnedPoint.currentTime = 0;
      earnedPoint.play();

      // Emit score particles
      game.particleSystem.emitScore(
        bird.x + bird.image.width,
        bird.y + bird.image.height / 2
      );
    }

    i++;
  }
}

function resetGame() {
  bird.reset(150);
  pipes.length = 0;
  pipeGenerator.reset();
  pipes.push(pipeGenerator.generate(canvas.width, CONFIG.GAP_PIXELS));
  score = 0;
  foregroundX = 0;
  game.particleSystem.particles = [];
}

// ============================================
// GAME LOOP
// ============================================
function gameLoop() {
  updateGame();
  draw();
  requestAnimationFrame(gameLoop);
}

// ============================================
// INPUT HANDLING
// ============================================
document.addEventListener("keydown", function (event) {
  // Prevent default for game keys to avoid scrolling
  if (["Space", "ArrowUp", "Enter", "Escape"].includes(event.code)) {
    event.preventDefault();
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

// ============================================
// SETTINGS SYSTEM
// ============================================
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
      if (confirm("Are you sure you want to reset your high score?")) {
        game.highScore = 0;
        game.saveHighScore();
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
