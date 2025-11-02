/*
 * Jeu Flappy Bird complet avec IA génétique en JavaScript vanilla.
 * Tout le code est commenté en français pour expliquer le fonctionnement.
 */

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const networkCanvas = document.getElementById('networkCanvas');
  const networkCtx = networkCanvas.getContext('2d');
  const chartCanvas = document.getElementById('chartCanvas');
  const chartCtx = chartCanvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('bestScore');
  const generationEl = document.getElementById('generation');
  const aliveEl = document.getElementById('alive');
  const gameOverEl = document.getElementById('gameOver');
  const finalScoreEl = document.getElementById('finalScore');

  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const modeBtn = document.getElementById('modeBtn');
  const overlayRestart = document.getElementById('overlayRestart');
  const speedSelect = document.getElementById('speedSelect');
  const saveBrainBtn = document.getElementById('saveBrain');
  const loadBrainBtn = document.getElementById('loadBrain');
  const clearBrainBtn = document.getElementById('clearBrain');

  const GAME_CONFIG = {
    gravity: 1100,
    jumpVelocity: -320,
    pipeSpeed: 180,
    pipeInterval: 1500,
    pipeWidth: 80,
    minGap: 150,
    maxGap: 220,
    populationSize: 100,
    selectionRate: 0.2,
    mutationRate: 0.15,
    mutationStrength: 0.4,
    groundHeight: 70,
  };

  const STORAGE_KEY = 'flappy-neural-best-brain';

  const SOUNDS = createSounds();

  function playSound(name) {
    const buffer = SOUNDS[name];
    if (!buffer) return;
    const audio = buffer.cloneNode();
    audio.volume = 0.4;
    audio.play().catch(() => {});
  }

  function createSounds() {
    const sounds = {};
    // Génération de petits effets sonores au format PCM encodé en base64.
    sounds.jump = new Audio('data:audio/wav;base64,UklGRuoAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YboAAACAgICAgICAgP9/f39+fn5+fn5+fn5/f3+AgICAgP9/f4CAgICAf39/gICAgICAgH9/f4CAgH9/f4CAgICAf39/f39+fn5+fn5/f3+AgICAf39/f39/gICAgICAgH9/f39/gICAgICAf39/f39+fn5+fn5+fn5+f39/f4CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA=');
    sounds.point = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRwAAAAA/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8');
    sounds.hit = new Audio('data:audio/wav;base64,UklGRpgAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YbAAAAAAAICAgICAgICAgICAgICAgICAf39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/');
    return sounds;
  }

  function randomGaussian() {
    // Méthode de Box-Muller pour générer une variable gaussienne.
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  class Pipe {
    constructor(x, width, gapStart, gapHeight, speed) {
      this.x = x;
      this.width = width;
      this.gapStart = gapStart;
      this.gapHeight = gapHeight;
      this.speed = speed;
      this.scored = false;
    }

    update(delta) {
      this.x -= this.speed * delta;
    }

    get gapEnd() {
      return this.gapStart + this.gapHeight;
    }

    draw(ctx, height, groundHeight) {
      ctx.fillStyle = '#8bd6ff';
      ctx.fillRect(this.x, 0, this.width, this.gapStart);
      ctx.fillStyle = '#7ecbff';
      ctx.fillRect(this.x, this.gapStart, this.width, this.gapHeight);
      ctx.fillStyle = '#8bd6ff';
      ctx.fillRect(this.x, this.gapEnd, this.width, height - groundHeight - this.gapEnd);

      ctx.fillStyle = '#3fa544';
      ctx.fillRect(this.x, 0, this.width, this.gapStart);
      ctx.fillRect(this.x, this.gapEnd, this.width, height - groundHeight - this.gapEnd);

      ctx.fillStyle = '#2c7930';
      ctx.fillRect(this.x - 4, this.gapStart - 12, this.width + 8, 12);
      ctx.fillRect(this.x - 4, this.gapEnd, this.width + 8, 12);
    }
  }

  class Bird {
    constructor(x, y, brain = null, isBest = false) {
      this.x = x;
      this.y = y;
      this.radius = 16;
      this.velocity = 0;
      this.angle = 0;
      this.alive = true;
      this.score = 0;
      this.distanceTravelled = 0;
      this.brain = brain;
      this.isBest = isBest;
      this.lastJump = 0;
    }

    reset(positionY) {
      this.y = positionY;
      this.velocity = 0;
      this.angle = 0;
      this.alive = true;
      this.score = 0;
      this.distanceTravelled = 0;
      this.lastJump = 0;
    }

    think(pipes, width, height, groundHeight) {
      if (!this.brain || !pipes.length) return;
      const nextPipe = pipes.find(pipe => pipe.x + pipe.width > this.x - this.radius);
      if (!nextPipe) return;
      const distX = (nextPipe.x - this.x) / width;
      const gapCenter = nextPipe.gapStart + nextPipe.gapHeight / 2;
      const normY = this.y / (height - groundHeight);
      const diffTop = (this.y - nextPipe.gapStart) / (height - groundHeight);
      const diffBottom = (nextPipe.gapEnd - this.y) / (height - groundHeight);
      const output = this.brain.predict([normY, distX, diffTop, diffBottom])[0];
      if (output > 0.5) {
        this.jump();
      }
    }

    applyPhysics(delta, gravity) {
      this.velocity += gravity * delta;
      this.y += this.velocity * delta;
      this.distanceTravelled += delta;
      this.angle = Math.max(Math.min(this.velocity / 400, 0.8), -0.6);
    }

    jump() {
      const now = performance.now();
      if (now - this.lastJump < 120) return;
      this.velocity = GAME_CONFIG.jumpVelocity;
      this.lastJump = now;
      playSound('jump');
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = this.isBest ? '#ff6f61' : 'rgba(245, 197, 24, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.isBest ? '#ffd2cc' : '#fcd75b';
      ctx.beginPath();
      ctx.ellipse(-4, -6, this.radius * 0.9, this.radius * 0.45, -0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(6, -4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(8, -4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff9f1c';
      ctx.beginPath();
      ctx.moveTo(this.radius - 2, -2);
      ctx.lineTo(this.radius + 10, 0);
      ctx.lineTo(this.radius - 2, 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  class NeuralNetwork {
    constructor(layerSizes) {
      this.layerSizes = layerSizes.slice();
      this.weights = [];
      this.biases = [];
      this.initRandom();
    }

    initRandom() {
      for (let i = 0; i < this.layerSizes.length - 1; i++) {
        const inSize = this.layerSizes[i];
        const outSize = this.layerSizes[i + 1];
        const weightMatrix = [];
        const biasVector = [];
        for (let j = 0; j < outSize; j++) {
          const row = [];
          for (let k = 0; k < inSize; k++) {
            row.push(randomGaussian() * 0.6);
          }
          weightMatrix.push(row);
          biasVector.push(randomGaussian() * 0.6);
        }
        this.weights.push(weightMatrix);
        this.biases.push(biasVector);
      }
    }

    clone() {
      const clone = new NeuralNetwork(this.layerSizes);
      clone.weights = this.weights.map(layer => layer.map(row => row.slice()));
      clone.biases = this.biases.map(layer => layer.slice());
      return clone;
    }

    static crossover(a, b) {
      const child = new NeuralNetwork(a.layerSizes);
      child.weights = a.weights.map((layer, i) =>
        layer.map((row, j) => row.map((value, k) => (value + b.weights[i][j][k]) / 2))
      );
      child.biases = a.biases.map((layer, i) =>
        layer.map((value, j) => (value + b.biases[i][j]) / 2)
      );
      return child;
    }

    mutate(rate, strength) {
      for (let i = 0; i < this.weights.length; i++) {
        for (let j = 0; j < this.weights[i].length; j++) {
          for (let k = 0; k < this.weights[i][j].length; k++) {
            if (Math.random() < rate) {
              this.weights[i][j][k] += randomGaussian() * strength;
            }
          }
          if (Math.random() < rate) {
            this.biases[i][j] += randomGaussian() * strength;
          }
        }
      }
    }

    predict(inputs) {
      let activations = inputs.slice();
      for (let layer = 0; layer < this.weights.length; layer++) {
        const nextActivations = [];
        for (let j = 0; j < this.weights[layer].length; j++) {
          let sum = this.biases[layer][j];
          for (let k = 0; k < this.weights[layer][j].length; k++) {
            sum += this.weights[layer][j][k] * activations[k];
          }
          nextActivations.push(sigmoid(sum));
        }
        activations = nextActivations;
      }
      return activations;
    }

    toJSON() {
      return {
        layerSizes: this.layerSizes,
        weights: this.weights,
        biases: this.biases,
      };
    }

    static fromJSON(data) {
      const net = new NeuralNetwork(data.layerSizes);
      net.weights = data.weights;
      net.biases = data.biases;
      return net;
    }
  }

  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  class Population {
    constructor(size) {
      this.size = size;
      this.birds = [];
      this.dead = [];
      this.generation = 1;
      this.bestScore = 0;
      this.bestFitnessHistory = [];
      this.savedBest = loadBrain();
    }

    createInitial(x, y) {
      this.birds = [];
      this.dead = [];
      for (let i = 0; i < this.size; i++) {
        let brain = new NeuralNetwork([4, 6, 1]);
        if (i === 0 && this.savedBest) {
          brain = this.savedBest.clone();
        }
        const bird = new Bird(x, y, brain, i === 0);
        this.birds.push(bird);
      }
    }

    evolve(spawnX, spawnY) {
      const scoredBirds = [...this.dead].sort((a, b) => b.score - a.score);
      const survivorsCount = Math.max(1, Math.floor(scoredBirds.length * GAME_CONFIG.selectionRate));
      const survivors = scoredBirds.slice(0, survivorsCount);
      const bestBird = survivors[0];
      if (bestBird && bestBird.score > this.bestScore) {
        this.bestScore = bestBird.score;
        this.savedBest = bestBird.brain.clone();
        saveBrain(this.savedBest);
      }
      if (bestBird) {
        this.bestFitnessHistory.push(bestBird.score);
      } else {
        this.bestFitnessHistory.push(0);
      }
      this.generation += 1;

      const newBirds = [];
      for (let i = 0; i < this.size; i++) {
        let childBrain;
        if (i < survivors.length) {
          childBrain = survivors[i].brain.clone();
        } else {
          const parentA = survivors[Math.floor(Math.random() * survivors.length)].brain;
          const parentB = survivors[Math.floor(Math.random() * survivors.length)].brain;
          childBrain = NeuralNetwork.crossover(parentA, parentB);
        }
        childBrain.mutate(GAME_CONFIG.mutationRate, GAME_CONFIG.mutationStrength);
        const bird = new Bird(spawnX, spawnY, childBrain);
        if (i === 0 && this.savedBest) {
          bird.brain = this.savedBest.clone();
          bird.isBest = true;
        }
        newBirds.push(bird);
      }
      this.birds = newBirds;
      this.dead = [];
    }
  }

  const state = {
    mode: 'manual',
    running: false,
    lastTime: 0,
    speedMultiplier: 1,
    pipes: [],
    birds: [],
    population: null,
    spawnTimer: 0,
    score: 0,
    bestScore: 0,
    manualBest: 0,
  };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    const rectNet = networkCanvas.getBoundingClientRect();
    networkCanvas.width = rectNet.width * window.devicePixelRatio;
    networkCanvas.height = rectNet.height * window.devicePixelRatio;
    networkCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    const rectChart = chartCanvas.getBoundingClientRect();
    chartCanvas.width = rectChart.width * window.devicePixelRatio;
    chartCanvas.height = rectChart.height * window.devicePixelRatio;
    chartCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  function resetGame() {
    state.pipes = [];
    state.spawnTimer = 0;
    state.score = 0;
    updateScore(0);
    if (state.mode === 'manual') {
      if (!state.birds.length) {
        const spawnX = canvas.width / window.devicePixelRatio * 0.25;
        const spawnY = canvas.height / window.devicePixelRatio / 2;
        state.birds = [new Bird(spawnX, spawnY)];
      }
      state.birds.forEach(bird => bird.reset(canvas.height / window.devicePixelRatio / 2));
    } else if (state.population) {
      const spawnX = canvas.width / window.devicePixelRatio * 0.25;
      const spawnY = canvas.height / window.devicePixelRatio / 2;
      state.population.createInitial(spawnX, spawnY);
    }
  }

  function spawnPipe() {
    const height = canvas.height / window.devicePixelRatio;
    const gap = lerp(GAME_CONFIG.minGap, GAME_CONFIG.maxGap, Math.random());
    const maxGapStart = height - GAME_CONFIG.groundHeight - gap - 30;
    const gapStart = Math.random() * maxGapStart + 20;
    const pipe = new Pipe(
      canvas.width / window.devicePixelRatio + GAME_CONFIG.pipeWidth,
      GAME_CONFIG.pipeWidth,
      gapStart,
      gap,
      GAME_CONFIG.pipeSpeed
    );
    state.pipes.push(pipe);
  }

  function updateScore(score) {
    scoreEl.textContent = score.toFixed(0);
  }

  function updateBest(score) {
    state.bestScore = Math.max(state.bestScore, score);
    bestScoreEl.textContent = state.bestScore.toFixed(0);
  }

  function updateStats() {
    if (state.mode === 'manual') {
      generationEl.textContent = '-';
      aliveEl.textContent = state.running && state.birds[0]?.alive ? '1' : '0';
    } else if (state.population) {
      generationEl.textContent = state.population.generation.toString();
      const aliveCount = state.population.birds.filter(b => b.alive).length;
      aliveEl.textContent = aliveCount.toString();
      if (state.population.bestFitnessHistory.length) {
        updateBest(state.population.bestFitnessHistory[state.population.bestFitnessHistory.length - 1]);
      }
    }
  }

  function gameLoop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const delta = Math.min(0.05, (timestamp - state.lastTime) / 1000);
    state.lastTime = timestamp;

    if (state.running) {
      for (let i = 0; i < state.speedMultiplier; i++) {
        update(delta);
      }
    }
    draw();
    requestAnimationFrame(gameLoop);
  }

  function update(delta) {
    const height = canvas.height / window.devicePixelRatio;
    const width = canvas.width / window.devicePixelRatio;
    const groundHeight = GAME_CONFIG.groundHeight;

    state.spawnTimer += delta * 1000;
    if (state.spawnTimer >= GAME_CONFIG.pipeInterval) {
      state.spawnTimer = 0;
      spawnPipe();
    }

    state.pipes.forEach(pipe => pipe.update(delta));
    state.pipes = state.pipes.filter(pipe => pipe.x + pipe.width > -50);

    const birds = state.mode === 'manual' ? state.birds : state.population?.birds || [];
    let bestBird = null;

    birds.forEach(bird => {
      if (!bird.alive) return;
      if (state.mode === 'ai') {
        bird.think(state.pipes, width, height, groundHeight);
      }
      bird.applyPhysics(delta, GAME_CONFIG.gravity);

      if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= height - groundHeight) {
        bird.alive = false;
      }

      for (const pipe of state.pipes) {
        if (
          bird.x + bird.radius > pipe.x &&
          bird.x - bird.radius < pipe.x + pipe.width &&
          (bird.y - bird.radius < pipe.gapStart || bird.y + bird.radius > pipe.gapEnd)
        ) {
          bird.alive = false;
        }
        if (!pipe.scored && pipe.x + pipe.width < bird.x - bird.radius) {
          pipe.scored = true;
          if (state.mode === 'manual') {
            state.score += 1;
            updateScore(state.score);
            updateBest(state.score);
            playSound('point');
          } else {
            bird.score += 10;
          }
        }
      }

      if (bird.alive) {
        bird.score += delta * 2;
        if (!bestBird || bird.score > bestBird.score) {
          bestBird = bird;
        }
      }
    });

    if (state.mode === 'manual') {
      if (!birds[0].alive) {
        endManualGame();
      }
    } else if (state.population) {
      const aliveCount = state.population.birds.filter(b => b.alive).length;
      if (aliveCount === 0) {
        state.population.dead = [...state.population.birds];
        const spawnX = width * 0.25;
        const spawnY = height / 2;
        state.population.evolve(spawnX, spawnY);
        state.pipes = [];
        state.spawnTimer = 0;
        state.score = 0;
        updateScore(0);
      } else {
        state.score += delta * GAME_CONFIG.pipeSpeed * 0.05;
        updateScore(state.score);
      }
      if (bestBird) {
        state.population.birds.forEach(b => (b.isBest = false));
        bestBird.isBest = true;
      }
      updateStats();
      drawNetwork(bestBird?.brain || state.population.savedBest);
      drawChart(state.population.bestFitnessHistory);
    }

    updateStats();
  }

  function draw() {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, width, height);

    drawBackground(ctx, width, height);
    state.pipes.forEach(pipe => pipe.draw(ctx, height, GAME_CONFIG.groundHeight));

    const birds = state.mode === 'manual' ? state.birds : state.population?.birds || [];
    birds.forEach(bird => {
      if (!bird.alive && state.mode === 'ai') return;
      ctx.save();
      if (state.mode === 'ai' && !bird.isBest) {
        ctx.globalAlpha = 0.4;
      }
      bird.draw(ctx);
      ctx.restore();
    });

    drawGround(ctx, width, height);
  }

  function drawBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#8fd3ff');
    gradient.addColorStop(1, '#e8f6ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 5; i++) {
      const cloudWidth = 100 + Math.sin(performance.now() / 2000 + i) * 20;
      const x = (performance.now() / (60 + i * 10) + i * 140) % (width + cloudWidth) - cloudWidth;
      const y = 40 + i * 40;
      ctx.beginPath();
      ctx.ellipse(x, y, cloudWidth, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGround(ctx, width, height) {
    ctx.fillStyle = '#d8c17b';
    ctx.fillRect(0, height - GAME_CONFIG.groundHeight, width, GAME_CONFIG.groundHeight);
    ctx.fillStyle = '#c8b16b';
    for (let x = 0; x < width; x += 30) {
      ctx.fillRect(x, height - GAME_CONFIG.groundHeight, 20, 12);
    }
  }

  function endManualGame() {
    state.running = false;
    gameOverEl.classList.remove('hidden');
    finalScoreEl.textContent = state.score.toFixed(0);
    state.manualBest = Math.max(state.manualBest, state.score);
    updateBest(state.manualBest);
    playSound('hit');
  }

  function startManualGame() {
    state.mode = 'manual';
    state.population = null;
    modeBtn.textContent = 'Mode IA';
    state.running = true;
    state.lastTime = 0;
    gameOverEl.classList.add('hidden');
    resizeCanvas();
    resetGame();
    updateStats();
    drawNetwork(null);
    drawChart([]);
  }

  function startAIGame() {
    state.mode = 'ai';
    modeBtn.textContent = 'Mode manuel';
    state.population = new Population(GAME_CONFIG.populationSize);
    resizeCanvas();
    resetGame();
    state.running = true;
    state.lastTime = 0;
    state.score = 0;
    updateScore(0);
    updateStats();
    drawChart(state.population.bestFitnessHistory);
  }

  function toggleMode() {
    if (state.mode === 'manual') {
      startAIGame();
    } else {
      startManualGame();
    }
  }

  function onUserJump() {
    if (state.mode === 'manual' && state.running) {
      const bird = state.birds[0];
      if (bird && bird.alive) {
        bird.jump();
      }
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function drawNetwork(network) {
    const width = networkCanvas.width / window.devicePixelRatio;
    const height = networkCanvas.height / window.devicePixelRatio;
    networkCtx.clearRect(0, 0, width, height);
    if (!network) return;

    const layers = network.layerSizes;
    const layerXSpacing = width / (layers.length + 1);

    const positions = [];
    for (let i = 0; i < layers.length; i++) {
      const ySpacing = height / (layers[i] + 1);
      const layerPos = [];
      for (let j = 0; j < layers[i]; j++) {
        layerPos.push({
          x: (i + 1) * layerXSpacing,
          y: (j + 1) * ySpacing,
        });
      }
      positions.push(layerPos);
    }

    for (let l = 0; l < network.weights.length; l++) {
      const layerWeights = network.weights[l];
      for (let j = 0; j < layerWeights.length; j++) {
        for (let k = 0; k < layerWeights[j].length; k++) {
          const value = layerWeights[j][k];
          const color = value > 0 ? `rgba(63,165,68,${Math.min(Math.abs(value), 1)})` : `rgba(255,111,97,${Math.min(Math.abs(value), 1)})`;
          networkCtx.strokeStyle = color;
          networkCtx.lineWidth = Math.min(6, Math.max(1, Math.abs(value) * 2));
          networkCtx.beginPath();
          networkCtx.moveTo(positions[l][k].x, positions[l][k].y);
          networkCtx.lineTo(positions[l + 1][j].x, positions[l + 1][j].y);
          networkCtx.stroke();
        }
      }
    }

    positions.forEach((layer, layerIndex) => {
      layer.forEach((node, nodeIndex) => {
        const bias = layerIndex > 0 ? network.biases[layerIndex - 1][nodeIndex] : 0;
        networkCtx.fillStyle = layerIndex === 0 ? '#87cefa' : bias >= 0 ? '#3fa544' : '#ff6f61';
        networkCtx.beginPath();
        networkCtx.arc(node.x, node.y, 12, 0, Math.PI * 2);
        networkCtx.fill();
        networkCtx.fillStyle = '#ffffff';
        networkCtx.font = '10px sans-serif';
        networkCtx.textAlign = 'center';
        networkCtx.fillText(`${layerIndex === 0 ? 'I' : layerIndex === layers.length - 1 ? 'O' : 'H'}${nodeIndex + 1}`, node.x, node.y + 3);
      });
    });
  }

  function drawChart(history) {
    const width = chartCanvas.width / window.devicePixelRatio;
    const height = chartCanvas.height / window.devicePixelRatio;
    chartCtx.clearRect(0, 0, width, height);
    chartCtx.fillStyle = 'rgba(255,255,255,0.8)';
    chartCtx.fillRect(0, 0, width, height);

    if (!history.length) {
      chartCtx.fillStyle = '#0d335d';
      chartCtx.font = '14px sans-serif';
      chartCtx.textAlign = 'center';
      chartCtx.fillText('Pas encore de données', width / 2, height / 2);
      return;
    }

    const maxScore = Math.max(...history);
    const padding = 20;
    chartCtx.strokeStyle = '#0d335d';
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();
    chartCtx.moveTo(padding, height - padding);
    chartCtx.lineTo(padding, padding);
    chartCtx.lineTo(width - padding, padding);
    chartCtx.stroke();

    chartCtx.strokeStyle = '#ff6f61';
    chartCtx.beginPath();
    history.forEach((score, index) => {
      const x = padding + (index / Math.max(1, history.length - 1)) * (width - padding * 2);
      const y = height - padding - (score / Math.max(1, maxScore)) * (height - padding * 2);
      if (index === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    });
    chartCtx.stroke();

    chartCtx.fillStyle = '#0d335d';
    chartCtx.font = '12px sans-serif';
    chartCtx.textAlign = 'left';
    chartCtx.fillText(`Meilleur score: ${maxScore.toFixed(1)}`, padding + 4, padding + 14);
    chartCtx.textAlign = 'right';
    chartCtx.fillText(`Générations: ${history.length}`, width - padding - 4, padding + 14);
  }

  function saveBrain(network) {
    if (!network) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(network.toJSON()));
  }

  function loadBrain() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return NeuralNetwork.fromJSON(parsed);
    } catch (err) {
      console.error('Impossible de charger le cerveau sauvegardé', err);
      return null;
    }
  }

  function handleSaveBrain() {
    if (state.mode === 'manual') return;
    const best = state.population?.savedBest;
    if (best) {
      saveBrain(best);
    }
  }

  function handleLoadBrain() {
    const brain = loadBrain();
    if (!brain) return;
    if (state.mode === 'ai' && state.population) {
      state.population.savedBest = brain;
      const bestBird = state.population.birds[0];
      if (bestBird) {
        bestBird.brain = brain.clone();
        bestBird.isBest = true;
      }
    }
  }

  function handleClearBrain() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function handleStart() {
    if (state.mode === 'manual') {
      startManualGame();
    } else {
      startAIGame();
    }
  }

  function handleRestart() {
    if (state.mode === 'manual') {
      startManualGame();
    } else if (state.population) {
      startAIGame();
    }
  }

  function handleSpeedChange() {
    state.speedMultiplier = parseInt(speedSelect.value, 10);
  }

  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      onUserJump();
    }
  });

  canvas.addEventListener('pointerdown', onUserJump);

  startBtn.addEventListener('click', handleStart);
  restartBtn.addEventListener('click', handleRestart);
  overlayRestart.addEventListener('click', handleRestart);
  modeBtn.addEventListener('click', toggleMode);
  speedSelect.addEventListener('change', handleSpeedChange);
  saveBrainBtn.addEventListener('click', handleSaveBrain);
  loadBrainBtn.addEventListener('click', handleLoadBrain);
  clearBrainBtn.addEventListener('click', handleClearBrain);

  window.addEventListener('resize', resizeCanvas);

  resizeCanvas();
  resetGame();
  updateStats();
  requestAnimationFrame(gameLoop);
})();
