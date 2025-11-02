// ============================================
// CONFIGURATION GLOBALE
// ============================================
const CONFIG = {
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
    ELITE_SIZE: 20 // Top 20% pour reproduction
};

// ============================================
// UTILITAIRES MATHÉMATIQUES
// ============================================

// Génération de nombres aléatoires gaussiens (Box-Muller transform)
function randomGaussian(mean = 0, std = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Convertir [0,1) en (0,1)
    while(v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Fonction sigmoïde
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

// Fonction sigmoïde dérivée
function sigmoidDerivative(x) {
    const s = sigmoid(x);
    return s * (1 - s);
}

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
        this.passedPipes = new Set(); // Track pipes passed by this bird
        
        // Réseau neuronal (si pas fourni, créer un nouveau)
        this.brain = brain ? brain.copy() : new NeuralNetwork(4, 8, 2);
    }

    // Sauter
    jump() {
        this.velocity = CONFIG.JUMP_STRENGTH;
    }

    // Mise à jour de la position
    update() {
        if (!this.alive) return;

        // Appliquer la gravité
        this.velocity += CONFIG.GRAVITY;
        this.y += this.velocity;

        // Limiter la vitesse maximale
        if (this.velocity > 15) this.velocity = 15;
    }
    
    // Vérifier collision avec les bords (appelé depuis Game)
    checkBoundaries(groundY) {
        if (this.y + this.height >= groundY || this.y <= 0) {
            this.alive = false;
        }
    }

    // Décision IA : utiliser le réseau neuronal pour décider de sauter
    think(pipes, gameWidth = 800, gameHeight = 600) {
        if (!this.alive || pipes.length === 0) return;

        // Trouver le prochain tuyau
        let closestPipe = null;
        let closestDistance = Infinity;

        for (let pipe of pipes) {
            if (pipe.x + pipe.width > this.x && pipe.x < closestDistance) {
                closestDistance = pipe.x;
                closestPipe = pipe;
            }
        }

        if (!closestPipe) return;

        // Inputs du réseau neuronal:
        // 0: Position Y normalisée de l'oiseau
        // 1: Distance horizontale au tuyau (normalisée)
        // 2: Distance verticale au trou du haut (normalisée)
        // 3: Distance verticale au trou du bas (normalisée)
        const inputs = [
            this.y / gameHeight,
            (closestPipe.x - this.x) / gameWidth,
            (this.y - (closestPipe.y)) / gameHeight,
            ((closestPipe.y + CONFIG.PIPE_GAP) - this.y) / gameHeight
        ];

        // Calculer la sortie du réseau
        const output = this.brain.predict(inputs);

        // Si la sortie > 0.5, sauter
        if (output[0] > 0.5) {
            this.jump();
        }
    }

    // Dessiner l'oiseau sur le canvas
    draw(ctx, isBest = false) {
        if (!this.alive) return;

      ctx.save();

        // Rotation selon la vitesse
        const rotation = Math.min(this.velocity * 0.1, 0.5);
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(rotation);

        // Corps de l'oiseau (cercle jaune)
        ctx.fillStyle = isBest ? '#FFD700' : '#FFD700';
        ctx.strokeStyle = isBest ? '#FFA500' : '#FFA500';
        ctx.lineWidth = 2;
        
      ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
        ctx.stroke();

        // Œil
        ctx.fillStyle = '#000';
      ctx.beginPath();
        ctx.arc(5, -5, 4, 0, Math.PI * 2);
      ctx.fill();

        // Aile
        ctx.fillStyle = isBest ? '#FF8C00' : '#FFA500';
      ctx.beginPath();
        ctx.ellipse(-8, 5, 10, 5, rotation * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Copier l'oiseau (pour la reproduction)
    copy() {
        return new Bird(this.x, this.y, this.brain);
    }
}

// ============================================
// CLASSE PIPE (TUYAU)
// ============================================
class Pipe {
    constructor(x, gameHeight = CONFIG.CANVAS_HEIGHT) {
        this.x = x;
        this.width = 60;
        this.gap = CONFIG.PIPE_GAP;
        this.scored = false;
        
        // Position du trou (espace entre les tuyaux)
        const minGap = 50;
        const maxGap = gameHeight - 80 - this.gap - minGap;
        this.y = Math.random() * (maxGap - minGap) + minGap;
    }

    // Mise à jour de la position
    update() {
        this.x -= CONFIG.PIPE_SPEED;
    }

    // Vérifier si hors écran
    isOffScreen() {
        return this.x + this.width < 0;
    }

    // Vérifier collision avec l'oiseau
    collidesWith(bird) {
        if (!bird.alive) return false;

        // Collision avec le tuyau du haut
        if (bird.x < this.x + this.width &&
            bird.x + bird.width > this.x &&
            bird.y < this.y) {
            return true;
        }

        // Collision avec le tuyau du bas
        if (bird.x < this.x + this.width &&
            bird.x + bird.width > this.x &&
            bird.y + bird.height > this.y + this.gap) {
            return true;
        }

        return false;
    }

    // Vérifier si l'oiseau a passé le tuyau
    passed(bird) {
        return bird.x > this.x + this.width;
    }

        // Dessiner le tuyau
    draw(ctx, gameHeight = CONFIG.CANVAS_HEIGHT) {
        ctx.fillStyle = '#228B22';
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 3;

        // Tuyau du haut
        ctx.fillRect(this.x, 0, this.width, this.y);
        ctx.strokeRect(this.x, 0, this.width, this.y);

        // Tuyau du bas
        const bottomY = this.y + this.gap;
        const bottomHeight = gameHeight - 80 - bottomY;
        ctx.fillRect(this.x, bottomY, this.width, bottomHeight);
        ctx.strokeRect(this.x, bottomY, this.width, bottomHeight);

        // Bordure du trou
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(this.x - 5, this.y - 20, this.width + 10, 20);
        ctx.fillRect(this.x - 5, this.y + this.gap, this.width + 10, 20);
    }
}

// ============================================
// CLASSE NEURALNETWORK (RÉSEAU NEURONAL)
// ============================================
class NeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.outputSize = outputSize;

        // Initialisation des poids avec Xavier initialization
        this.weightsIH = this.randomMatrix(hiddenSize, inputSize, -1, 1);
        this.weightsHO = this.randomMatrix(outputSize, hiddenSize, -1, 1);
        this.biasH = this.randomMatrix(hiddenSize, 1, -1, 1);
        this.biasO = this.randomMatrix(outputSize, 1, -1, 1);
    }

    // Générer une matrice aléatoire
    randomMatrix(rows, cols, min, max) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = [];
            for (let j = 0; j < cols; j++) {
                // Xavier initialization
                const limit = Math.sqrt(2.0 / (rows + cols));
                matrix[i][j] = randomGaussian(0, limit);
            }
        }
        return matrix;
    }

    // Propagation avant (forward pass)
    predict(inputs) {
        // Couche input -> hidden
        const hidden = [];
        for (let i = 0; i < this.hiddenSize; i++) {
            let sum = this.biasH[i][0];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.weightsIH[i][j];
            }
            hidden[i] = sigmoid(sum);
        }

        // Couche hidden -> output
        const outputs = [];
        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.biasO[i][0];
            for (let j = 0; j < this.hiddenSize; j++) {
                sum += hidden[j] * this.weightsHO[i][j];
            }
            outputs[i] = sigmoid(sum);
        }

        return outputs;
    }

    // Copier le réseau neuronal
    copy() {
        const copy = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
        
        // Copier les poids
        copy.weightsIH = this.copyMatrix(this.weightsIH);
        copy.weightsHO = this.copyMatrix(this.weightsHO);
        copy.biasH = this.copyMatrix(this.biasH);
        copy.biasO = this.copyMatrix(this.biasO);

        return copy;
    }

    // Copier une matrice
    copyMatrix(matrix) {
        return matrix.map(row => [...row]);
    }

    // Mutation (ajout de bruit gaussien)
    mutate() {
        const mutateValue = (value) => {
            if (Math.random() < CONFIG.MUTATION_RATE) {
                return value + randomGaussian(0, CONFIG.MUTATION_STRENGTH);
            }
            return value;
        };

        // Mutate weights input->hidden
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.inputSize; j++) {
                this.weightsIH[i][j] = mutateValue(this.weightsIH[i][j]);
            }
        }

        // Mutate weights hidden->output
        for (let i = 0; i < this.outputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                this.weightsHO[i][j] = mutateValue(this.weightsHO[i][j]);
            }
        }

        // Mutate biases
        for (let i = 0; i < this.hiddenSize; i++) {
            this.biasH[i][0] = mutateValue(this.biasH[i][0]);
        }

        for (let i = 0; i < this.outputSize; i++) {
            this.biasO[i][0] = mutateValue(this.biasO[i][0]);
        }
    }

    // Crossover (moyenne des poids de deux réseaux)
    static crossover(parent1, parent2) {
        const child = new NeuralNetwork(
            parent1.inputSize,
            parent1.hiddenSize,
            parent1.outputSize
        );

        // Crossover des poids
        child.weightsIH = child.crossoverMatrices(parent1.weightsIH, parent2.weightsIH);
        child.weightsHO = child.crossoverMatrices(parent1.weightsHO, parent2.weightsHO);
        child.biasH = child.crossoverMatrices(parent1.biasH, parent2.biasH);
        child.biasO = child.crossoverMatrices(parent1.biasO, parent2.biasO);

        return child;
    }

    // Crossover de matrices (moyenne pondérée)
    crossoverMatrices(matrix1, matrix2) {
        const result = [];
        for (let i = 0; i < matrix1.length; i++) {
            result[i] = [];
            for (let j = 0; j < matrix1[i].length; j++) {
                // Prendre aléatoirement une valeur de l'un ou l'autre parent, ou moyenne
                if (Math.random() < 0.5) {
                    result[i][j] = matrix1[i][j];
        } else {
                    result[i][j] = matrix2[i][j];
                }
            }
        }
        return result;
    }
}

