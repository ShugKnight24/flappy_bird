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

const gapPixels = 100;
const backgroundImage = new GameAsset('img/background.png');
const foregroundImage = new GameAsset('img/foreground.png');

// Not sure why this isn't working correctly...
// const gapHeight = topPipeImage.height + gapPixels;

// Work around
const topPipeHeight = 242;
const gapHeight = topPipeHeight + gapPixels;

let birdX = 10;
let birdY = 150;

const gravity = 1;


let bird = new Bird(10, 150);
let pipes = [new Pipe(canvas.width, 0)];
let score = 0;

const fly = new AudioAsset('audio/fly.mp3');
const earnedPoint = new AudioAsset('audio/score.mp3');

// Draw to canvas
function draw(){

	ctx.drawImage(backgroundImage, 0, 0);

	ctx.drawImage(foregroundImage, 0, canvas.height - foregroundImage.height);

	for (let i = 0; i < pipe.length; i++) {

		ctx.drawImage(topPipeImage, pipe[i].x, pipe[i].y);

		ctx.drawImage(bottomPipeImage, pipe[i].x, pipe[i].y + gapHeight);

		pipe[i].x--;

		if (pipe[i].x === 100){
			pipe.push({
				x: canvas.width,
				y: Math.floor(Math.random() * topPipeImage.height) - topPipeImage.height
			});
		}

		// Collision Detection
		if (birdX + birdImage.width >= pipe[i].x && birdX <= pipe[i].x + topPipeImage.width && (birdY <= pipe[i].y + topPipeImage.height || birdY + birdImage.height >= pipe[i].y + gapHeight) || birdY + birdImage.height >= canvas.height - foregroundImage.height){
			location.reload()
		}

		if (pipe[i].x === 5){
			score++;
			earnedPoint.play();
		}

	}

	ctx.drawImage(birdImage, birdX, birdY);

	birdY += gravity;

	ctx.fillStyle = '#000000';

	ctx.font = '20px Verdana';

	ctx.fillText('Score: ' + score, 10, canvas.height - 20);

	requestAnimationFrame(draw);

}

draw();

// Bird movement
function moveUp(){
	birdY -= 20;
	fly.play();
}

document.addEventListener('keydown', moveUp);
