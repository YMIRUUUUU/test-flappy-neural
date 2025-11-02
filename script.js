// ============================================
// CONFIGURATION GLOBALE
// ============================================
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 3;
const PIPE_SPACING = 200;
const PIPE_WIDTH = 60;
const GAP_SIZE = 150;
const BIRD_SIZE = 20;
const POPULATION_SIZE = 100;
const MUTATION_RATE = 0.1;
const MUTATION_STRENGTH = 0.2;
const ELITE_SIZE = 20; // Top 20% pour reproduction

// Variables globales
let canvas, ctx, networkCanvas, networkCtx;
let gameState = 'stopped'; // stopped, playing, paused, gameOver
let mode = 'manual'; // manual, ai
let speed = 1;
let score = 0;
let bestScore = 0;
let frameCount = 0;
let lastFrameTime = 0;
let deltaTime = 0;

// Objets du jeu
let bird = null;
let pipes = [];
let population = null;
let generation = 1;
let bestFitness = 0;

// Sons
let sounds = {
    jump: null,
    score: null,
    hit: null
};

// ============================================
// CLASSE BIRD (Oiseau)
// ============================================
class Bird {
    constructor(x, y, brain = null) {
        this.x = x;
        this.y = y;
        this.velocity = 0;
        this.radius = BIRD_SIZE;
        this.fitness = 0;
        this.score = 0;
        this.dead = false;
        this.brain = brain || new NeuralNetwork(5, 8, 1);
        this.distanceTraveled = 0;
        this.rotation = 0;
    }

    // Applique la physique de l'oiseau
    update() {
        if (this.dead) return;

        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        // Rotation basée sur la vélocité
        this.rotation = Math.min(Math.max(this.velocity * 3, -30), 45);

        // Limites de l'écran (détection de collision avec sol/plafond)
        if (this.y + this.radius >= canvas.height - 50 || this.y - this.radius <= 0) {
            this.die();
        }

        this.distanceTraveled += PIPE_SPEED;
    }

    // Fait sauter l'oiseau
    jump() {
        this.velocity = JUMP_STRENGTH;
        if (sounds.jump) sounds.jump.play().catch(() => {});
    }

    // Décision IA : utilise le réseau neuronal
    think(pipes) {
        if (this.dead) return;

        // Trouve le prochain tuyau
        let nextPipe = null;
        for (let pipe of pipes) {
            if (pipe.x + PIPE_WIDTH > this.x) {
                nextPipe = pipe;
                break;
            }
        }

        if (!nextPipe) return;

        // Inputs du réseau neuronal :
        // 1. Position Y normalisée de l'oiseau
        // 2. Vélocité de l'oiseau
        // 3. Distance horizontale au tuyau
        // 4. Distance verticale au haut du tuyau
        // 5. Distance verticale au bas du tuyau
        const inputs = [
            this.y / canvas.height, // Position Y normalisée
            this.velocity / 20, // Vélocité normalisée
            (nextPipe.x - this.x) / canvas.width, // Distance horizontale
            (nextPipe.topHeight - this.y) / canvas.height, // Distance au haut
            ((nextPipe.topHeight + GAP_SIZE) - this.y) / canvas.height // Distance au bas
        ];

        // Forward pass du réseau neuronal
        const output = this.brain.predict(inputs);
        
        // Si l'output est > 0.5, l'oiseau saute
        if (output[0] > 0.5) {
            this.jump();
        }
    }

