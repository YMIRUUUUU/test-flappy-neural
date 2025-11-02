// ============================================
// CONFIGURATION TETRIS
// ============================================
const TETRIS_CONFIG = {
    COLS: 10,
    ROWS: 20,
    BLOCK_SIZE: 30,
    POPULATION_SIZE: 50,
    MUTATION_RATE: 0.1,
    MUTATION_STRENGTH: 0.3,
    ELITE_SIZE: 10
};

// ============================================
// PIÈCES TETRIS (TETROMINOS)
// ============================================
const TETROMINOS = {
    I: {
        shape: [[1,1,1,1]],
        color: '#00f5ff'
    },
    O: {
        shape: [[1,1],[1,1]],
        color: '#ffd700'
    },
    T: {
        shape: [[0,1,0],[1,1,1]],
        color: '#9d4edd'
    },
    S: {
        shape: [[0,1,1],[1,1,0]],
        color: '#06ff00'
    },
    Z: {
        shape: [[1,1,0],[0,1,1]],
        color: '#ff006e'
    },
    J: {
        shape: [[1,0,0],[1,1,1]],
        color: '#0077b6'
    },
    L: {
        shape: [[0,0,1],[1,1,1]],
        color: '#ff8500'
    }
};

// ============================================
// CLASSE TETRIS PIECE
// ============================================
class TetrisPiece {
    constructor(type, x = 0, y = 0) {
        this.type = type;
        this.shape = TETROMINOS[type].shape.map(row => [...row]);
        this.color = TETROMINOS[type].color;
        this.x = x;
        this.y = y;
        this.rotation = 0;
    }

    rotate() {
        const rotated = [];
        const rows = this.shape.length;
        const cols = this.shape[0].length;
        for (let i = 0; i < cols; i++) {
            rotated[i] = [];
            for (let j = 0; j < rows; j++) {
                rotated[i][j] = this.shape[rows - 1 - j][i];
            }
        }
        this.shape = rotated;
    }

    clone() {
        const clone = new TetrisPiece(this.type, this.x, this.y);
        clone.shape = this.shape.map(row => [...row]);
        clone.rotation = this.rotation;
        return clone;
    }
}

// ============================================
// CLASSE TETRIS BOARD
// ============================================
class TetrisBoard {
    constructor() {
        this.grid = Array(TETRIS_CONFIG.ROWS).fill(null).map(() => 
            Array(TETRIS_CONFIG.COLS).fill(0)
        );
        this.colors = Array(TETRIS_CONFIG.ROWS).fill(null).map(() => 
            Array(TETRIS_CONFIG.COLS).fill(null)
        );
    }

    isValidPosition(piece, dx = 0, dy = 0) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const newX = piece.x + x + dx;
                    const newY = piece.y + y + dy;
                    if (newX < 0 || newX >= TETRIS_CONFIG.COLS || 
                        newY >= TETRIS_CONFIG.ROWS ||
                        (newY >= 0 && this.grid[newY][newX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    placePiece(piece) {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardY = piece.y + y;
                    const boardX = piece.x + x;
                    if (boardY >= 0) {
                        this.grid[boardY][boardX] = 1;
                        this.colors[boardY][boardX] = piece.color;
                    }
                }
            }
        }
    }

    clearLines() {
        let linesCleared = 0;
        for (let y = TETRIS_CONFIG.ROWS - 1; y >= 0; y--) {
            if (this.grid[y].every(cell => cell === 1)) {
                this.grid.splice(y, 1);
                this.colors.splice(y, 1);
                this.grid.unshift(Array(TETRIS_CONFIG.COLS).fill(0));
                this.colors.unshift(Array(TETRIS_CONFIG.COLS).fill(null));
                linesCleared++;
                y++;
            }
        }
        return linesCleared;
    }

    getHeight() {
        for (let y = 0; y < TETRIS_CONFIG.ROWS; y++) {
            if (this.grid[y].some(cell => cell === 1)) {
                return TETRIS_CONFIG.ROWS - y;
            }
        }
        return 0;
    }

    getHoles() {
        let holes = 0;
        for (let x = 0; x < TETRIS_CONFIG.COLS; x++) {
            let blockFound = false;
            for (let y = 0; y < TETRIS_CONFIG.ROWS; y++) {
                if (this.grid[y][x]) {
                    blockFound = true;
                } else if (blockFound) {
                    holes++;
                }
            }
        }
        return holes;
    }

