// arcade.js – Mini Arcade Widget
// Implements two simple games: Snake and Breakout.
// Uses the same <canvas id=\"game-canvas\"> defined in index.html.
// The UI buttons (Snake / Breakout) switch between games.

(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const btnSnake = document.getElementById('btn-snake');
  const btnBreakout = document.getElementById('btn-breakout');
  const btnReset = document.getElementById('btn-reset');

  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const FPS = 60;

  let gameLoop = null; // reference to requestAnimationFrame
  let currentGame = null; // 'snake' | 'breakout'

  // ---------- Utility ----------
  function clear() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // ---------- Snake Game ----------
  const snakeGame = {
    gridSize: 20,
    cols: WIDTH / 20,
    rows: HEIGHT / 20,
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    snake: [],
    food: { x: 0, y: 0 },
    speed: 8, // moves per second
    moveCounter: 0,
    init() {
      this.snake = [{ x: 5, y: 5 }];
      this.direction = { x: 1, y: 0 };
      this.nextDirection = { x: 1, y: 0 };
      this.placeFood();
      this.moveCounter = 0;
    },
    placeFood() {
      const rand = () => Math.floor(Math.random() * this.cols);
      this.food = { x: rand(), y: rand() };
    },
    update(delta) {
      this.moveCounter += delta;
      const interval = 1 / this.speed;
      if (this.moveCounter >= interval) {
        this.moveCounter -= interval;
        // Apply pending direction (prevent reverse)
        if (!((this.nextDirection.x === -this.direction.x) && (this.nextDirection.y === -this.direction.y))) {
          this.direction = this.nextDirection;
        }
        // Compute new head
        const newHead = {
          x: (this.snake[0].x + this.direction.x + this.cols) % this.cols,
          y: (this.snake[0].y + this.direction.y + this.rows) % this.rows,
        };
        // Check self‑collision
        if (this.snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          // Game over – reset
          this.init();
          return;
        }
        this.snake.unshift(newHead);
        // Eat food?
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
          this.placeFood();
        } else {
          this.snake.pop(); // move forward without growing
        }
      }
    },
    draw() {
      clear();
      // Draw food
      ctx.fillStyle = '#ff5555';
      ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize, this.gridSize);
      // Draw snake
      ctx.fillStyle = '#00ff99';
      for (const seg of this.snake) {
        ctx.fillRect(seg.x * this.gridSize, seg.y * this.gridSize, this.gridSize, this.gridSize);
      }
    },
  };

  // ---------- Breakout Game ----------
  const breakoutGame = {
    paddle: { x: WIDTH / 2 - 40, y: HEIGHT - 20, w: 80, h: 8 },
    ball: { x: WIDTH / 2, y: HEIGHT / 2, r: 6, vx: 3, vy: -3 },
    bricks: [],
    rows: 4,
    cols: 6,
    brickWidth: 45,
    brickHeight: 15,
    brickPadding: 5,
    init() {
      // Reset paddle & ball
      this.paddle.x = WIDTH / 2 - this.paddle.w / 2;
      this.ball.x = WIDTH / 2;
      this.ball.y = HEIGHT / 2;
      this.ball.vx = 3 * (Math.random() > 0.5 ? 1 : -1);
      this.ball.vy = -3;
      // Build bricks
      this.bricks = [];
      const offsetX = (WIDTH - (this.cols * (this.brickWidth + this.brickPadding)) + this.brickPadding) / 2;
      const offsetY = 30;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          this.bricks.push({
            x: offsetX + c * (this.brickWidth + this.brickPadding),
            y: offsetY + r * (this.brickHeight + this.brickPadding),
            w: this.brickWidth,
            h: this.brickHeight,
            alive: true,
          });
        }
      }
    },
    update(delta) {
      // Move ball
      this.ball.x += this.ball.vx;
      this.ball.y += this.ball.vy;

      // Wall collisions
      if (this.ball.x - this.ball.r < 0 || this.ball.x + this.ball.r > WIDTH) this.ball.vx *= -1;
      if (this.ball.y - this.ball.r < 0) this.ball.vy *= -1;
      // Bottom – reset game
      if (this.ball.y - this.ball.r > HEIGHT) this.init();

      // Paddle collision
      const p = this.paddle;
      if (this.ball.y + this.ball.r >= p.y && this.ball.x > p.x && this.ball.x < p.x + p.w) {
        this.ball.vy = -Math.abs(this.ball.vy);
        // Slight angle change based on hit position
        const hitPos = (this.ball.x - p.x) / p.w - 0.5; // -0.5 .. 0.5
        this.ball.vx += hitPos * 2;
      }

      // Brick collisions
      for (const b of this.bricks) {
        if (!b.alive) continue;
        if (
          this.ball.x + this.ball.r > b.x &&
          this.ball.x - this.ball.r < b.x + b.w &&
          this.ball.y + this.ball.r > b.y &&
          this.ball.y - this.ball.r < b.y + b.h
        ) {
          b.alive = false;
          this.ball.vy *= -1;
          break;
        }
      }
    },
    draw() {
      clear();
      // Draw paddle
      ctx.fillStyle = '#ffcc33';
      const p = this.paddle;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // Draw ball
      ctx.fillStyle = '#ff5555';
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
      ctx.fill();
      // Draw bricks
      ctx.fillStyle = '#33aaff';
      for (const b of this.bricks) {
        if (b.alive) {
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
      }
    },
  };

  // ---------- Flappy Finn Game ----------
  const flappyGame = {
    gravity: 0.5,
    flapStrength: -8,
    bird: { x: 50, y: 150, w: 20, h: 20, vy: 0 },
    pipes: [], // each pipe: {x, top, bottom, width}
    pipeSpacing: 180, // pixels between pipes
    pipeWidth: 40,
    gapHeight: 100,
    speed: 2,
    frameCount: 0,
    init() {
      this.bird = { x: 50, y: HEIGHT / 2, w: 20, h: 20, vy: 0 };
      this.pipes = [];
      this.frameCount = 0;
    },
    update(dt) {
      // Bird physics
      this.bird.vy += this.gravity;
      this.bird.y += this.bird.vy;

      // Add a new pipe at regular intervals
      this.frameCount++;
      if (this.frameCount * (1000 / 60) > this.pipeSpacing) {
        this.frameCount = 0;
        const gapY = 50 + Math.random() * (HEIGHT - this.gapHeight - 100);
        this.pipes.push({
          x: WIDTH,
          top: gapY,
          bottom: gapY + this.gapHeight,
          width: this.pipeWidth,
        });
      }

      // Move pipes left
      for (const p of this.pipes) p.x -= this.speed;

      // Remove off‑screen pipes
      this.pipes = this.pipes.filter(p => p.x + p.width > 0);

      // Collision with floor or ceiling
      if (this.bird.y + this.bird.h > HEIGHT || this.bird.y < 0) {
        this.init();
        return;
      }

      // Collision with pipes
      for (const p of this.pipes) {
        // top pipe collision
        if (this.bird.x < p.x + p.width && this.bird.x + this.bird.w > p.x && this.bird.y < p.top) {
          this.init();
          return;
        }
        // bottom pipe collision
        if (this.bird.x < p.x + p.width && this.bird.x + this.bird.w > p.x && this.bird.y + this.bird.h > p.bottom) {
          this.init();
          return;
        }
      }
    },
    draw() {
      clear();
      // Draw bird (Finn silhouette)
      ctx.fillStyle = '#ffcc33';
      ctx.fillRect(this.bird.x, this.bird.y, this.bird.w, this.bird.h);
      // Draw pipes
      ctx.fillStyle = '#44ff44';
      for (const p of this.pipes) {
        // top pipe
        ctx.fillRect(p.x, 0, p.width, p.top);
        // bottom pipe
        ctx.fillRect(p.x, p.bottom, p.width, HEIGHT - p.bottom);
      }
    },
    flap() {
      this.bird.vy = this.flapStrength;
    },
  };

