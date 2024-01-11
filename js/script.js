'use strict';

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

class Pipe {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.topImage = new GameAsset('img/top_pipe.png');
    this.bottomImage = new GameAsset('img/bottom_pipe.png');
  }
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// const loadAssets = new Promise((resolve, reject) => {
//
// });
//
// loadAssets
// 	.then(data => {
// 		console.log(data);
// 	})
// 	.catch(err => {
// 		console.error(err);
// 	});

const backgroundImage = new GameAsset('img/background.png');
const foregroundImage = new GameAsset('img/foreground.png');

// Not sure why this isn't working correctly...
// const gapHeight = topPipeImage.height + gapPixels;

// Work around
const GAP_PIXELS = 100;
const TOP_PIPE_HEIGHT = 242;
const GAP_HEIGHT = TOP_PIPE_HEIGHT + GAP_PIXELS;
const GRAVITY = 1;

let bird = new Bird(10, 150);
let pipes = [new Pipe(canvas.width, 0)];
let score = 0;

const fly = new AudioAsset('audio/fly.mp3');
const earnedPoint = new AudioAsset('audio/score.mp3');

// Draw to canvas
function draw(){
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

// Bird movement
function moveUp(){
	bird.y -= 20;
	fly.play();
}

function updateGame() {
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
			// Collision Detection
			if (bird.x + bird.image.width >= pipes[i].x && bird.x <= pipes[i].x + pipes[i].topImage.width && (
				bird.y <= pipes[i].y + pipes[i].topImage.height || bird.y + bird.image.height >= pipes[i].y + GAP_HEIGHT
				) || bird.y + bird.image.height >= canvas.height - foregroundImage.height){
				location.reload() // Reload the page
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

document.addEventListener('keydown', moveUp);