    getBumpiness() {
        let bumpiness = 0;
        const heights = [];
        for (let x = 0; x < TETRIS_CONFIG.COLS; x++) {
            let height = 0;
            for (let y = 0; y < TETRIS_CONFIG.ROWS; y++) {
                if (this.grid[y][x]) {
                    height = TETRIS_CONFIG.ROWS - y;
                    break;
                }
            }
            heights.push(height);
        }
        for (let i = 0; i < heights.length - 1; i++) {
            bumpiness += Math.abs(heights[i] - heights[i + 1]);
        }
        return bumpiness;
    }

    isGameOver() {
        return this.grid[0].some(cell => cell === 1);
    }

    clone() {
        const clone = new TetrisBoard();
        clone.grid = this.grid.map(row => [...row]);
        clone.colors = this.colors.map(row => [...row]);
        return clone;
    }
}

// ============================================
// CLASSE TETRIS PLAYER (IA)
// ============================================
class TetrisPlayer {
    constructor(brain = null) {
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.alive = true;
        this.board = new TetrisBoard();
        this.currentPiece = null;
        this.nextPiece = null;
        this.fitness = 0;
        this.brain = brain ? brain.copy() : new NeuralNetwork(10, 16, 7, TETRIS_CONFIG.MUTATION_RATE, TETRIS_CONFIG.MUTATION_STRENGTH);
        this.gameOver = false;
    }

    reset() {
        this.board = new TetrisBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.alive = true;
        this.gameOver = false;
        this.fitness = 0;
        this.spawnPiece();
        this.spawnNext();
    }

    spawnPiece() {
        const types = Object.keys(TETROMINOS);
        const type = types[Math.floor(Math.random() * types.length)];
        this.currentPiece = new TetrisPiece(type, Math.floor(TETRIS_CONFIG.COLS / 2) - 1, 0);
    }

    spawnNext() {
        const types = Object.keys(TETROMINOS);
        const type = types[Math.floor(Math.random() * types.length)];
        this.nextPiece = new TetrisPiece(type);
    }

    dropPiece() {
        if (!this.currentPiece || this.gameOver) return;
        
        this.currentPiece.y++;
        if (!this.board.isValidPosition(this.currentPiece)) {
            this.currentPiece.y--;
            this.board.placePiece(this.currentPiece);
            const linesCleared = this.board.clearLines();
            if (linesCleared > 0) {
                this.lines += linesCleared;
                this.score += [0, 100, 300, 500, 800][linesCleared] * (this.level + 1);
                this.level = Math.floor(this.lines / 10) + 1;
            }
            this.currentPiece = this.nextPiece;
            this.currentPiece.x = Math.floor(TETRIS_CONFIG.COLS / 2) - 1;
            this.currentPiece.y = 0;
            this.spawnNext();
            if (!this.board.isValidPosition(this.currentPiece)) {
                this.gameOver = true;
                this.alive = false;
            }
        }
    }

    moveLeft() {
        if (this.currentPiece && this.board.isValidPosition(this.currentPiece, -1, 0)) {
            this.currentPiece.x--;
        }
    }

    moveRight() {
        if (this.currentPiece && this.board.isValidPosition(this.currentPiece, 1, 0)) {
            this.currentPiece.x++;
        }
    }

    rotate() {
        if (!this.currentPiece) return;
        const original = this.currentPiece.shape.map(row => [...row]);
        this.currentPiece.rotate();
        if (!this.board.isValidPosition(this.currentPiece)) {
            // Essayer de décaler
            this.currentPiece.x--;
            if (!this.board.isValidPosition(this.currentPiece)) {
                this.currentPiece.x += 2;
                if (!this.board.isValidPosition(this.currentPiece)) {
                    this.currentPiece.x--;
                    this.currentPiece.shape = original;
                }
            }
        }
    }

    hardDrop() {
        if (!this.currentPiece) return;
        while (this.board.isValidPosition(this.currentPiece, 0, 1)) {
            this.currentPiece.y++;
        }
        this.dropPiece();
    }

