// ============================================
// CONFIGURATION F1 RACING
// ============================================
const F1_CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    CAR_WIDTH: 30,
    CAR_HEIGHT: 50,
    MAX_SPEED: 8,
    ACCELERATION: 0.2,
    BRAKE_FORCE: 0.4,
    FRICTION: 0.05,
    TURN_SPEED: 0.05,
    SENSOR_DISTANCE: 200,
    POPULATION_SIZE: 50,
    MUTATION_RATE: 0.1,
    MUTATION_STRENGTH: 0.3,
    ELITE_SIZE: 10,
    WALL_THICKNESS: 20,
    CHECKPOINT_SIZE: 30
};

// ============================================
// CLASSE CIRCUIT EDITOR
// ============================================
class CircuitEditor {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.walls = []; // Array de {x1, y1, x2, y2}
        this.isDrawing = false;
        this.startPos = null;
        this.currentLine = null;
        this.startLine = null; // Ligne de départ {x, y, angle}
        this.checkpoints = [];
    }

    startDrawing(x, y) {
        this.isDrawing = true;
        this.startPos = { x, y };
    }

    updateDrawing(x, y) {
        if (!this.isDrawing) return;
        this.currentLine = {
            x1: this.startPos.x,
            y1: this.startPos.y,
            x2: x,
            y2: y
        };
    }

    endDrawing(x, y) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        if (this.startPos) {
            this.walls.push({
                x1: this.startPos.x,
                y1: this.startPos.y,
                x2: x,
                y2: y
            });
        }
        this.currentLine = null;
        this.startPos = null;
    }

    erase(x, y, radius = 30) {
        this.walls = this.walls.filter(wall => {
            const dist1 = this.distanceToLineSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2);
            return dist1 > radius;
        });
    }

    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) {
            return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        }
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }

    setStartLine(x, y, angle = 0) {
        this.startLine = { x, y, angle };
        this.generateCheckpoints();
    }

    generateCheckpoints() {
        if (!this.startLine) return;
        // Générer des checkpoints le long du circuit (simplifié)
        // Dans une vraie implémentation, on analyserait le circuit
        this.checkpoints = [];
        const numCheckpoints = 20;
        for (let i = 0; i < numCheckpoints; i++) {
            const angle = (i / numCheckpoints) * Math.PI * 2;
            this.checkpoints.push({
                x: this.startLine.x + Math.cos(angle) * 200,
                y: this.startLine.y + Math.sin(angle) * 200,
                passed: false
            });
        }
    }

    checkCollision(x, y, width, height) {
        const corners = [
            { x: x - width/2, y: y - height/2 },
            { x: x + width/2, y: y - height/2 },
            { x: x + width/2, y: y + height/2 },
            { x: x - width/2, y: y + height/2 }
        ];

        for (let wall of this.walls) {
            for (let corner of corners) {
                const dist = this.distanceToLineSegment(corner.x, corner.y, wall.x1, wall.y1, wall.x2, wall.y2);
                if (dist < F1_CONFIG.WALL_THICKNESS / 2) {
                    return true;
                }
            }
        }
        return false;
    }

    getSensorReadings(carX, carY, carAngle) {
        const sensors = [];
        const sensorAngles = [-Math.PI/2, -Math.PI/4, 0, Math.PI/4, Math.PI/2];
        
        for (let angle of sensorAngles) {
            const sensorAngle = carAngle + angle;
            let closestDist = F1_CONFIG.SENSOR_DISTANCE;
            
            for (let wall of this.walls) {
                const dist = this.raycast(carX, carY, sensorAngle, wall);
                if (dist < closestDist) {
                    closestDist = dist;
                }
            }
            
            sensors.push(closestDist / F1_CONFIG.SENSOR_DISTANCE); // Normaliser
        }
        
        return sensors;
    }

    raycast(originX, originY, angle, wall) {
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const wallDx = wall.x2 - wall.x1;
        const wallDy = wall.y2 - wall.y1;
        
        const denom = wallDx * dirY - wallDy * dirX;
        if (Math.abs(denom) < 0.0001) return F1_CONFIG.SENSOR_DISTANCE;
        
        const t = ((wall.x1 - originX) * dirY - (wall.y1 - originY) * dirX) / denom;
        const u = ((wall.x1 - originX) * wallDy - (wall.y1 - originY) * wallDx) / denom;
        
        if (t >= 0 && t <= 1 && u >= 0) {
            const hitX = wall.x1 + t * wallDx;
            const hitY = wall.y1 + t * wallDy;
            return Math.sqrt((hitX - originX) ** 2 + (hitY - originY) ** 2);
        }
        
        return F1_CONFIG.SENSOR_DISTANCE;
    }

    draw(ctx) {
        // Dessiner les murs
        ctx.strokeStyle = '#333';
        ctx.fillStyle = '#666';
        ctx.lineWidth = F1_CONFIG.WALL_THICKNESS;
        ctx.lineCap = 'round';
        
        for (let wall of this.walls) {
            ctx.beginPath();
            ctx.moveTo(wall.x1, wall.y1);
            ctx.lineTo(wall.x2, wall.y2);
            ctx.stroke();
        }

        // Dessiner la ligne de départ
        if (this.startLine) {
            ctx.save();
            ctx.translate(this.startLine.x, this.startLine.y);
            ctx.rotate(this.startLine.angle);
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.fillRect(-50, -5, 100, 10);
            ctx.strokeRect(-50, -5, 100, 10);
            // Flèche
            ctx.beginPath();
            ctx.moveTo(40, 0);
            ctx.lineTo(30, -5);
            ctx.lineTo(30, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Dessiner les checkpoints
        for (let checkpoint of this.checkpoints) {
            ctx.fillStyle = checkpoint.passed ? '#0f0' : '#ff0';
            ctx.beginPath();
            ctx.arc(checkpoint.x, checkpoint.y, F1_CONFIG.CHECKPOINT_SIZE, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Dessiner la ligne en cours
        if (this.currentLine) {
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = F1_CONFIG.WALL_THICKNESS;
            ctx.beginPath();
            ctx.moveTo(this.currentLine.x1, this.currentLine.y1);
            ctx.lineTo(this.currentLine.x2, this.currentLine.y2);
            ctx.stroke();
        }
    }

    clear() {
        this.walls = [];
        this.startLine = null;
        this.checkpoints = [];
        this.currentLine = null;
    }
}

// ============================================
// CLASSE F1 CAR
// ============================================
class F1Car {
    constructor(x, y, angle, brain = null) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.width = F1_CONFIG.CAR_WIDTH;
        this.height = F1_CONFIG.CAR_HEIGHT;
        this.alive = true;
        this.fitness = 0;
        this.lapTime = 0;
        this.currentCheckpoint = 0;
        this.laps = 0;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.brain = brain ? brain.copy() : new NeuralNetwork(8, 12, 3, F1_CONFIG.MUTATION_RATE, F1_CONFIG.MUTATION_STRENGTH);
        this.timeAlive = 0;
        this.lastCheckpointTime = 0;
    }

    update(circuit) {
        if (!this.alive) return;

        this.timeAlive++;
        this.lapTime++;

        // Détection des capteurs
        const sensors = circuit.getSensorReadings(this.x, this.y, this.angle);
        
        // Inputs du réseau: 5 capteurs + vitesse normalisée + angle normalisé + distance au prochain checkpoint
        const checkpoint = circuit.checkpoints[this.currentCheckpoint % circuit.checkpoints.length];
        const distToCheckpoint = checkpoint ? 
            Math.sqrt((checkpoint.x - this.x) ** 2 + (checkpoint.y - this.y) ** 2) / 500 : 1;
        
        const inputs = [
            ...sensors,
            this.speed / F1_CONFIG.MAX_SPEED,
            this.angle / (Math.PI * 2),
            distToCheckpoint
        ];

        // Décision du réseau
        const output = this.brain.predict(inputs);
        const acceleration = output[0];
        const steering = (output[1] - 0.5) * 2; // -1 à 1
        const brake = output[2];

        // Physique
        // Accélération
        if (acceleration > 0.5 && brake < 0.5) {
            this.speed = Math.min(this.speed + F1_CONFIG.ACCELERATION * acceleration, F1_CONFIG.MAX_SPEED);
        }
        
        // Freinage
        if (brake > 0.5) {
            this.speed = Math.max(this.speed - F1_CONFIG.BRAKE_FORCE * brake, 0);
        }

        // Friction
        this.speed *= (1 - F1_CONFIG.FRICTION);

        // Direction
        if (this.speed > 0.1) {
            this.angle += steering * F1_CONFIG.TURN_SPEED * (this.speed / F1_CONFIG.MAX_SPEED);
        }

        // Vitesse en X et Y
        this.velocityX = Math.cos(this.angle) * this.speed;
        this.velocityY = Math.sin(this.angle) * this.speed;

        // Nouvelle position
        const newX = this.x + this.velocityX;
        const newY = this.y + this.velocityY;

        // Vérifier collision
        if (circuit.checkCollision(newX, newY, this.width, this.height)) {
            this.alive = false;
            return;
        }

        this.x = newX;
        this.y = newY;

        // Vérifier checkpoints
        if (checkpoint) {
            const dist = Math.sqrt((checkpoint.x - this.x) ** 2 + (checkpoint.y - this.y) ** 2);
            if (dist < F1_CONFIG.CHECKPOINT_SIZE && !checkpoint.passed) {
                checkpoint.passed = true;
                this.currentCheckpoint++;
                if (this.currentCheckpoint >= circuit.checkpoints.length) {
                    this.currentCheckpoint = 0;
                    this.laps++;
                    this.fitness += 1000; // Bonus pour un tour complet
                    // Réinitialiser les checkpoints pour le prochain tour
                    circuit.checkpoints.forEach(cp => cp.passed = false);
                }
                this.fitness += 100;
                this.lastCheckpointTime = this.timeAlive;
            }
        }

        // Fitness basée sur distance parcourue et temps
        this.fitness += this.speed * 0.1;
        
        // Pénalité si bloqué
        if (this.timeAlive - this.lastCheckpointTime > 1000) {
            this.alive = false;
        }
    }

    draw(ctx, isBest = false) {
        if (!this.alive) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Corps de la voiture
        ctx.fillStyle = isBest ? '#FFD700' : this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        // Forme de voiture
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Pare-brise
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(-this.width/2 + 5, -this.height/2 + 5, this.width - 10, 15);

        ctx.restore();

        // Dessiner les capteurs si meilleur
        if (isBest) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 1;
            const sensorAngles = [-Math.PI/2, -Math.PI/4, 0, Math.PI/4, Math.PI/2];
            for (let angle of sensorAngles) {
                const sensorAngle = this.angle + angle;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(
                    this.x + Math.cos(sensorAngle) * F1_CONFIG.SENSOR_DISTANCE,
                    this.y + Math.sin(sensorAngle) * F1_CONFIG.SENSOR_DISTANCE
                );
                ctx.stroke();
            }
        }
    }
}

// ============================================
// CLASSE F1 POPULATION
// ============================================
class F1Population {
    constructor(size, startX, startY, startAngle) {
        this.size = size;
        this.cars = [];
        this.generation = 1;
        this.bestFitness = 0;
        this.bestCar = null;
        this.allTimeBest = null;
        this.startX = startX;
        this.startY = startY;
        this.startAngle = startAngle;
        
        for (let i = 0; i < size; i++) {
            this.cars.push(new F1Car(startX, startY, startAngle));
        }
    }

    update(circuit) {
        let aliveCount = 0;
        for (let car of this.cars) {
            if (car.alive) {
                car.update(circuit);
                if (car.fitness > this.bestFitness) {
                    this.bestFitness = car.fitness;
                    this.bestCar = car;
                }
                aliveCount++;
            }
        }
        return aliveCount;
    }

    allDead() {
        return this.cars.every(car => !car.alive);
    }

    evolve() {
        this.cars.sort((a, b) => b.fitness - a.fitness);
        if (!this.allTimeBest || this.cars[0].fitness > this.allTimeBest.fitness) {
            this.allTimeBest = this.cars[0].brain.copy();
        }
        
        const newCars = [];
        newCars.push(new F1Car(this.startX, this.startY, this.startAngle, this.cars[0].brain.copy()));
        
        while (newCars.length < this.size) {
            const parent1 = this.selectParent();
            const parent2 = this.selectParent();
            const childBrain = NeuralNetwork.crossover(parent1.brain, parent2.brain);
            childBrain.mutate();
            newCars.push(new F1Car(this.startX, this.startY, this.startAngle, childBrain));
        }
        
        this.cars = newCars;
        this.generation++;
        this.bestFitness = 0;
        
        // Réinitialiser le circuit
        if (window.f1Game && window.f1Game.circuit) {
            window.f1Game.circuit.checkpoints.forEach(cp => cp.passed = false);
        }
    }

    selectParent() {
        const totalFitness = this.cars.reduce((sum, c) => sum + Math.max(c.fitness, 0), 0);
        if (totalFitness === 0) {
            return this.cars[Math.floor(Math.random() * F1_CONFIG.ELITE_SIZE)];
        }
        let random = Math.random() * totalFitness;
        let sum = 0;
        for (let car of this.cars) {
            sum += Math.max(car.fitness, 0);
            if (sum >= random) {
                return car;
            }
        }
        return this.cars[0];
    }

    draw(ctx) {
        let best = null;
        let bestFitness = -1;
        for (let car of this.cars) {
            if (car.alive && car.fitness > bestFitness) {
                bestFitness = car.fitness;
                best = car;
            }
        }
        for (let car of this.cars) {
            car.draw(ctx, car === best);
        }
    }

    getBestTime() {
        const aliveCars = this.cars.filter(c => c.alive);
        if (aliveCars.length === 0) return null;
        const best = aliveCars.reduce((best, car) => car.laps > best.laps || 
            (car.laps === best.laps && car.currentCheckpoint > best.currentCheckpoint) ? car : best);
        return best.lapTime;
    }
}

// ============================================
// CLASSE F1 GAME
// ============================================
class F1Game {
    constructor() {
        this.canvas = document.getElementById('f1Canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        this.circuit = new CircuitEditor(this.canvas);
        this.population = null;
        this.mode = 'build'; // 'build', 'train', 'race'
        this.gameRunning = false;
        this.speed = 1;
        this.frameCount = 0;
        this.placingStart = false;
        this.setupEventListeners();
        this.initStats();
    }

    resizeCanvas() {
        const maxWidth = Math.min(1200, window.innerWidth - 40);
        const maxHeight = Math.min(800, window.innerHeight - 200);
        this.canvas.width = maxWidth;
        this.canvas.height = maxHeight;
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
    }

    setupEventListeners() {
        const f1Page = document.getElementById('f1');
        if (!f1Page) return;

        f1Page.querySelector('.f1-buildBtn').addEventListener('click', () => this.startBuild());
        f1Page.querySelector('.f1-trainBtn').addEventListener('click', () => this.startTrain());
        f1Page.querySelector('.f1-raceBtn').addEventListener('click', () => this.startRace());
        f1Page.querySelector('.f1-clearBtn').addEventListener('click', () => this.clearCircuit());
        f1Page.querySelector('.f1-resetBtn').addEventListener('click', () => this.reset());
        f1Page.querySelector('.f1-saveBtn').addEventListener('click', () => this.saveBestNetwork());
        f1Page.querySelector('.f1-loadBtn').addEventListener('click', () => this.loadBestNetwork());
        f1Page.querySelector('.f1-speedBtn').addEventListener('click', () => this.toggleSpeed());

        // Éditeur
        f1Page.querySelector('.f1-placeStartBtn').addEventListener('click', () => {
            this.placingStart = true;
            this.canvas.style.cursor = 'crosshair';
        });
        f1Page.querySelector('.f1-finishBuildBtn').addEventListener('click', () => this.finishBuild());
        f1Page.querySelector('.f1-cancelBuildBtn').addEventListener('click', () => this.cancelBuild());

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    handleMouseDown(e) {
        if (this.mode !== 'build') return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (e.shiftKey) {
            this.circuit.erase(x, y);
        } else {
            this.circuit.startDrawing(x, y);
        }
    }

    handleMouseMove(e) {
        if (this.mode !== 'build') return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.circuit.isDrawing) {
            this.circuit.updateDrawing(x, y);
            this.draw();
        }
    }

    handleMouseUp(e) {
        if (this.mode !== 'build') return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (!e.shiftKey) {
            this.circuit.endDrawing(x, y);
            this.draw();
        }
    }

    handleClick(e) {
        if (this.placingStart) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calculer l'angle basé sur la position (orientation vers le haut par défaut)
            // Trouver la direction la plus proche d'une route (si proche d'un mur)
            let angle = -Math.PI / 2; // Vers le haut par défaut
            
            // Si on est près d'un mur, s'orienter perpendiculairement
            let closestWall = null;
            let minDist = Infinity;
            for (let wall of this.circuit.walls) {
                const dist = this.circuit.distanceToLineSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2);
                if (dist < 50 && dist < minDist) {
                    minDist = dist;
                    closestWall = wall;
                }
            }
            
            if (closestWall) {
                // Calculer l'angle perpendiculaire au mur
                const dx = closestWall.x2 - closestWall.x1;
                const dy = closestWall.y2 - closestWall.y1;
                const wallAngle = Math.atan2(dy, dx);
                angle = wallAngle + Math.PI / 2; // Perpendiculaire
            }
            
            this.circuit.setStartLine(x, y, angle);
            this.placingStart = false;
            this.canvas.style.cursor = 'crosshair';
            this.draw();
        }
    }

    startBuild() {
        this.mode = 'build';
        this.gameRunning = false;
        const overlay = document.getElementById('f1EditorOverlay');
        if (overlay) overlay.classList.remove('hidden');
        this.draw();
    }

    finishBuild() {
        if (!this.circuit.startLine || this.circuit.walls.length < 3) {
            alert('Dessinez au moins quelques murs et placez la ligne de départ!');
            return;
        }
        const overlay = document.getElementById('f1EditorOverlay');
        if (overlay) overlay.classList.add('hidden');
        this.mode = 'idle';
        this.draw();
    }

    cancelBuild() {
        this.mode = 'idle';
        this.placingStart = false;
        this.canvas.style.cursor = 'default';
        const overlay = document.getElementById('f1EditorOverlay');
        if (overlay) overlay.classList.add('hidden');
        this.draw();
    }

    clearCircuit() {
        if (confirm('Effacer le circuit actuel?')) {
            this.circuit.clear();
            this.population = null;
            this.mode = 'idle';
            this.draw();
        }
    }

    startTrain() {
        if (!this.circuit.startLine) {
            alert('Créez d\'abord un circuit avec la ligne de départ!');
            return;
        }
        this.mode = 'train';
        this.gameRunning = true;
        this.population = new F1Population(
            F1_CONFIG.POPULATION_SIZE,
            this.circuit.startLine.x,
            this.circuit.startLine.y,
            this.circuit.startLine.angle
        );
        this.gameLoop();
    }

    startRace() {
        if (!this.population || !this.population.allTimeBest) {
            alert('Entraînez d\'abord les IA!');
            return;
        }
        this.mode = 'race';
        this.gameRunning = true;
        // Créer une petite course avec les meilleures IA
        const bestBrains = this.population.cars
            .sort((a, b) => b.fitness - a.fitness)
            .slice(0, 5)
            .map(c => c.brain.copy());
        
        this.population = new F1Population(
            5,
            this.circuit.startLine.x,
            this.circuit.startLine.y,
            this.circuit.startLine.angle
        );
        bestBrains.forEach((brain, i) => {
            this.population.cars[i].brain = brain;
        });
        this.gameLoop();
    }

    reset() {
        this.gameRunning = false;
        this.population = null;
        this.mode = 'idle';
        if (this.circuit) {
            this.circuit.checkpoints.forEach(cp => cp.passed = false);
        }
        this.draw();
    }

    toggleSpeed() {
        const speeds = [1, 2, 5, 10];
        const currentIndex = speeds.indexOf(this.speed);
        this.speed = speeds[(currentIndex + 1) % speeds.length];
        const btn = document.querySelector('#f1 .f1-speedBtn');
        if (btn) btn.textContent = `⏩ Vitesse: ${this.speed}x`;
    }

    pause() {
        this.gameRunning = false;
    }

    update() {
        if (!this.gameRunning || window.tabManager?.currentTab !== 'f1') return;

        for (let i = 0; i < this.speed; i++) {
            if (this.mode === 'train' || this.mode === 'race') {
                if (this.population) {
                    const aliveCount = this.population.update(this.circuit);
                    
                    if (this.population.allDead()) {
                        if (this.mode === 'train') {
                            this.population.evolve();
                        } else {
                            this.gameRunning = false;
                            this.showRaceResults();
                        }
                    }
                    
                    this.updateStats();
                }
            }
        }
    }

    draw() {
        if (window.tabManager?.currentTab !== 'f1') return;

        // Fond (piste)
        this.ctx.fillStyle = '#2d5016';
        this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);

        // Dessiner le circuit
        this.circuit.draw(this.ctx);

        // Dessiner les voitures
        if (this.population) {
            this.population.draw(this.ctx);
        }
    }

    showRaceResults() {
        const leaderboard = document.getElementById('f1Leaderboard');
        const content = document.getElementById('f1LeaderboardContent');
        if (!leaderboard || !content) return;

        const sortedCars = [...this.population.cars]
            .sort((a, b) => {
                if (b.laps !== a.laps) return b.laps - a.laps;
                if (b.currentCheckpoint !== a.currentCheckpoint) return b.currentCheckpoint - a.currentCheckpoint;
                return b.fitness - a.fitness;
            });

        content.innerHTML = '';
        sortedCars.forEach((car, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            const time = (car.lapTime / 60).toFixed(2);
            item.innerHTML = `
                <span class="position">${index + 1}</span>
                <span class="name">Voiture ${index + 1}</span>
                <span class="time">${time}s | ${car.laps} tours</span>
            `;
            content.appendChild(item);
        });

        leaderboard.classList.remove('hidden');
    }

    initStats() {
        this.updateStats();
    }

    updateStats() {
        const modeEl = document.querySelector('#f1 .f1-mode');
        const genEl = document.querySelector('#f1 .f1-generation');
        const aliveEl = document.querySelector('#f1 .f1-alive');
        const bestTimeEl = document.querySelector('#f1 .f1-bestTime');
        const lapsEl = document.querySelector('#f1 .f1-laps');
        const bestFitnessEl = document.querySelector('#f1 .f1-bestFitness');

        if (modeEl) {
            const modes = { build: 'Construction', train: 'Entraînement', race: 'Course', idle: 'Inactif' };
            modeEl.textContent = modes[this.mode] || 'Inactif';
        }

        if (this.population) {
            const aliveCount = this.population.cars.filter(c => c.alive).length;
            if (genEl) genEl.textContent = this.population.generation;
            if (aliveEl) aliveEl.textContent = aliveCount;
            if (bestFitnessEl) bestFitnessEl.textContent = Math.floor(this.population.bestFitness);
            
            const bestCar = this.population.cars
                .filter(c => c.alive)
                .sort((a, b) => {
                    if (b.laps !== a.laps) return b.laps - a.laps;
                    return b.currentCheckpoint - a.currentCheckpoint;
                })[0];
            
            if (bestCar) {
                if (lapsEl) lapsEl.textContent = bestCar.laps;
                if (bestTimeEl) {
                    const time = (bestCar.lapTime / 60).toFixed(2);
                    bestTimeEl.textContent = `${time}s`;
                }
            }
        } else {
            if (genEl) genEl.textContent = '-';
            if (aliveEl) aliveEl.textContent = '0';
            if (bestTimeEl) bestTimeEl.textContent = '--:--';
            if (lapsEl) lapsEl.textContent = '0';
            if (bestFitnessEl) bestFitnessEl.textContent = '0';
        }
    }

    saveBestNetwork() {
        if (!this.population || !this.population.allTimeBest) {
            alert('Aucun réseau à sauvegarder. Entraînez d\'abord les IA!');
            return;
        }
        const data = this.population.allTimeBest.serialize();
        localStorage.setItem('f1BestNetwork', JSON.stringify(data));
        alert('Réseau sauvegardé avec succès!');
    }

    loadBestNetwork() {
        const saved = localStorage.getItem('f1BestNetwork');
        if (!saved) {
            alert('Aucun réseau sauvegardé trouvé!');
            return;
        }
        try {
            const data = JSON.parse(saved);
            const network = NeuralNetwork.deserialize(data);
            if (!this.circuit.startLine) {
                alert('Créez d\'abord un circuit!');
                return;
            }
            this.population = new F1Population(
                F1_CONFIG.POPULATION_SIZE,
                this.circuit.startLine.x,
                this.circuit.startLine.y,
                this.circuit.startLine.angle
            );
            for (let i = 0; i < this.population.cars.length; i++) {
                this.population.cars[i].brain = network.copy();
                if (i > 0) {
                    this.population.cars[i].brain.mutate();
                }
            }
            alert('Réseau chargé avec succès!');
        } catch (e) {
            alert('Erreur lors du chargement: ' + e.message);
        }
    }

    gameLoop() {
        if (!this.gameRunning && this.mode !== 'train') return;
        if (window.tabManager?.currentTab !== 'f1') {
            if (this.mode === 'train') {
                requestAnimationFrame(() => this.gameLoop());
            }
            return;
        }
        this.update();
        this.draw();
        if (this.gameRunning || this.mode === 'train') {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    window.f1Game = new F1Game();
    // Dessiner le canvas initial
    if (window.f1Game) {
        window.f1Game.draw();
    }
});