// ============================================
// CLASSE POPULATION (GESTION DE L'ÉVOLUTION)
// ============================================
class Population {
    constructor(size, gameHeight = CONFIG.CANVAS_HEIGHT) {
        this.size = size;
        this.birds = [];
        this.generation = 1;
        this.bestFitness = 0;
        this.bestBird = null;
        this.allTimeBest = null;
        this.fitnessHistory = [];
        this.gameHeight = gameHeight;

        // Initialiser la population
        for (let i = 0; i < size; i++) {
            this.birds.push(new Bird(100, gameHeight / 2));
        }
    }

    // Mettre à jour tous les oiseaux
    update(pipes, gameWidth = 800, gameHeight = 600) {
        let aliveCount = 0;

        for (let bird of this.birds) {
            if (bird.alive) {
                bird.update();
                bird.think(pipes, gameWidth, gameHeight);

                // Calculer la fitness (score + distance parcourue)
                bird.fitness = bird.score + bird.x / 100;

                aliveCount++;

                // Mettre à jour le meilleur
                if (bird.fitness > this.bestFitness) {
                    this.bestFitness = bird.fitness;
                    this.bestBird = bird;
                }
            }
        }

        return aliveCount;
    }

    // Vérifier si tous les oiseaux sont morts
    allDead() {
        return this.birds.every(bird => !bird.alive);
    }