    // Dessine l'oiseau sur le canvas
    draw(isBest = false) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);

        // Corps de l'oiseau (cercle jaune)
        ctx.fillStyle = isBest ? '#FFD700' : '#FFD700';
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Œil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(5, -3, 4, 0, Math.PI * 2);
        ctx.fill();

        // Ailes (animation basée sur la vélocité)
        ctx.fillStyle = '#FF8C00';
        const wingOffset = Math.sin(frameCount * 0.3) * 5;
        ctx.beginPath();
        ctx.ellipse(-8, wingOffset, 8, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Contour spécial pour le meilleur oiseau
        if (isBest) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Marque l'oiseau comme mort
    die() {
        if (!this.dead) {
            this.dead = true;
            if (sounds.hit && mode === 'manual') sounds.hit.play().catch(() => {});
        }
    }

    // Calcule le fitness pour l'algorithme génétique
    calculateFitness() {
        this.fitness = this.score * 1000 + this.distanceTraveled;
        return this.fitness;
    }

    // Clone l'oiseau avec son cerveau
    clone() {
        const clone = new Bird(this.x, this.y);
        clone.brain = this.brain.copy();
        return clone;
    }
}

// ============================================
// CLASSE PIPE (Tuyau)
// ============================================
class Pipe {
    constructor(x) {
        this.x = x;
        this.width = PIPE_WIDTH;
        this.passed = false;
        
        // Génère un gap aléatoire
        const minTop = 50;
        const maxTop = canvas.height - 50 - GAP_SIZE;
        this.topHeight = Math.random() * (maxTop - minTop) + minTop;
        this.bottomY = this.topHeight + GAP_SIZE;
    }

    // Met à jour la position du tuyau
    update() {
        this.x -= PIPE_SPEED * speed;
    }

    // Dessine le tuyau
    draw() {
        // Tuyau du haut
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        
        // Bordure du tuyau du haut
        ctx.fillStyle = '#1a3009';
        ctx.fillRect(this.x, this.topHeight - 20, this.width, 20);
        ctx.fillRect(this.x - 5, this.topHeight - 20, this.width + 10, 20);

        // Tuyau du bas
        const bottomHeight = canvas.height - 50 - this.bottomY;
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(this.x, this.bottomY, this.width, bottomHeight);
        
        // Bordure du tuyau du bas
        ctx.fillStyle = '#1a3009';
        ctx.fillRect(this.x, this.bottomY, this.width, 20);
        ctx.fillRect(this.x - 5, this.bottomY, this.width + 10, 20);
    }

    // Vérifie la collision avec l'oiseau
    collides(bird) {
        if (bird.x + bird.radius > this.x && 
            bird.x - bird.radius < this.x + this.width) {
            if (bird.y - bird.radius < this.topHeight || 
                bird.y + bird.radius > this.bottomY) {
                return true;
            }
        }
        return false;
    }

    // Vérifie si l'oiseau a passé le tuyau
    checkPassed(bird) {
        if (!this.passed && bird.x > this.x + this.width) {
            this.passed = true;
            return true;
        }
        return false;
    }
}