    think() {
        if (!this.currentPiece || this.gameOver) return;

        // Calculer les features du board
        const height = this.board.getHeight();
        const holes = this.board.getHoles();
        const bumpiness = this.board.getBumpiness();
        
        // Features de la pièce actuelle
        const pieceX = this.currentPiece.x;
        const pieceY = this.currentPiece.y;
        const pieceType = Object.keys(TETROMINOS).indexOf(this.currentPiece.type);
        
        // Calculer la distance au sol
        let dropDistance = 0;
        const testPiece = this.currentPiece.clone();
        while (this.board.isValidPosition(testPiece, 0, 1)) {
            testPiece.y++;
            dropDistance++;
        }

        // Inputs du réseau
        const inputs = [
            height / TETRIS_CONFIG.ROWS,
            holes / (TETRIS_CONFIG.COLS * TETRIS_CONFIG.ROWS),
            bumpiness / (TETRIS_CONFIG.COLS * 10),
            pieceX / TETRIS_CONFIG.COLS,
            pieceY / TETRIS_CONFIG.ROWS,
            pieceType / Object.keys(TETROMINOS).length,
            dropDistance / TETRIS_CONFIG.ROWS,
            this.lines / 100,
            this.level / 20,
            (TETRIS_CONFIG.COLS / 2 - pieceX) / TETRIS_CONFIG.COLS
        ];

        // Décision du réseau (7 outputs: gauche, droite, rotation, drop, wait, left+drop, right+drop)
        const output = this.brain.predict(inputs);
        
        // Trouver l'action avec la plus forte probabilité
        const actions = [
            () => this.moveLeft(),
            () => this.moveRight(),
            () => this.rotate(),
            () => this.hardDrop(),
            () => {}, // wait
            () => { this.moveLeft(); this.hardDrop(); },
            () => { this.moveRight(); this.hardDrop(); }
        ];

        const maxIndex = output.indexOf(Math.max(...output));
        if (maxIndex < actions.length) {
            actions[maxIndex]();
        }

        // Toujours descendre
        this.dropPiece();
    }

    updateFitness() {
        this.fitness = this.score + 
            this.lines * 100 + 
            (this.board.getHeight() < TETRIS_CONFIG.ROWS / 2 ? 50 : 0) -
            this.board.getHoles() * 10 -
            this.board.getBumpiness() * 2;
    }
}

// ============================================
// CLASSE TETRIS POPULATION
// ============================================
class TetrisPopulation {
    constructor(size) {
        this.size = size;
        this.players = [];
        this.generation = 1;
        this.bestFitness = 0;
        this.allTimeBest = null;
        
        for (let i = 0; i < size; i++) {
            this.players.push(new TetrisPlayer());
        }
    }

    update() {
        let aliveCount = 0;
        for (let player of this.players) {
            if (player.alive && !player.gameOver) {
                player.think();
                player.updateFitness();
                if (player.fitness > this.bestFitness) {
                    this.bestFitness = player.fitness;
                }
                aliveCount++;
            }
        }
        return aliveCount;
    }

    allDead() {
        return this.players.every(p => p.gameOver || !p.alive);
    }

    evolve() {
        this.players.sort((a, b) => b.fitness - a.fitness);
        
        if (!this.allTimeBest || this.players[0].fitness > this.allTimeBest.fitness) {
            this.allTimeBest = this.players[0].brain.copy();
        }

        const newPlayers = [];
        newPlayers.push(new TetrisPlayer(this.players[0].brain.copy()));

        while (newPlayers.length < this.size) {
            const parent1 = this.selectParent();
            const parent2 = this.selectParent();
            const childBrain = NeuralNetwork.crossover(parent1.brain, parent2.brain);
            childBrain.mutate();
            newPlayers.push(new TetrisPlayer(childBrain));
        }

        this.players = newPlayers;
        this.generation++;
        this.bestFitness = 0;
    }

    selectParent() {
        const totalFitness = this.players.reduce((sum, p) => sum + Math.max(p.fitness, 0), 0);
        if (totalFitness === 0) {
            return this.players[Math.floor(Math.random() * TETRIS_CONFIG.ELITE_SIZE)];
        }
        let random = Math.random() * totalFitness;
        let sum = 0;
        for (let player of this.players) {
            sum += Math.max(player.fitness, 0);
            if (sum >= random) {
                return player;
            }
        }
        return this.players[0];
    }

    getBestPlayer() {
        return this.players.reduce((best, p) => 
            p.fitness > best.fitness ? p : best, this.players[0]
        );
    }
}