    // Sélection naturelle : créer la prochaine génération
    evolve() {
        // Trier par fitness
        this.birds.sort((a, b) => b.fitness - a.fitness);

        // Sauvegarder le meilleur de tous les temps
        if (!this.allTimeBest || this.birds[0].fitness > this.allTimeBest.fitness) {
            this.allTimeBest = this.birds[0].brain.copy();
        }

        // Sauvegarder la fitness moyenne pour le graphique
        const avgFitness = this.birds.reduce((sum, b) => sum + b.fitness, 0) / this.birds.length;
        this.fitnessHistory.push({
            generation: this.generation,
            best: this.birds[0].fitness,
            average: avgFitness
        });

        // Garder les top ELITE_SIZE
        const elite = this.birds.slice(0, CONFIG.ELITE_SIZE);
        const newBirds = [];

        // Garder le meilleur tel quel
        newBirds.push(new Bird(100, this.gameHeight / 2, this.birds[0].brain.copy()));

        // Créer le reste de la population
        while (newBirds.length < this.size) {
            // Sélectionner deux parents (probabilité proportionnelle à la fitness)
            const parent1 = this.selectParent();
            const parent2 = this.selectParent();

            // Crossover
            const childBrain = NeuralNetwork.crossover(parent1.brain, parent2.brain);

            // Mutation
            childBrain.mutate();

            newBirds.push(new Bird(100, this.gameHeight / 2, childBrain));
        }

        this.birds = newBirds;
        this.generation++;
        this.bestFitness = 0;
    }