// ============================================
// CLASSE NEURAL NETWORK (Réseau Neuronal)
// ============================================
class NeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.outputSize = outputSize;

        // Initialise les poids avec des valeurs aléatoires
        // W1: input -> hidden
        this.weights1 = this.createMatrix(inputSize, hiddenSize);
        // B1: biais pour la couche cachée
        this.bias1 = new Array(hiddenSize).fill(0).map(() => this.randomGaussian() * 0.5);
        
        // W2: hidden -> output
        this.weights2 = this.createMatrix(hiddenSize, outputSize);
        // B2: biais pour la couche de sortie
        this.bias2 = new Array(outputSize).fill(0).map(() => this.randomGaussian() * 0.5);
    }

    // Crée une matrice avec des valeurs aléatoires
    createMatrix(rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = [];
            for (let j = 0; j < cols; j++) {
                matrix[i][j] = this.randomGaussian() * 0.5;
            }
        }
        return matrix;
    }

    // Fonction d'activation sigmoïde
    sigmoid(x) {
        // Évite l'overflow
        if (x > 10) return 1;
        if (x < -10) return 0;
        return 1 / (1 + Math.exp(-x));
    }

    // Forward pass : calcule la sortie du réseau
    predict(inputs) {
        // Couche cachée
        const hidden = [];
        for (let i = 0; i < this.hiddenSize; i++) {
            let sum = this.bias1[i];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.weights1[j][i];
            }
            hidden[i] = this.sigmoid(sum);
        }

        // Couche de sortie
        const output = [];
        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.bias2[i];
            for (let j = 0; j < this.hiddenSize; j++) {
                sum += hidden[j] * this.weights2[j][i];
            }
            output[i] = this.sigmoid(sum);
        }

        return output;
    }

    // Mutation : ajoute du bruit gaussien aux poids
    mutate() {
        for (let i = 0; i < this.weights1.length; i++) {
            for (let j = 0; j < this.weights1[i].length; j++) {
                if (Math.random() < MUTATION_RATE) {
                    this.weights1[i][j] += this.randomGaussian() * MUTATION_STRENGTH;
                }
            }
        }

        for (let i = 0; i < this.bias1.length; i++) {
            if (Math.random() < MUTATION_RATE) {
                this.bias1[i] += this.randomGaussian() * MUTATION_STRENGTH;
            }
        }

        for (let i = 0; i < this.weights2.length; i++) {
            for (let j = 0; j < this.weights2[i].length; j++) {
                if (Math.random() < MUTATION_RATE) {
                    this.weights2[i][j] += this.randomGaussian() * MUTATION_STRENGTH;
                }
            }
        }

        for (let i = 0; i < this.bias2.length; i++) {
            if (Math.random() < MUTATION_RATE) {
                this.bias2[i] += this.randomGaussian() * MUTATION_STRENGTH;
            }
        }
    }

    // Crossover : combine deux réseaux neuronaux
    crossover(other) {
        const child = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
        
        // Combine les poids (moyenne pondérée)
        for (let i = 0; i < this.weights1.length; i++) {
            for (let j = 0; j < this.weights1[i].length; j++) {
                child.weights1[i][j] = Math.random() < 0.5 
                    ? this.weights1[i][j] 
                    : other.weights1[i][j];
            }
        }

        for (let i = 0; i < this.bias1.length; i++) {
            child.bias1[i] = Math.random() < 0.5 ? this.bias1[i] : other.bias1[i];
        }

        for (let i = 0; i < this.weights2.length; i++) {
            for (let j = 0; j < this.weights2[i].length; j++) {
                child.weights2[i][j] = Math.random() < 0.5 
                    ? this.weights2[i][j] 
                    : other.weights2[i][j];
            }
        }

        for (let i = 0; i < this.bias2.length; i++) {
            child.bias2[i] = Math.random() < 0.5 ? this.bias2[i] : other.bias2[i];
        }

        return child;
    }

    // Copie le réseau neuronal
    copy() {
        const copy = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
        
        // Copie les poids
        for (let i = 0; i < this.weights1.length; i++) {
            copy.weights1[i] = [...this.weights1[i]];
        }
        copy.bias1 = [...this.bias1];
        
        for (let i = 0; i < this.weights2.length; i++) {
            copy.weights2[i] = [...this.weights2[i]];
        }
        copy.bias2 = [...this.bias2];
        
        return copy;
    }

    // Génère un nombre aléatoire suivant une distribution gaussienne (Box-Muller)
    randomGaussian() {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
}

// ============================================
// CLASSE POPULATION (Algorithme Génétique)
// ============================================
class Population {
    constructor(size) {
        this.birds = [];
        this.size = size;
        this.generation = 1;
        this.bestFitness = 0;
        this.bestBird = null;
        
        // Crée la population initiale
        for (let i = 0; i < size; i++) {
            this.birds.push(new Bird(canvas.width / 4, canvas.height / 2));
        }
    }

    // Met à jour tous les oiseaux
    update() {
        // Mise à jour de tous les oiseaux
        for (let bird of this.birds) {
            if (!bird.dead) {
                bird.think(pipes);
                bird.update();
                
                // Vérifie les collisions avec les tuyaux
                for (let pipe of pipes) {
                    if (pipe.collides(bird)) {
                        bird.die();
                        break;
                    }
                    
                    // Vérifie si l'oiseau a passé un tuyau
                    if (pipe.checkPassed(bird)) {
                        bird.score++;
                        bird.fitness += 1000;
                        if (sounds.score && this.birds.indexOf(bird) === 0) {
                            sounds.score.play().catch(() => {});
                        }
                    }
                }
            }
        }
    }