// ============================================
// CLASSE TETRIS GAME
// ============================================
class TetrisGame {
    constructor() {
        this.canvas = document.getElementById('tetrisCanvas');
        this.nextCanvas = document.getElementById('tetrisNextCanvas');
        this.previewCanvas = document.getElementById('tetrisPreviewCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        this.resizeCanvas();
        
        this.player = null;
        this.population = null;
        this.gameMode = 'manual';
        this.gameRunning = false;
        this.paused = false;
        this.speed = 1;
        this.frameCount = 0;
        this.dropInterval = 60;
        this.keys = {};
        
        this.setupEventListeners();
        this.initStats();
    }

    resizeCanvas() {
        const blockSize = TETRIS_CONFIG.BLOCK_SIZE;
        this.canvas.width = TETRIS_CONFIG.COLS * blockSize;
        this.canvas.height = TETRIS_CONFIG.ROWS * blockSize;
        this.nextCanvas.width = 120;
        this.nextCanvas.height = 120;
        this.previewCanvas.width = 300;
        this.previewCanvas.height = 300;
    }

    setupEventListeners() {
        const tetrisPage = document.getElementById('tetris');
        if (!tetrisPage) return;

        tetrisPage.querySelector('.tetris-startBtn').addEventListener('click', () => this.start());
        tetrisPage.querySelector('.tetris-modeBtn').addEventListener('click', () => this.toggleMode());
        tetrisPage.querySelector('.tetris-speedBtn').addEventListener('click', () => this.toggleSpeed());
        tetrisPage.querySelector('.tetris-pauseBtn').addEventListener('click', () => this.togglePause());
        tetrisPage.querySelector('.tetris-resetBtn').addEventListener('click', () => this.reset());
        tetrisPage.querySelector('.tetris-restartBtn').addEventListener('click', () => this.restart());
        tetrisPage.querySelector('.tetris-saveBtn').addEventListener('click', () => this.saveBestNetwork());
        tetrisPage.querySelector('.tetris-loadBtn').addEventListener('click', () => this.loadBestNetwork());

        document.addEventListener('keydown', (e) => {
            if (window.tabManager?.currentTab !== 'tetris') return;
            this.keys[e.code] = true;
            if (this.gameMode === 'manual' && this.player && !this.paused) {
                if (e.code === 'ArrowLeft') this.player.moveLeft();
                if (e.code === 'ArrowRight') this.player.moveRight();
                if (e.code === 'ArrowUp') this.player.rotate();
                if (e.code === 'ArrowDown') this.player.dropPiece();
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.player.hardDrop();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    start() {
        if (this.gameRunning) return;
        this.gameRunning = true;
        this.paused = false;
        
        if (this.gameMode === 'manual') {
            this.player = new TetrisPlayer();
            this.player.reset();
        } else {
            this.population = new TetrisPopulation(TETRIS_CONFIG.POPULATION_SIZE);
            this.population.players.forEach(p => p.reset());
        }
        
        const gameOver = document.querySelector('#tetris .game-over');
        if (gameOver) gameOver.classList.add('hidden');
        
        this.gameLoop();
    }

    toggleMode() {
        if (this.gameRunning) return;
        this.gameMode = this.gameMode === 'manual' ? 'ai' : 'manual';
        const btn = document.querySelector('#tetris .tetris-modeBtn');
        if (btn) btn.textContent = this.gameMode === 'manual' ? 'Mode IA' : 'Mode Manuel';
    }

    toggleSpeed() {
        const speeds = [1, 2, 5, 10];
        const currentIndex = speeds.indexOf(this.speed);
        this.speed = speeds[(currentIndex + 1) % speeds.length];
        const btn = document.querySelector('#tetris .tetris-speedBtn');
        if (btn) btn.textContent = `⏩ Vitesse: ${this.speed}x`;
    }

    togglePause() {
        this.paused = !this.paused;
    }

    reset() {
        this.gameRunning = false;
        this.paused = false;
        this.player = null;
        this.population = null;
        this.draw();
    }

    restart() {
        this.gameRunning = false;
        this.start();
    }

    update() {
        if (!this.gameRunning || this.paused || window.tabManager?.currentTab !== 'tetris') return;

        for (let i = 0; i < this.speed; i++) {
            this.frameCount++;

            if (this.gameMode === 'manual' && this.player) {
                if (this.frameCount % this.dropInterval === 0) {
                    this.player.dropPiece();
                    if (this.player.gameOver) {
                        this.gameOver();
                        return;
                    }
                }
            } else if (this.gameMode === 'ai' && this.population) {
                const aliveCount = this.population.update();
                
                if (this.population.allDead()) {
                    this.population.evolve();
                    this.population.players.forEach(p => p.reset());
                }
                
                this.updateStats();
            }
        }
    }

    draw() {
        if (window.tabManager?.currentTab !== 'tetris') return;

        // Fond
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grille
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= TETRIS_CONFIG.COLS; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * TETRIS_CONFIG.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * TETRIS_CONFIG.BLOCK_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= TETRIS_CONFIG.ROWS; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * TETRIS_CONFIG.BLOCK_SIZE);
            this.ctx.lineTo(this.canvas.width, y * TETRIS_CONFIG.BLOCK_SIZE);
            this.ctx.stroke();
        }

        // Dessiner le board
        if (this.gameMode === 'manual' && this.player) {
            this.drawBoard(this.ctx, this.player.board, this.player.currentPiece);
            this.drawNext(this.player.nextPiece);
        } else if (this.gameMode === 'ai' && this.population) {
            const best = this.population.getBestPlayer();
            this.drawBoard(this.ctx, best.board, best.currentPiece);
            this.drawNext(best.nextPiece);
        }
    }

    drawBoard(ctx, board, currentPiece) {
        // Dessiner les blocs posés
        for (let y = 0; y < TETRIS_CONFIG.ROWS; y++) {
            for (let x = 0; x < TETRIS_CONFIG.COLS; x++) {
                if (board.grid[y][x]) {
                    this.drawBlock(ctx, x, y, board.colors[y][x] || '#fff');
                }
            }
        }

        // Dessiner la pièce actuelle
        if (currentPiece) {
            for (let y = 0; y < currentPiece.shape.length; y++) {
                for (let x = 0; x < currentPiece.shape[y].length; x++) {
                    if (currentPiece.shape[y][x]) {
                        this.drawBlock(ctx, 
                            currentPiece.x + x, 
                            currentPiece.y + y, 
                            currentPiece.color
                        );
                    }
                }
            }

            // Ombre de la pièce
            const shadowY = currentPiece.y;
            let dropY = shadowY;
            const testPiece = currentPiece.clone();
            while (board.isValidPosition(testPiece, 0, 1)) {
                testPiece.y++;
                dropY++;
            }
            if (dropY > shadowY) {
                for (let y = 0; y < currentPiece.shape.length; y++) {
                    for (let x = 0; x < currentPiece.shape[y].length; x++) {
                        if (currentPiece.shape[y][x]) {
                            this.drawBlockShadow(ctx, 
                                currentPiece.x + x, 
                                dropY + y
                            );
                        }
                    }
                }
            }
        }
    }

    drawBlock(ctx, x, y, color) {
        const px = x * TETRIS_CONFIG.BLOCK_SIZE;
        const py = y * TETRIS_CONFIG.BLOCK_SIZE;
        
        // Ombre
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(px + 2, py + 2, TETRIS_CONFIG.BLOCK_SIZE, TETRIS_CONFIG.BLOCK_SIZE);
        
        // Bloc principal
        const gradient = ctx.createLinearGradient(px, py, px + TETRIS_CONFIG.BLOCK_SIZE, py + TETRIS_CONFIG.BLOCK_SIZE);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, this.darkenColor(color, 0.3));
        ctx.fillStyle = gradient;
        ctx.fillRect(px, py, TETRIS_CONFIG.BLOCK_SIZE - 2, TETRIS_CONFIG.BLOCK_SIZE - 2);
        
        // Bordure
        ctx.strokeStyle = this.lightenColor(color, 0.5);
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, TETRIS_CONFIG.BLOCK_SIZE - 2, TETRIS_CONFIG.BLOCK_SIZE - 2);
        
        // Reflet
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(px + 2, py + 2, TETRIS_CONFIG.BLOCK_SIZE - 8, 8);
    }

    drawBlockShadow(ctx, x, y) {
        const px = x * TETRIS_CONFIG.BLOCK_SIZE;
        const py = y * TETRIS_CONFIG.BLOCK_SIZE;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(px, py, TETRIS_CONFIG.BLOCK_SIZE - 2, TETRIS_CONFIG.BLOCK_SIZE - 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TETRIS_CONFIG.BLOCK_SIZE - 2, TETRIS_CONFIG.BLOCK_SIZE - 2);
    }

    drawNext(piece) {
        if (!piece) return;
        this.nextCtx.fillStyle = '#0f172a';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        const offsetX = (this.nextCanvas.width - piece.shape[0].length * 20) / 2;
        const offsetY = (this.nextCanvas.height - piece.shape.length * 20) / 2;
        
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const px = offsetX + x * 20;
                    const py = offsetY + y * 20;
                    this.nextCtx.fillStyle = piece.color;
                    this.nextCtx.fillRect(px, py, 18, 18);
                    this.nextCtx.strokeStyle = this.lightenColor(piece.color, 0.5);
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.strokeRect(px, py, 18, 18);
                }
            }
        }
    }

    darkenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(255 * amount);
        const R = Math.max(0, ((num >> 16) & 0xFF) - amt);
        const G = Math.max(0, ((num >> 8) & 0xFF) - amt);
        const B = Math.max(0, (num & 0xFF) - amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    lightenColor(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(255 * amount);
        const R = Math.min(255, ((num >> 16) & 0xFF) + amt);
        const G = Math.min(255, ((num >> 8) & 0xFF) + amt);
        const B = Math.min(255, (num & 0xFF) + amt);
        return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
    }

    gameOver() {
        this.gameRunning = false;
        const gameOverEl = document.querySelector('#tetris .game-over');
        const finalScore = document.querySelector('#tetris .tetris-finalScore');
        if (gameOverEl) gameOverEl.classList.remove('hidden');
        if (finalScore && this.player) finalScore.textContent = this.player.score;
    }

    initStats() {
        this.updateStats();
    }

    updateStats() {
        const scoreEl = document.querySelector('#tetris .tetris-score');
        const linesEl = document.querySelector('#tetris .tetris-lines');
        const levelEl = document.querySelector('#tetris .tetris-level');
        const genEl = document.querySelector('#tetris .tetris-generation');
        const aliveEl = document.querySelector('#tetris .tetris-alive');
        const bestScoreEl = document.querySelector('#tetris .tetris-bestScore');

        if (this.gameMode === 'manual' && this.player) {
            if (scoreEl) scoreEl.textContent = this.player.score;
            if (linesEl) linesEl.textContent = this.player.lines;
            if (levelEl) levelEl.textContent = this.player.level;
            if (genEl) genEl.textContent = '-';
            if (aliveEl) aliveEl.textContent = this.player.alive ? 1 : 0;
            if (bestScoreEl) bestScoreEl.textContent = this.player.score;
        } else if (this.gameMode === 'ai' && this.population) {
            const best = this.population.getBestPlayer();
            const aliveCount = this.population.players.filter(p => p.alive && !p.gameOver).length;
            if (scoreEl) scoreEl.textContent = best.score;
            if (linesEl) linesEl.textContent = best.lines;
            if (levelEl) levelEl.textContent = best.level;
            if (genEl) genEl.textContent = this.population.generation;
            if (aliveEl) aliveEl.textContent = aliveCount;
            if (bestScoreEl) bestScoreEl.textContent = Math.max(...this.population.players.map(p => p.score));
        } else {
            if (scoreEl) scoreEl.textContent = '0';
            if (linesEl) linesEl.textContent = '0';
            if (levelEl) levelEl.textContent = '1';
            if (genEl) genEl.textContent = '-';
            if (aliveEl) aliveEl.textContent = '0';
            if (bestScoreEl) bestScoreEl.textContent = '0';
        }
    }

    saveBestNetwork() {
        if (!this.population || !this.population.allTimeBest) {
            alert('Aucun réseau à sauvegarder. Lancez d\'abord le mode IA!');
            return;
        }
        const data = this.population.allTimeBest.serialize();
        localStorage.setItem('tetrisBestNetwork', JSON.stringify(data));
        alert('Réseau sauvegardé avec succès!');
    }

    loadBestNetwork() {
        const saved = localStorage.getItem('tetrisBestNetwork');
        if (!saved) {
            alert('Aucun réseau sauvegardé trouvé!');
            return;
        }
        try {
            const data = JSON.parse(saved);
            const network = NeuralNetwork.deserialize(data);
            if (this.gameMode === 'ai') {
                this.population = new TetrisPopulation(TETRIS_CONFIG.POPULATION_SIZE);
                for (let i = 0; i < this.population.players.length; i++) {
                    this.population.players[i].brain = network.copy();
                    if (i > 0) {
                        this.population.players[i].brain.mutate();
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
        if (window.tabManager?.currentTab !== 'tetris') {
            if (this.gameMode === 'ai') {
                requestAnimationFrame(() => this.gameLoop());
            }
            return;
        }
        this.update();
        this.draw();
        this.updateStats();
        if (this.gameRunning || this.gameMode === 'ai') {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.tetrisGame = new TetrisGame();
    if (window.tetrisGame) {
        window.tetrisGame.draw();
    }
});