    // Sélection d'un parent (roulette)
    selectParent() {
        // Calculer la fitness totale
        const totalFitness = this.birds.reduce((sum, b) => sum + Math.max(b.fitness, 0), 0);

        if (totalFitness === 0) {
            return this.birds[Math.floor(Math.random() * CONFIG.ELITE_SIZE)];
        }

        // Sélection par roulette
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

    // Dessiner tous les oiseaux
    draw(ctx) {
        // Trouver le meilleur
        let best = null;
        let bestFitness = -1;
        for (let bird of this.birds) {
            if (bird.alive && bird.fitness > bestFitness) {
                bestFitness = bird.fitness;
                best = bird;
            }
        }

        // Dessiner tous les oiseaux
        for (let bird of this.birds) {
            bird.draw(ctx, bird === best);
        }
    }
}

// ============================================
// CLASSE GAME (GESTION DU JEU)
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.networkCanvas = document.getElementById('networkCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.networkCtx = this.networkCanvas.getContext('2d');

        // Redimensionner les canvas
        this.resizeCanvas();

        this.bird = null;
        this.population = null;
        this.pipes = [];
        this.score = 0;
        this.gameRunning = false;
        this.gameMode = 'manual'; // 'manual' ou 'ai'
        this.speed = 1;
        this.frameCount = 0;
        this.nextPipeTime = 0;

        // Sons (créés avec AudioContext)
        this.audioContext = null;
        this.sounds = {};

        this.initSounds();
        this.setupEventListeners();
        this.initStats();
    }

    // Redimensionner les canvas
    resizeCanvas() {
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const aspectRatio = CONFIG.CANVAS_HEIGHT / CONFIG.CANVAS_WIDTH;
        
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth * aspectRatio;
        
        // Stocker les dimensions pour référence
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
        
        this.networkCanvas.width = maxWidth;
        this.networkCanvas.height = 150;
    }

    // Initialiser les sons
    initSounds() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Fonction pour créer un son simple
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