    // Dessine tous les oiseaux
    draw() {
        // Trouve le meilleur oiseau vivant
        let bestAlive = null;
        let bestScore = -1;
        
        for (let bird of this.birds) {
            if (!bird.dead && bird.score > bestScore) {
                bestScore = bird.score;
                bestAlive = bird;
            }
        }

        // Dessine tous les oiseaux
        for (let bird of this.birds) {
            if (!bird.dead) {
                bird.draw(bird === bestAlive);
            }
        }
    }

    // Vérifie si tous les oiseaux sont morts
    allDead() {
        return this.birds.every(bird => bird.dead);
    }

    // Calcule le fitness de tous les oiseaux
    calculateFitness() {
        let maxFitness = 0;
        for (let bird of this.birds) {
            const fitness = bird.calculateFitness();
            if (fitness > maxFitness) {
                maxFitness = fitness;
                this.bestBird = bird;
            }
        }
        this.bestFitness = maxFitness;
        
        // Normalise les fitness
        let sum = 0;
        for (let bird of this.birds) {
            sum += bird.fitness;
        }
        for (let bird of this.birds) {
            if (sum > 0) {
                bird.fitness /= sum;
            }
        }
    }

    // Sélection naturelle : sélectionne les meilleurs oiseaux
    selection() {
        // Trie par fitness
        this.birds.sort((a, b) => b.fitness - a.fitness);
        
        // Garde les meilleurs
        const elite = this.birds.slice(0, ELITE_SIZE);
        return elite;
    }

    // Génère une nouvelle génération
    nextGeneration() {
        this.calculateFitness();
        const elite = this.selection();
        
        // Sauvegarde le meilleur réseau
        if (this.bestBird) {
            try {
                localStorage.setItem('bestFlappyBirdBrain', JSON.stringify({
                    weights1: this.bestBird.brain.weights1,
                    bias1: this.bestBird.brain.bias1,
                    weights2: this.bestBird.brain.weights2,
                    bias2: this.bestBird.brain.bias2
                }));
            } catch (e) {
                console.log('Erreur sauvegarde:', e);
            }
        }
        
        // Crée la nouvelle génération
        const newBirds = [];
        
        // Garde le meilleur oiseau sans mutation (elitisme)
        newBirds.push(new Bird(canvas.width / 4, canvas.height / 2, this.bestBird.brain.copy()));
        
        // Génère le reste de la population
        while (newBirds.length < this.size) {
            // Sélectionne deux parents aléatoires parmi l'élite
            const parent1 = elite[Math.floor(Math.random() * elite.length)];
            const parent2 = elite[Math.floor(Math.random() * elite.length)];
            
            // Crée un enfant par crossover
            const childBrain = parent1.brain.crossover(parent2.brain);
            childBrain.mutate();
            
            newBirds.push(new Bird(canvas.width / 4, canvas.height / 2, childBrain));
        }
        
        this.birds = newBirds;
        this.generation++;
    }
}

// ============================================
// INITIALISATION DES SONS
// ============================================
function initSounds() {
    // Crée des sons simples via Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Son de saut (fréquence courte)
        sounds.jump = createTone(audioContext, 400, 0.1, 'sine');
        
        // Son de point (fréquence moyenne)
        sounds.score = createTone(audioContext, 600, 0.15, 'square');
        
        // Son de collision (fréquence basse)
        sounds.hit = createTone(audioContext, 200, 0.3, 'sawtooth');
    } catch (e) {
        console.log('Audio non disponible:', e);
    }
}

// Crée un son simple
function createTone(audioContext, frequency, duration, type = 'sine') {
    return {
        play: function() {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
            
            return Promise.resolve();
        }
    };
}