// ---------- Input handling ----------
  window.addEventListener('keydown', e => {
    if (currentGame === 'snake') {
      switch (e.key) {
        case 'ArrowUp': snakeGame.nextDirection = { x: 0, y: -1 }; break;
        case 'ArrowDown': snakeGame.nextDirection = { x: 0, y: 1 }; break;
        case 'ArrowLeft': snakeGame.nextDirection = { x: -1, y: 0 }; break;
        case 'ArrowRight': snakeGame.nextDirection = { x: 1, y: 0 }; break;
      }
    }
    if (currentGame === 'breakout') {
      const step = 15;
      if (e.key === 'ArrowLeft') breakoutGame.paddle.x = Math.max(0, breakoutGame.paddle.x - step);
      if (e.key === 'ArrowRight') breakoutGame.paddle.x = Math.min(WIDTH - breakoutGame.paddle.w, breakoutGame.paddle.x + step);
    }
  });

  // ---------- Game control ----------
  function startGame(name) {
    currentGame = name;
    if (name === 'snake') snakeGame.init();
    if (name === 'breakout') breakoutGame.init();
  }

  btnSnake.addEventListener('click', () => startGame('snake'));
  btnBreakout.addEventListener('click', () => startGame('breakout'));
  btnReset.addEventListener('click', () => {
    if (currentGame) {
      if (currentGame === 'snake') snakeGame.init();
      if (currentGame === 'breakout') breakoutGame.init();
    }
  });

  // ---------- Main loop ----------
  let lastTime = performance.now();
  function loop(now) {
    const delta = (now - lastTime) / 1000; // seconds
    lastTime = now;
    if (currentGame === 'snake') {
      snakeGame.update(delta);
      snakeGame.draw();
    } else if (currentGame === 'breakout') {
      breakoutGame.update(delta);
      breakoutGame.draw();
    } else {
      clear();
    }
    gameLoop = requestAnimationFrame(loop);
  }
  loop(performance.now());
})();
