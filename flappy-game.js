// ============================================
// CONFIGURATION FLAPPY BIRD
// ============================================
const FLAPPY_CONFIG = {
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600,
    GRAVITY: 0.6,
    JUMP_STRENGTH: -12,
    PIPE_SPEED: 3,
    PIPE_GAP: 200,
    PIPE_SPACING: 300,
    POPULATION_SIZE: 100,
    MUTATION_RATE: 0.1,
    MUTATION_STRENGTH: 0.3,
    ELITE_SIZE: 20
};

// ============================================
// CLASSE BIRD (OISEAU)
// ============================================
class Bird {
    constructor(x, y, brain = null) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.velocity = 0;
        this.fitness = 0;
        this.score = 0;
        this.alive = true;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.passedPipes = new Set();
        this.brain = brain ? brain.copy() : new NeuralNetwork(4, 8, 2, FLAPPY_CONFIG.MUTATION_RATE, FLAPPY_CONFIG.MUTATION_STRENGTH);
    }

    jump() {
        this.velocity = FLAPPY_CONFIG.JUMP_STRENGTH;
    }

    update() {
        if (!this.alive) return;
        this.velocity += FLAPPY_CONFIG.GRAVITY;
        this.y += this.velocity;
        if (this.velocity > 15) this.velocity = 15;
    }
    
    checkBoundaries(groundY) {
        if (this.y + this.height >= groundY || this.y <= 0) {
            this.alive = false;
        }
    }

    think(pipes, gameWidth = 800, gameHeight = 600) {
        if (!this.alive || pipes.length === 0) return;
        let closestPipe = null;
        let closestDistance = Infinity;
        for (let pipe of pipes) {
            if (pipe.x + pipe.width > this.x && pipe.x < closestDistance) {
                closestDistance = pipe.x;
                closestPipe = pipe;
            }
        }
        if (!closestPipe) return;
        const inputs = [
            this.y / gameHeight,
            (closestPipe.x - this.x) / gameWidth,
            (this.y - (closestPipe.y)) / gameHeight,
            ((closestPipe.y + FLAPPY_CONFIG.PIPE_GAP) - this.y) / gameHeight
        ];
        const output = this.brain.predict(inputs);
        if (output[0] > 0.5) {
            this.jump();
        }
    }

    draw(ctx, isBest = false) {
        if (!this.alive) return;
        ctx.save();
        const rotation = Math.min(this.velocity * 0.1, 0.5);
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(rotation);
        ctx.fillStyle = isBest ? '#FFD700' : '#FFD700';
        ctx.strokeStyle = isBest ? '#FFA500' : '#FFA500';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(5, -5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isBest ? '#FF8C00' : '#FFA500';
        ctx.beginPath();
        ctx.ellipse(-8, 5, 10, 5, rotation * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    copy() {
        return new Bird(this.x, this.y, this.brain);
    }
}

// ============================================
// CLASSE PIPE (TUYAU)
// ============================================
class Pipe {
    constructor(x, gameHeight = FLAPPY_CONFIG.CANVAS_HEIGHT) {
        this.x = x;
        this.width = 60;
        this.gap = FLAPPY_CONFIG.PIPE_GAP;
        this.scored = false;
        const minGap = 50;
        const maxGap = gameHeight - 80 - this.gap - minGap;
        this.y = Math.random() * (maxGap - minGap) + minGap;
    }

    update() {
        this.x -= FLAPPY_CONFIG.PIPE_SPEED;
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }

    collidesWith(bird) {
        if (!bird.alive) return false;
        if (bird.x < this.x + this.width &&
            bird.x + bird.width > this.x &&
            bird.y < this.y) {
            return true;
        }
        if (bird.x < this.x + this.width &&
            bird.x + bird.width > this.x &&
            bird.y + bird.height > this.y + this.gap) {
            return true;
        }
        return false;
    }

    passed(bird) {
        return bird.x > this.x + this.width;
    }

    draw(ctx, gameHeight = FLAPPY_CONFIG.CANVAS_HEIGHT) {
        ctx.fillStyle = '#228B22';
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 3;
        ctx.fillRect(this.x, 0, this.width, this.y);
        ctx.strokeRect(this.x, 0, this.width, this.y);
        const bottomY = this.y + this.gap;
        const bottomHeight = gameHeight - 80 - bottomY;
        ctx.fillRect(this.x, bottomY, this.width, bottomHeight);
        ctx.strokeRect(this.x, bottomY, this.width, bottomHeight);
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(this.x - 5, this.y - 20, this.width + 10, 20);
        ctx.fillRect(this.x - 5, this.y + this.gap, this.width + 10, 20);
    }
}

// ============================================
// CLASSE POPULATION
// ============================================
class FlappyPopulation {
    constructor(size, gameHeight = FLAPPY_CONFIG.CANVAS_HEIGHT) {
        this.size = size;
        this.birds = [];
        this.generation = 1;
        this.bestFitness = 0;
        this.bestBird = null;
        this.allTimeBest = null;
        this.fitnessHistory = [];
        this.gameHeight = gameHeight;
        for (let i = 0; i < size; i++) {
            this.birds.push(new Bird(100, gameHeight / 2));
        }
    }

    update(pipes, gameWidth = 800, gameHeight = 600) {
        let aliveCount = 0;
        for (let bird of this.birds) {
            if (bird.alive) {
                bird.update();
                bird.think(pipes, gameWidth, gameHeight);
                bird.fitness = bird.score + bird.x / 100;
                aliveCount++;
                if (bird.fitness > this.bestFitness) {
                    this.bestFitness = bird.fitness;
                    this.bestBird = bird;
                }
            }
        }
        return aliveCount;
    }

    allDead() {
        return this.birds.every(bird => !bird.alive);
    }

    evolve() {
        this.birds.sort((a, b) => b.fitness - a.fitness);
        if (!this.allTimeBest || this.birds[0].fitness > this.allTimeBest.fitness) {
            this.allTimeBest = this.birds[0].brain.copy();
        }
        const avgFitness = this.birds.reduce((sum, b) => sum + b.fitness, 0) / this.birds.length;
        this.fitnessHistory.push({
            generation: this.generation,
            best: this.birds[0].fitness,
            average: avgFitness
        });
        const newBirds = [];
        newBirds.push(new Bird(100, this.gameHeight / 2, this.birds[0].brain.copy()));
        while (newBirds.length < this.size) {
            const parent1 = this.selectParent();
            const parent2 = this.selectParent();
            const childBrain = NeuralNetwork.crossover(parent1.brain, parent2.brain);
            childBrain.mutate();
            newBirds.push(new Bird(100, this.gameHeight / 2, childBrain));
        }
        this.birds = newBirds;
        this.generation++;
        this.bestFitness = 0;
    }

    selectParent() {
        const totalFitness = this.birds.reduce((sum, b) => sum + Math.max(b.fitness, 0), 0);
        if (totalFitness === 0) {
            return this.birds[Math.floor(Math.random() * FLAPPY_CONFIG.ELITE_SIZE)];
        }
        let random = Math.random() * totalFitness;
        let sum = 0;
        for (let bird of this.birds) {
            sum += Math.max(bird.fitness, 0);
            if (sum >= random) {
                return bird;
            }
        }
        return this.birds[0];
    }

    draw(ctx) {
        let best = null;
        let bestFitness = -1;
        for (let bird of this.birds) {
            if (bird.alive && bird.fitness > bestFitness) {
                bestFitness = bird.fitness;
                best = bird;
            }
        }
        for (let bird of this.birds) {
            bird.draw(ctx, bird === best);
        }
    }
}

// ============================================
// CLASSE FLAPPY GAME
// ============================================
class FlappyGame {
    constructor() {
        this.canvas = document.getElementById('flappyCanvas');
        this.networkCanvas = document.getElementById('flappyNetworkCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.networkCtx = this.networkCanvas.getContext('2d');
        this.resizeCanvas();
        this.bird = null;
        this.population = null;
        this.pipes = [];
        this.score = 0;
        this.gameRunning = false;
        this.gameMode = 'manual';
        this.speed = 1;
        this.frameCount = 0;
        this.nextPipeTime = 0;
        this.audioContext = null;
        this.sounds = {};
        this.initSounds();
        this.setupEventListeners();
        this.initStats();
    }

    resizeCanvas() {
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const aspectRatio = FLAPPY_CONFIG.CANVAS_HEIGHT / FLAPPY_CONFIG.CANVAS_WIDTH;
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * aspectRatio;
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
        this.networkCanvas.width = maxWidth;
        this.networkCanvas.height = 150;
    }

    initSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const createSound = (frequency, duration, type = 'sine') => {
                return () => {
                    if (!this.audioContext) return;
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    oscillator.frequency.value = frequency;
                    oscillator.type = type;
                    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
                    oscillator.start(this.audioContext.currentTime);
                    oscillator.stop(this.audioContext.currentTime + duration);
                };
            };
            this.sounds.jump = createSound(400, 0.1);
            this.sounds.point = createSound(800, 0.1);
            this.sounds.hit = createSound(200, 0.2, 'sawtooth');
        } catch (e) {
            console.log('Audio non supporté');
        }
    }

    setupEventListeners() {
        const flappyPage = document.getElementById('flappy');
        if (!flappyPage) return;
        
        flappyPage.querySelector('.startBtn').addEventListener('click', () => this.start());
        flappyPage.querySelector('.modeBtn').addEventListener('click', () => this.toggleMode());
        flappyPage.querySelector('.speedBtn').addEventListener('click', () => this.toggleSpeed());
        flappyPage.querySelector('.restartBtn').addEventListener('click', () => this.restart());
        flappyPage.querySelector('.saveBtn').addEventListener('click', () => this.saveBestNetwork());
        flappyPage.querySelector('.loadBtn').addEventListener('click', () => this.loadBestNetwork());

        this.canvas.addEventListener('click', () => this.handleInput());
        document.addEventListener('keydown', (e) => {
            if ((e.code === 'Space' || e.code === 'ArrowUp') && window.tabManager?.currentTab === 'flappy') {
                e.preventDefault();
                this.handleInput();
            }
        });
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput();
        });
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    handleInput() {
        if (!this.gameRunning) return;
        if (this.gameMode === 'manual' && this.bird) {
            this.bird.jump();
            if (this.sounds.jump) this.sounds.jump();
        }
    }

    start() {
        if (this.gameRunning) return;
        this.gameRunning = true;
        this.score = 0;
        this.pipes = [];
        this.frameCount = 0;
        this.nextPipeTime = 0;
        if (this.gameMode === 'manual') {
            this.bird = new Bird(100, this.gameHeight / 2);
        } else {
            this.population = new FlappyPopulation(FLAPPY_CONFIG.POPULATION_SIZE, this.gameHeight);
        }
        const gameOver = document.querySelector('#flappy .game-over');
        if (gameOver) gameOver.classList.add('hidden');
        this.gameLoop();
    }

    toggleMode() {
        if (this.gameRunning) return;
        this.gameMode = this.gameMode === 'manual' ? 'ai' : 'manual';
        const btn = document.querySelector('#flappy .modeBtn');
        if (btn) btn.textContent = this.gameMode === 'manual' ? 'Mode IA' : 'Mode Manuel';
    }

    toggleSpeed() {
        const speeds = [1, 2, 5, 10];
        const currentIndex = speeds.indexOf(this.speed);
        this.speed = speeds[(currentIndex + 1) % speeds.length];
        const btn = document.querySelector('#flappy .speedBtn');
        if (btn) btn.textContent = `Vitesse: ${this.speed}x`;
    }

    restart() {
        this.gameRunning = false;
        this.start();
    }

    update() {
        if (!this.gameRunning || window.tabManager?.currentTab !== 'flappy') return;
        for (let i = 0; i < this.speed; i++) {
            this.frameCount++;
            if (this.frameCount >= this.nextPipeTime) {
                this.pipes.push(new Pipe(this.gameWidth, this.gameHeight));
                this.nextPipeTime = this.frameCount + FLAPPY_CONFIG.PIPE_SPACING / FLAPPY_CONFIG.PIPE_SPEED;
            }
            for (let i = this.pipes.length - 1; i >= 0; i--) {
                this.pipes[i].update();
                if (this.pipes[i].isOffScreen()) {
                    this.pipes.splice(i, 1);
                }
            }
            if (this.gameMode === 'manual' && this.bird) {
                this.bird.update();
                const groundY = this.gameHeight - 80;
                this.bird.checkBoundaries(groundY);
                if (!this.bird.alive) {
                    this.gameOver();
                    return;
                }
                for (let pipe of this.pipes) {
                    if (pipe.collidesWith(this.bird)) {
                        this.gameOver();
                        return;
                    }
                    if (pipe.passed(this.bird) && !this.bird.passedPipes.has(pipe)) {
                        this.score++;
                        this.bird.passedPipes.add(pipe);
                        if (this.sounds.point) this.sounds.point();
                    }
                }
            } else if (this.gameMode === 'ai' && this.population) {
                const aliveCount = this.population.update(this.pipes, this.gameWidth, this.gameHeight);
                const groundY = this.gameHeight - 80;
                for (let bird of this.population.birds) {
                    if (!bird.alive) continue;
                    bird.checkBoundaries(groundY);
                    for (let pipe of this.pipes) {
                        if (pipe.collidesWith(bird)) {
                            bird.alive = false;
                            if (this.sounds.hit) this.sounds.hit();
                        }
                        if (pipe.passed(bird) && !bird.passedPipes.has(pipe)) {
                            bird.score++;
                            bird.passedPipes.add(pipe);
                        }
                    }
                }
                if (this.population.allDead()) {
                    this.population.evolve();
                    this.pipes = [];
                    this.frameCount = 0;
                    this.nextPipeTime = 0;
                }
                this.score = Math.max(...this.population.birds.map(b => b.score));
                this.updateStats();
            }
        }
    }

    draw() {
        if (window.tabManager?.currentTab !== 'flappy') return;
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
        const groundY = this.gameHeight - 80;
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(0, groundY, this.gameWidth, 80);
        this.ctx.fillStyle = '#654321';
        for (let x = 0; x < this.gameWidth; x += 20) {
            this.ctx.fillRect(x, groundY, 10, 5);
        }
        for (let pipe of this.pipes) {
            pipe.draw(this.ctx, this.gameHeight);
        }
        if (this.gameMode === 'manual' && this.bird) {
            this.bird.draw(this.ctx);
        } else if (this.gameMode === 'ai' && this.population) {
            this.population.draw(this.ctx);
        }
        if (this.gameMode === 'ai' && this.population) {
            this.drawNetwork();
        }
    }

    drawNetwork() {
        const ctx = this.networkCtx;
        ctx.clearRect(0, 0, this.networkCanvas.width, this.networkCanvas.height);
        let bestBird = null;
        let bestFitness = -1;
        for (let bird of this.population.birds) {
            if (bird.alive && bird.fitness > bestFitness) {
                bestFitness = bird.fitness;
                bestBird = bird;
            }
        }
        if (!bestBird) return;
        const network = bestBird.brain;
        const width = this.networkCanvas.width;
        const height = this.networkCanvas.height;
        const layers = [
            { size: network.inputSize, label: 'Input' },
            { size: network.hiddenSize, label: 'Hidden' },
            { size: network.outputSize, label: 'Output' }
        ];
        const layerSpacing = width / (layers.length + 1);
        const nodeRadius = 15;
        for (let i = 0; i < layers[0].size; i++) {
            for (let j = 0; j < layers[1].size; j++) {
                const weight = network.weightsIH[j][i];
                ctx.strokeStyle = weight > 0 ? `rgba(0, 255, 0, ${Math.abs(weight)})` : `rgba(255, 0, 0, ${Math.abs(weight)})`;
                const x1 = layerSpacing;
                const y1 = height / (layers[0].size + 1) * (i + 1);
                const x2 = layerSpacing * 2;
                const y2 = height / (layers[1].size + 1) * (j + 1);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        for (let i = 0; i < layers[1].size; i++) {
            for (let j = 0; j < layers[2].size; j++) {
                const weight = network.weightsHO[j][i];
                ctx.strokeStyle = weight > 0 ? `rgba(0, 255, 0, ${Math.abs(weight)})` : `rgba(255, 0, 0, ${Math.abs(weight)})`;
                const x1 = layerSpacing * 2;
                const y1 = height / (layers[1].size + 1) * (i + 1);
                const x2 = layerSpacing * 3;
                const y2 = height / (layers[2].size + 1) * (j + 1);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        layers.forEach((layer, layerIndex) => {
            const x = layerSpacing * (layerIndex + 1);
            const spacing = height / (layer.size + 1);
            for (let i = 0; i < layer.size; i++) {
                const y = spacing * (i + 1);
                ctx.fillStyle = '#667eea';
                ctx.beginPath();
                ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#333';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                if (layerIndex === 0) {
                    const labels = ['Y pos', 'Dist X', 'Dist Top', 'Dist Bot'];
                    ctx.fillText(labels[i] || '', x, y - nodeRadius - 5);
                } else if (layerIndex === 2) {
                    ctx.fillText(i === 0 ? 'Jump' : '', x, y + nodeRadius + 12);
                }
            }
        });
    }

    gameOver() {
        this.gameRunning = false;
        const gameOverEl = document.querySelector('#flappy .game-over');
        const finalScore = document.querySelector('#flappy .flappy-finalScore');
        if (gameOverEl) gameOverEl.classList.remove('hidden');
        if (finalScore) finalScore.textContent = this.score;
        if (this.sounds.hit) this.sounds.hit();
    }

    initStats() {
        this.updateStats();
    }

    updateStats() {
        const scoreEl = document.querySelector('#flappy .flappy-score');
        const genEl = document.querySelector('#flappy .flappy-generation');
        const aliveEl = document.querySelector('#flappy .flappy-alive');
        const bestScoreEl = document.querySelector('#flappy .flappy-bestScore');
        const bestFitnessEl = document.querySelector('#flappy .flappy-bestFitness');
        
        if (scoreEl) scoreEl.textContent = this.score;
        if (this.gameMode === 'ai' && this.population) {
            const aliveCount = this.population.birds.filter(b => b.alive).length;
            if (genEl) genEl.textContent = this.population.generation;
            if (aliveEl) aliveEl.textContent = aliveCount;
            if (bestScoreEl) bestScoreEl.textContent = Math.max(...this.population.birds.map(b => b.score));
            if (bestFitnessEl) bestFitnessEl.textContent = Math.floor(this.population.bestFitness);
        } else {
            if (genEl) genEl.textContent = '-';
            if (aliveEl) aliveEl.textContent = this.bird && this.bird.alive ? 1 : 0;
            if (bestScoreEl) bestScoreEl.textContent = this.score;
            if (bestFitnessEl) bestFitnessEl.textContent = '-';
        }
    }

    saveBestNetwork() {
        if (!this.population || !this.population.allTimeBest) {
            alert('Aucun réseau à sauvegarder. Lancez d\'abord le mode IA!');
            return;
        }
        const data = this.population.allTimeBest.serialize();
        localStorage.setItem('flappyBestNetwork', JSON.stringify(data));
        alert('Réseau sauvegardé avec succès!');
    }

    loadBestNetwork() {
        const saved = localStorage.getItem('flappyBestNetwork');
        if (!saved) {
            alert('Aucun réseau sauvegardé trouvé!');
            return;
        }
        try {
            const data = JSON.parse(saved);
            const network = NeuralNetwork.deserialize(data);
            if (this.gameMode === 'ai') {
                this.population = new FlappyPopulation(FLAPPY_CONFIG.POPULATION_SIZE, this.gameHeight);
                for (let i = 0; i < this.population.birds.length; i++) {
                    this.population.birds[i].brain = network.copy();
                    if (i > 0) {
                        this.population.birds[i].brain.mutate();
                    }
                }
                alert('Réseau chargé avec succès!');
            } else {
                alert('Chargement réussi! Changez en mode IA pour l\'utiliser.');
            }
        } catch (e) {
            alert('Erreur lors du chargement: ' + e.message);
        }
    }

    gameLoop() {
        if (!this.gameRunning && this.gameMode !== 'ai') return;
        if (window.tabManager?.currentTab !== 'flappy') {
            if (this.gameMode === 'ai') {
                requestAnimationFrame(() => this.gameLoop());
            }
            return;
        }
        this.update();
        this.draw();
        this.updateStats();
        if (this.gameMode === 'ai' || this.gameRunning) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.flappyGame = new FlappyGame();
});