// ============================================
// INITIALISATION DU CANVAS
// ============================================
function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    networkCanvas = document.getElementById('networkCanvas');
    networkCtx = networkCanvas.getContext('2d');
    
    // Définit la taille du canvas
    const maxWidth = Math.min(800, window.innerWidth - 40);
    const maxHeight = Math.min(600, window.innerHeight - 300);
    
    canvas.width = maxWidth;
    canvas.height = maxHeight;
    canvas.style.width = maxWidth + 'px';
    canvas.style.height = maxHeight + 'px';
    
    networkCanvas.width = 400;
    networkCanvas.height = 300;
}

// ============================================
// FONCTIONS DE DESSIN
// ============================================
function drawBackground() {
    // Ciel bleu
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98D8E8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Nuages
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    drawCloud(canvas.width * 0.2, canvas.height * 0.2, 60);
    drawCloud(canvas.width * 0.6, canvas.height * 0.15, 50);
    drawCloud(canvas.width * 0.8, canvas.height * 0.3, 45);
}

function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size * 1.2, y, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 0.6, y - size * 0.5, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
}

function drawGround() {
    // Sol vert
    const groundY = canvas.height - 50;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, groundY, canvas.width, 50);
    
    // Herbe
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, groundY, canvas.width, 10);
    
    // Lignes pour l'effet de mouvement
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i - (frameCount * PIPE_SPEED * speed) % 40, groundY + 10);
        ctx.lineTo(i - (frameCount * PIPE_SPEED * speed) % 40, groundY + 20);
        ctx.stroke();
    }
}

function drawNetwork(bird) {
    if (!bird || !bird.brain) return;
    
    networkCtx.clearRect(0, 0, networkCanvas.width, networkCanvas.height);
    networkCtx.fillStyle = '#000';
    networkCtx.font = '12px Arial';
    networkCtx.fillText('Réseau Neuronal (Meilleur)', 10, 20);
    
    const brain = bird.brain;
    const nodeRadius = 15;
    const inputY = 60;
    const hiddenY = 150;
    const outputY = 240;
    const startX = 50;
    const spacing = 60;
    
    // Dessine les connexions
    networkCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    networkCtx.lineWidth = 1;
    
    // Input -> Hidden
    for (let i = 0; i < brain.inputSize; i++) {
        for (let j = 0; j < brain.hiddenSize; j++) {
            const weight = brain.weights1[i][j];
            networkCtx.strokeStyle = weight > 0 
                ? `rgba(0, 255, 0, ${Math.abs(weight)})` 
                : `rgba(255, 0, 0, ${Math.abs(weight)})`;
            networkCtx.beginPath();
            networkCtx.moveTo(startX + i * spacing, inputY);
            networkCtx.lineTo(startX + j * spacing, hiddenY);
            networkCtx.stroke();
        }
    }
    
    // Hidden -> Output
    for (let i = 0; i < brain.hiddenSize; i++) {
        for (let j = 0; j < brain.outputSize; j++) {
            const weight = brain.weights2[i][j];
            networkCtx.strokeStyle = weight > 0 
                ? `rgba(0, 255, 0, ${Math.abs(weight)})` 
                : `rgba(255, 0, 0, ${Math.abs(weight)})`;
            networkCtx.beginPath();
            networkCtx.moveTo(startX + i * spacing, hiddenY);
            networkCtx.lineTo(startX + j * spacing, outputY);
            networkCtx.stroke();
        }
    }
    
    // Dessine les nœuds
    // Input nodes
    for (let i = 0; i < brain.inputSize; i++) {
        networkCtx.fillStyle = '#4CAF50';
        networkCtx.beginPath();
        networkCtx.arc(startX + i * spacing, inputY, nodeRadius, 0, Math.PI * 2);
        networkCtx.fill();
        networkCtx.strokeStyle = '#000';
        networkCtx.lineWidth = 2;
        networkCtx.stroke();
    }
    
    // Hidden nodes
    for (let i = 0; i < brain.hiddenSize; i++) {
        networkCtx.fillStyle = '#2196F3';
        networkCtx.beginPath();
        networkCtx.arc(startX + i * spacing, hiddenY, nodeRadius, 0, Math.PI * 2);
        networkCtx.fill();
        networkCtx.strokeStyle = '#000';
        networkCtx.stroke();
    }
    
    // Output node
    networkCtx.fillStyle = '#FF5722';
    networkCtx.beginPath();
    networkCtx.arc(startX, outputY, nodeRadius, 0, Math.PI * 2);
    networkCtx.fill();
    networkCtx.strokeStyle = '#000';
    networkCtx.stroke();
}

