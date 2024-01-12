'use strict';

class Game {
	constructor() {
		this.state = 'start';
	}

	endGame() {
		this.state = 'end';
	}

	pauseGame() {
		this.state = 'paused';
	}

	startGame() {
		this.state = 'playing';
	}
}

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
    return asset;
  }
}

class Bird {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.image = new GameAsset('img/bird.png');
  }
}

// TODO: Figure out a way to make the next pipe always doable compared to the previous pipe
class Pipe {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.topImage = new GameAsset('img/top_pipe.png');
    this.bottomImage = new GameAsset('img/bottom_pipe.png');
  }
}

const game = new Game();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const backgroundImage = new GameAsset('img/background.png');
const foregroundImage = new GameAsset('img/foreground.png');

const GAP_PIXELS = 100;
const TOP_PIPE_HEIGHT = 242;
const GAP_HEIGHT = TOP_PIPE_HEIGHT + GAP_PIXELS;
const GRAVITY = 1;

const bird = new Bird(10, 150);
const pipes = [new Pipe(canvas.width, 0)];
let score = 0;

const fly = new AudioAsset('audio/fly.mp3');
const earnedPoint = new AudioAsset('audio/score.mp3');

// Draw game
function drawGame(){
	ctx.drawImage(backgroundImage, 0, 0);

	for (let i = 0; i < pipes.length; i++) {
		ctx.drawImage(pipes[i].topImage, pipes[i].x, pipes[i].y);
		ctx.drawImage(pipes[i].bottomImage, pipes[i].x, pipes[i].y + GAP_HEIGHT);
	}

	ctx.drawImage(foregroundImage, 0, canvas.height - foregroundImage.height);
	ctx.drawImage(bird.image, bird.x, bird.y);

	ctx.fillStyle = '#000';
	ctx.font = '20px Verdana';
	ctx.fillText('Score: ' + score, 10, canvas.height - 20);
}

// TODO: Abstract reusuable code
// TODO: Text rendering makes me want to create screens
// figure out a better way to update text on the canvas
// Draw to canvas
function draw(){
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (game.state === 'start') {
		ctx.fillStyle = '#000';
		ctx.font = '20px Verdana';
		ctx.fillText('Press "Enter" key', 50, canvas.height / 2);
		ctx.fillText('to start', 50, (canvas.height / 2) + 30);
	} else if (game.state === 'paused') {
		ctx.fillStyle = '#000';
		ctx.font = '20px Verdana';
		ctx.fillText('Press the "Enter"', 50, canvas.height / 2);
		ctx.fillText('or "P" keys to unpause', 50, (canvas.height / 2) + 30);
	} else if (game.state === 'end') {
		ctx.fillStyle = '#000';
		ctx.font = '20px Verdana';
		ctx.fillText('Game over', 50, canvas.height / 2);
		ctx.fillText('Press "Enter" key', 50, (canvas.height / 2) + 30);
		ctx.fillText('to restart', 50, (canvas.height / 2) + 60);
	} else if (game.state === 'playing') {
		drawGame();
	}
}

// Bird movement
function moveUp(){
	bird.y -= 20;
	fly.play();
}

const checkCollision = (pipe, bird) => {
	const birdHitTopPipe = bird.y <= pipe.y + pipe.topImage.height;
	const birdHitBottomPipe = bird.y + bird.image.height >= pipe.y + GAP_HEIGHT;
	const birdWithinPipeHorizontal = bird.x + bird.image.width >= pipe.x && bird.x <= pipe.x + pipe.topImage.width;
	const birdHitGround = bird.y + bird.image.height >= canvas.height - foregroundImage.height;

	return birdWithinPipeHorizontal && (birdHitTopPipe || birdHitBottomPipe || birdHitGround);
}

function updateGame() {
	if (game.state !== 'playing') return;
	// Update bird position
	bird.y += GRAVITY;

	let i = 0;
	while (i < pipes.length) {
		pipes[i].x--;

		if (pipes[i].x == 125){
			pipes.push(new Pipe(canvas.width, Math.floor(Math.random() * TOP_PIPE_HEIGHT) - TOP_PIPE_HEIGHT));
		}

		// Remove off-screen pipes
		if (pipes[i].x < -pipes[i].topImage.width) {
			pipes.splice(i, 1);
		} else {
			if (checkCollision(pipes[i], bird)){
				game.endGame();
			}
			// Increase score
			if (pipes[i].x === 5){
				score++;
				earnedPoint.play();
			}

			i++;
		}
	}
}

function gameLoop() {
	updateGame();
	draw();
	requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', function(event){
	if (game.state !== 'playing') return;
	if (event.key === ' ' || event.key === 'ArrowUp'){
		moveUp();
	}
});

// Make this cleaner and abstract out the action keys
document.addEventListener('keydown', function(event) {
  if (game.state === 'start' && event.key === 'Enter') {
    game.startGame();
  } else if (game.state === 'playing' && (event.key === 'Escape' || event.key === 'p')) {
    game.pauseGame();
  } else if (game.state === 'paused' && (event.key === 'Enter' || event.key === 'p')) {
    game.startGame();
  } else if (game.state === 'end' && event.key === 'Enter') {
    game.startGame();
    // Reset game - abstract this into a function
    bird.y = 150;
    pipes.length = 0;
    pipes.push(new Pipe(canvas.width, 0));
    score = 0;
  }
});

gameLoop();