    // Configuration des événements
    setupEventListeners() {
        // Boutons
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('modeBtn').addEventListener('click', () => this.toggleMode());
        document.getElementById('speedBtn').addEventListener('click', () => this.toggleSpeed());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveBestNetwork());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadBestNetwork());

        // Contrôles clavier et souris
        this.canvas.addEventListener('click', () => this.handleInput());
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                this.handleInput();
            }
        });

        // Touch pour mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput();
        });

        // Redimensionnement
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    // Gérer l'input (saut)
    handleInput() {
        if (!this.gameRunning) return;

        if (this.gameMode === 'manual' && this.bird) {
            this.bird.jump();
            if (this.sounds.jump) this.sounds.jump();
        }
    }

    // Démarrer le jeu
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
            this.population = new Population(CONFIG.POPULATION_SIZE, this.gameHeight);
        }

        document.getElementById('gameOver').classList.add('hidden');
        this.gameLoop();
    }

    // Toggle mode manuel/IA
    toggleMode() {
        if (this.gameRunning) return;

        this.gameMode = this.gameMode === 'manual' ? 'ai' : 'manual';
        const btn = document.getElementById('modeBtn');
        btn.textContent = this.gameMode === 'manual' ? 'Mode IA' : 'Mode Manuel';
    }

    // Toggle vitesse
    toggleSpeed() {
        const speeds = [1, 2, 5, 10];
        const currentIndex = speeds.indexOf(this.speed);
        this.speed = speeds[(currentIndex + 1) % speeds.length];
        document.getElementById('speedBtn').textContent = `Vitesse: ${this.speed}x`;
    }

    // Restart
    restart() {
        this.gameRunning = false;
        this.start();
    }

    // Mise à jour du jeu
    update() {
        if (!this.gameRunning) return;

        // Avancer plusieurs frames selon la vitesse
        for (let i = 0; i < this.speed; i++) {
            this.frameCount++;

            // Générer de nouveaux tuyaux
            if (this.frameCount >= this.nextPipeTime) {
                this.pipes.push(new Pipe(this.gameWidth, this.gameHeight));
                this.nextPipeTime = this.frameCount + CONFIG.PIPE_SPACING / CONFIG.PIPE_SPEED;
            }

            // Mettre à jour les tuyaux
            for (let i = this.pipes.length - 1; i >= 0; i--) {
                this.pipes[i].update();

                // Retirer les tuyaux hors écran
                if (this.pipes[i].isOffScreen()) {
                    this.pipes.splice(i, 1);
                }
            }

            // Mode manuel
            if (this.gameMode === 'manual' && this.bird) {
                this.bird.update();
                
                // Vérifier collisions avec les bords
                const groundY = this.gameHeight - 80;
                this.bird.checkBoundaries(groundY);
                
                if (!this.bird.alive) {
                    this.gameOver();
                    return;
                }

                // Vérifier collisions
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
            }
            // Mode IA
            else if (this.gameMode === 'ai' && this.population) {
                const aliveCount = this.population.update(this.pipes, this.gameWidth, this.gameHeight);
                const groundY = this.gameHeight - 80;

                // Vérifier collisions et scores
                for (let bird of this.population.birds) {
                    if (!bird.alive) continue;
                    
                    // Vérifier collisions avec les bords
                    bird.checkBoundaries(groundY);

                    for (let pipe of this.pipes) {
                        if (pipe.collidesWith(bird)) {
                            bird.alive = false;
                            if (this.sounds.hit) this.sounds.hit();
                        }

                        // Chaque oiseau peut gagner un point en passant un tuyau
                        // On vérifie si l'oiseau n'a pas déjà marqué ce tuyau
                        if (pipe.passed(bird) && !bird.passedPipes.has(pipe)) {
                            bird.score++;
                            bird.passedPipes.add(pipe);
                        }
                    }
                }

                // Vérifier si tous sont morts
                if (this.population.allDead()) {
                    this.population.evolve();
                    this.pipes = [];
                    this.frameCount = 0;
                    this.nextPipeTime = 0;
                }

                // Mettre à jour le score avec le meilleur
                this.score = Math.max(...this.population.birds.map(b => b.score));

                // Mettre à jour les stats
                this.updateStats();
            }
        }
    }

    // Dessiner le jeu
    draw() {
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);

        // Dessiner le sol
        const groundY = this.gameHeight - 80;
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(0, groundY, this.gameWidth, 80);

        // Texture du sol
        this.ctx.fillStyle = '#654321';
        for (let x = 0; x < this.gameWidth; x += 20) {
            this.ctx.fillRect(x, groundY, 10, 5);
        }

        // Dessiner les tuyaux
        for (let pipe of this.pipes) {
            pipe.draw(this.ctx, this.gameHeight);
        }

        // Dessiner l'oiseau(s)
        if (this.gameMode === 'manual' && this.bird) {
            this.bird.draw(this.ctx);
        } else if (this.gameMode === 'ai' && this.population) {
            this.population.draw(this.ctx);
        }

        // Dessiner le réseau neuronal si en mode IA
        if (this.gameMode === 'ai' && this.population) {
            this.drawNetwork();
        }
    }

    // Dessiner la visualisation du réseau neuronal
    drawNetwork() {
        const ctx = this.networkCtx;
        ctx.clearRect(0, 0, this.networkCanvas.width, this.networkCanvas.height);

        // Trouver le meilleur oiseau vivant
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

        // Dessiner les connexions
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;

        // Input -> Hidden
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

        // Hidden -> Output
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

        // Dessiner les neurones
        layers.forEach((layer, layerIndex) => {
            const x = layerSpacing * (layerIndex + 1);
            const spacing = height / (layer.size + 1);

            for (let i = 0; i < layer.size; i++) {
                const y = spacing * (i + 1);

                // Cercle du neurone
                ctx.fillStyle = '#667eea';
                ctx.beginPath();
                ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
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

    // Game Over
    gameOver() {
        this.gameRunning = false;
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('finalScore').textContent = this.score;
        if (this.sounds.hit) this.sounds.hit();
    }

    // Mettre à jour les statistiques
    initStats() {
        this.updateStats();
    }

    updateStats() {
        document.getElementById('score').textContent = this.score;

        if (this.gameMode === 'ai' && this.population) {
            const aliveCount = this.population.birds.filter(b => b.alive).length;
            document.getElementById('generation').textContent = this.population.generation;
            document.getElementById('alive').textContent = aliveCount;
            document.getElementById('bestScore').textContent = Math.max(...this.population.birds.map(b => b.score));
            document.getElementById('bestFitness').textContent = Math.floor(this.population.bestFitness);
    } else {
            document.getElementById('generation').textContent = '-';
            document.getElementById('alive').textContent = this.bird && this.bird.alive ? 1 : 0;
            document.getElementById('bestScore').textContent = this.score;
            document.getElementById('bestFitness').textContent = '-';
        }
    }

    // Sauvegarder le meilleur réseau
    saveBestNetwork() {
        if (!this.population || !this.population.allTimeBest) {
            alert('Aucun réseau à sauvegarder. Lancez d\'abord le mode IA!');
            return;
        }

        const data = {
            weightsIH: this.population.allTimeBest.weightsIH,
            weightsHO: this.population.allTimeBest.weightsHO,
            biasH: this.population.allTimeBest.biasH,
            biasO: this.population.allTimeBest.biasO,
            inputSize: this.population.allTimeBest.inputSize,
            hiddenSize: this.population.allTimeBest.hiddenSize,
            outputSize: this.population.allTimeBest.outputSize
        };

        localStorage.setItem('flappyBestNetwork', JSON.stringify(data));
        alert('Réseau sauvegardé avec succès!');
    }

    // Charger le meilleur réseau
    loadBestNetwork() {
        const saved = localStorage.getItem('flappyBestNetwork');
        if (!saved) {
            alert('Aucun réseau sauvegardé trouvé!');
            return;
        }

        try {
            const data = JSON.parse(saved);
            const network = new NeuralNetwork(data.inputSize, data.hiddenSize, data.outputSize);
            network.weightsIH = data.weightsIH;
            network.weightsHO = data.weightsHO;
            network.biasH = data.biasH;
            network.biasO = data.biasO;

            // Créer une nouvelle population avec ce réseau
            if (this.gameMode === 'ai') {
                this.population = new Population(CONFIG.POPULATION_SIZE);
                // Remplacer tous les oiseaux avec ce réseau
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

    // Boucle principale du jeu
    gameLoop() {
        if (!this.gameRunning && this.gameMode !== 'ai') {
            return;
        }

        this.update();
        this.draw();
        this.updateStats();

        // Continuer la boucle (même si gameRunning est false en mode IA)
        if (this.gameMode === 'ai' || this.gameRunning) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// ============================================
// INITIALISATION
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