// ============================================
// GESTION DU JEU
// ============================================
function startGame() {
    gameState = 'playing';
    score = 0;
    frameCount = 0;
    pipes = [];
    
    if (mode === 'manual') {
        bird = new Bird(canvas.width / 4, canvas.height / 2);
    } else {
        // Charge le meilleur cerveau sauvegardé si disponible
        let savedBrain = null;
        try {
            const saved = localStorage.getItem('bestFlappyBirdBrain');
            if (saved) {
                const data = JSON.parse(saved);
                savedBrain = new NeuralNetwork(5, 8, 1);
                savedBrain.weights1 = data.weights1;
                savedBrain.bias1 = data.bias1;
                savedBrain.weights2 = data.weights2;
                savedBrain.bias2 = data.bias2;
            }
        } catch (e) {
            console.log('Erreur chargement:', e);
        }
        
        population = new Population(POPULATION_SIZE);
        population.generation = generation;
        if (savedBrain && population.birds.length > 0) {
            population.birds[0].brain = savedBrain;
        }
        generation = population.generation;
    }
    
    document.getElementById('gameOver').classList.add('hidden');
    updateStats();
    gameLoop();
}

function resetGame() {
    gameState = 'stopped';
    score = 0;
    pipes = [];
    bird = null;
    population = null;
    generation = 1;
    document.getElementById('gameOver').classList.add('hidden');
    updateStats();
    draw();
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    const currentTime = performance.now();
    deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    // Mise à jour du jeu
    update();
    
    // Dessin
    draw();
    
    // Continue la boucle
    requestAnimationFrame(gameLoop);
}

function update() {
    frameCount++;
    
    // Génère de nouveaux tuyaux
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - PIPE_SPACING) {
        pipes.push(new Pipe(canvas.width));
    }
    
    // Met à jour les tuyaux
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].update();
        
        // Supprime les tuyaux hors écran
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
    
    if (mode === 'manual') {
        // Mode manuel
        if (bird && !bird.dead) {
            bird.update();
            
            // Vérifie les collisions
            for (let pipe of pipes) {
                if (pipe.collides(bird)) {
                    bird.die();
                    gameOver();
                    return;
                }
                
                // Vérifie si l'oiseau a passé un tuyau
                if (pipe.checkPassed(bird)) {
                    score++;
                    if (score > bestScore) bestScore = score;
                    if (sounds.score) sounds.score.play().catch(() => {});
                }
            }
        }
    } else {
        // Mode IA
        if (population) {
            population.update();
            
            // Vérifie si tous les oiseaux sont morts
            if (population.allDead()) {
                const bestBird = population.bestBird || population.birds[0];
                if (bestBird && bestBird.score > bestScore) {
                    bestScore = bestBird.score;
                }
                bestFitness = population.bestFitness;
                population.nextGeneration();
                generation = population.generation;
                pipes = [];
                frameCount = 0;
            }
            
            // Met à jour le score avec le meilleur oiseau
            let maxScore = 0;
            for (let bird of population.birds) {
                if (!bird.dead && bird.score > maxScore) {
                    maxScore = bird.score;
                }
            }
            score = maxScore;
        }
    }
    
    updateStats();
}

