'use strict';

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

const birdImage = new Image();
birdImage.src = 'img/bird.png';

const backgroundImage = new Image();
backgroundImage.src = 'img/background.png';

const foregroundImage = new Image();
foregroundImage.src = 'img/foreground.png';

const topPipeImage = new Image();
topPipeImage.src = 'img/top_pipe.png';

const bottomPipeImage = new Image();
bottomPipeImage.src = 'img/bottom_pipe.png';

const gapPixels = 100;

// Not sure why this isn't working correctly...
// const gapHeight = topPipeImage.height + gapPixels;

// Work around
const topPipeHeight = 242;
const gapHeight = topPipeHeight + gapPixels;

let birdX = 10;
let birdY = 150;

const gravity = 1;

// Pipe generation
let pipe = [];

pipe[0] = {
	x: canvas.width,
	y: 0
}

let score = 0;

const fly = new Audio();
fly.src = 'audio/fly.mp3';

const earnedPoint = new Audio();
earnedPoint.src = 'audio/score.mp3';

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