function draw() {
    // Efface le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dessine le fond
    drawBackground();
    
    // Dessine les tuyaux
    for (let pipe of pipes) {
        pipe.draw();
    }
    
    // Dessine le sol
    drawGround();
    
    // Dessine l'oiseau ou la population
    if (mode === 'manual') {
        if (bird && !bird.dead) {
            bird.draw();
        }
    } else {
        if (population) {
            population.draw();
            
            // Dessine le réseau neuronal du meilleur oiseau
            let bestAlive = null;
            for (let bird of population.birds) {
                if (!bird.dead) {
                    bestAlive = bird;
                    break;
                }
            }
            if (bestAlive) {
                drawNetwork(bestAlive);
                document.getElementById('networkCanvas').classList.remove('hidden');
            }
        }
    }
}

function gameOver() {
    gameState = 'gameOver';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

function updateStats() {
    document.getElementById('score').textContent = score;
    document.getElementById('bestScore').textContent = bestScore;
    
    if (mode === 'ai') {
        document.getElementById('aiStats').style.display = 'block';
        document.getElementById('aiStats2').style.display = 'block';
        document.getElementById('aiStats3').style.display = 'block';
        
        document.getElementById('generation').textContent = generation;
        
        if (population) {
            let alive = 0;
            for (let bird of population.birds) {
                if (!bird.dead) alive++;
            }
            document.getElementById('aliveCount').textContent = alive;
            document.getElementById('bestFitness').textContent = Math.round(population.bestFitness);
        }
    } else {
        document.getElementById('aiStats').style.display = 'none';
        document.getElementById('aiStats2').style.display = 'none';
        document.getElementById('aiStats3').style.display = 'none';
        document.getElementById('networkCanvas').classList.add('hidden');
    }
}

// ============================================
// GESTIONNAIRES D'ÉVÉNEMENTS
// ============================================
function setupEventListeners() {
    // Bouton Start
    document.getElementById('startBtn').addEventListener('click', () => {
        if (gameState === 'stopped' || gameState === 'gameOver') {
            startGame();
        }
    });
    
    // Bouton Mode
    document.getElementById('modeBtn').addEventListener('click', () => {
        if (gameState === 'stopped' || gameState === 'gameOver') {
            mode = mode === 'manual' ? 'ai' : 'manual';
            document.getElementById('modeBtn').textContent = `Mode: ${mode === 'manual' ? 'Manuel' : 'IA'}`;
            resetGame();
        }
    });
    
    // Bouton Vitesse
    document.getElementById('speedBtn').addEventListener('click', () => {
        if (mode === 'ai') {
            speed = speed === 1 ? 2 : speed === 2 ? 10 : 1;
            document.getElementById('speedBtn').textContent = `Vitesse: x${speed}`;
        }
    });
    
    // Bouton Reset
    document.getElementById('resetBtn').addEventListener('click', () => {
        if (mode === 'ai') {
            try {
                localStorage.removeItem('bestFlappyBirdBrain');
            } catch (e) {
                console.log('Erreur reset:', e);
            }
            generation = 1;
            resetGame();
        }
    });
    
    // Bouton Restart
    document.getElementById('restartBtn').addEventListener('click', () => {
        startGame();
    });
    
    // Clic/Saut (mode manuel)
    canvas.addEventListener('click', () => {
        if (gameState === 'playing' && mode === 'manual' && bird && !bird.dead) {
            bird.jump();
        }
    });
    
    // Touch pour mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState === 'playing' && mode === 'manual' && bird && !bird.dead) {
            bird.jump();
        }
    });
    
    // Touche espace
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && gameState === 'playing' && mode === 'manual' && bird && !bird.dead) {
            e.preventDefault();
            bird.jump();
        }
    });
    
    // Redimensionnement de la fenêtre
    window.addEventListener('resize', () => {
        if (gameState === 'stopped') {
            initCanvas();
            draw();
        }
    });
}

// ============================================
// INITIALISATION
// ============================================
function init() {
    initCanvas();
    initSounds();
    setupEventListeners();
    draw();
}

// Démarre quand la page est chargée
window.addEventListener('load', init);
