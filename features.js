// ============================================
// FEATURES AVANCÉES - 10 NOUVELLES FONCTIONNALITÉS
// ============================================

// 1. Graphique de progression de l'évolution
class EvolutionChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.maxPoints = 50;
    }

    addData(generation, bestFitness, avgFitness) {
        this.data.push({ generation, bestFitness, avgFitness });
        if (this.data.length > this.maxPoints) {
            this.data.shift();
        }
        this.draw();
    }

    draw() {
        if (!this.canvas || this.data.length === 0) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 40;
        
        this.ctx.clearRect(0, 0, width, height);
        
        // Fond
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, width, height);
        
        // Trouver les max pour normalisation
        const maxFitness = Math.max(...this.data.map(d => Math.max(d.bestFitness, d.avgFitness)));
        const minGen = Math.min(...this.data.map(d => d.generation));
        const maxGen = Math.max(...this.data.map(d => d.generation));
        
        if (maxFitness === 0) return;
        
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;
        
        // Grille
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (graphHeight / 5) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(width - padding, y);
            this.ctx.stroke();
        }
        
        // Ligne moyenne
        if (this.data.length > 1) {
            this.ctx.strokeStyle = '#4299e1';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.data.forEach((d, i) => {
                const x = padding + (graphWidth / (this.data.length - 1)) * i;
                const y = height - padding - (d.avgFitness / maxFitness) * graphHeight;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            });
            this.ctx.stroke();
        }
        
        // Ligne meilleur
        if (this.data.length > 1) {
            this.ctx.strokeStyle = '#10b981';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.data.forEach((d, i) => {
                const x = padding + (graphWidth / (this.data.length - 1)) * i;
                const y = height - padding - (d.bestFitness / maxFitness) * graphHeight;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            });
            this.ctx.stroke();
        }
        
        // Labels
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Génération ${minGen} - ${maxGen}`, padding, 15);
        this.ctx.fillText(`Max: ${Math.floor(maxFitness)}`, width - 150, 15);
        
        // Légende
        this.ctx.fillStyle = '#10b981';
        this.ctx.fillRect(width - 120, height - 40, 15, 3);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Meilleur', width - 100, height - 35);
        
        this.ctx.fillStyle = '#4299e1';
        this.ctx.fillRect(width - 120, height - 25, 15, 3);
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('Moyenne', width - 100, height - 20);
    }

    clear() {
        this.data = [];
        if (this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// 2. Système d'export/import avancé
class NetworkExporter {
    static exportNetwork(network, gameName, metadata = {}) {
        const data = {
            game: gameName,
            network: network.serialize(),
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
                version: '1.0'
            }
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${gameName}_network_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    static importNetwork(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const network = NeuralNetwork.deserialize(data.network);
                    resolve({ network, metadata: data.metadata });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsText(file);
        });
    }
}

// 3. Historique des scores
class ScoreHistory {
    constructor() {
        this.scores = JSON.parse(localStorage.getItem('scoreHistory') || '[]');
        this.maxEntries = 100;
    }

    addScore(game, score, generation = null) {
        this.scores.push({
            game,
            score,
            generation,
            timestamp: Date.now()
        });
        this.scores.sort((a, b) => b.score - a.score);
        if (this.scores.length > this.maxEntries) {
            this.scores = this.scores.slice(0, this.maxEntries);
        }
        this.save();
    }

    getBestScore(game) {
        const gameScores = this.scores.filter(s => s.game === game);
        return gameScores.length > 0 ? gameScores[0].score : 0;
    }

    getTopScores(game, limit = 10) {
        return this.scores.filter(s => s.game === game).slice(0, limit);
    }

    save() {
        localStorage.setItem('scoreHistory', JSON.stringify(this.scores));
    }
}

// 4. Système de paramètres configurables
class GameSettings {
    constructor() {
        this.settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
    }

    get(game, key, defaultValue) {
        return this.settings[game]?.[key] ?? defaultValue;
    }

    set(game, key, value) {
        if (!this.settings[game]) this.settings[game] = {};
        this.settings[game][key] = value;
        this.save();
    }

    save() {
        localStorage.setItem('gameSettings', JSON.stringify(this.settings));
    }

    reset(game) {
        if (this.settings[game]) {
            delete this.settings[game];
            this.save();
        }
    }
}

// 5. Mode Replay
class ReplaySystem {
    constructor() {
        this.recordings = [];
        this.isRecording = false;
        this.currentRecording = null;
    }

    startRecording(gameName) {
        this.isRecording = true;
        this.currentRecording = {
            game: gameName,
            frames: [],
            startTime: Date.now()
        };
    }

    recordFrame(state) {
        if (this.isRecording && this.currentRecording) {
            this.currentRecording.frames.push({
                time: Date.now() - this.currentRecording.startTime,
                state: JSON.parse(JSON.stringify(state))
            });
        }
    }

    stopRecording() {
        if (this.currentRecording) {
            this.recordings.push(this.currentRecording);
            this.isRecording = false;
            const saved = JSON.parse(localStorage.getItem('replays') || '[]');
            saved.push(this.currentRecording);
            if (saved.length > 10) saved.shift();
            localStorage.setItem('replays', JSON.stringify(saved));
        }
        this.currentRecording = null;
    }

    getReplays(gameName) {
        return this.recordings.filter(r => r.game === gameName);
    }
}

// 6. Système de particules
class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    addParticle(x, y, color, velocity = { x: 0, y: 0 }, life = 30) {
        this.particles.push({
            x, y, color, velocity, life, maxLife: life
        });
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.velocity.x;
            p.y += p.velocity.y;
            p.velocity.y += 0.2; // gravité
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color.replace('1)', `${alpha})`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3 * alpha, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    clear() {
        this.particles = [];
    }
}

// 7. Système de notifications
class NotificationSystem {
    static show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4299e1'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// 8. Système de cheat codes / debug
class DebugMode {
    static enabled = false;
    
    static toggle() {
        this.enabled = !this.enabled;
        document.body.classList.toggle('debug-mode', this.enabled);
        if (this.enabled) {
            console.log('🐛 Debug mode activé');
        }
    }
    
    static log(message, data = null) {
        if (this.enabled) {
            console.log(`[DEBUG] ${message}`, data || '');
        }
    }
}

// 9. Système de statistiques avancées
class AdvancedStats {
    constructor() {
        this.stats = {};
    }

    record(game, metric, value) {
        if (!this.stats[game]) this.stats[game] = {};
        if (!this.stats[game][metric]) this.stats[game][metric] = [];
        this.stats[game][metric].push({
            value,
            timestamp: Date.now()
        });
        if (this.stats[game][metric].length > 1000) {
            this.stats[game][metric].shift();
        }
    }

    getAverage(game, metric, lastN = 10) {
        if (!this.stats[game]?.[metric]) return 0;
        const values = this.stats[game][metric].slice(-lastN).map(s => s.value);
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    getMax(game, metric) {
        if (!this.stats[game]?.[metric]) return 0;
        return Math.max(...this.stats[game][metric].map(s => s.value));
    }
}

// 10. Système de thèmes
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.themes = {
            dark: {
                bg: '#0f172a',
                secondary: '#1e293b',
                text: '#e2e8f0',
                primary: '#6366f1'
            },
            light: {
                bg: '#f8fafc',
                secondary: '#e2e8f0',
                text: '#1e293b',
                primary: '#6366f1'
            },
            neon: {
                bg: '#0a0a0a',
                secondary: '#1a1a2e',
                text: '#00ffff',
                primary: '#ff00ff'
            }
        };
    }

    setTheme(name) {
        if (this.themes[name]) {
            this.currentTheme = name;
            localStorage.setItem('theme', name);
            this.apply();
        }
    }

    apply() {
        const theme = this.themes[this.currentTheme];
        document.documentElement.style.setProperty('--theme-bg', theme.bg);
        document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
        document.documentElement.style.setProperty('--theme-text', theme.text);
        document.documentElement.style.setProperty('--theme-primary', theme.primary);
    }
}

// Initialisation globale
window.features = {
    EvolutionChart,
    NetworkExporter,
    ScoreHistory: new ScoreHistory(),
    GameSettings: new GameSettings(),
    ReplaySystem: new ReplaySystem(),
    ParticleSystem,
    NotificationSystem,
    DebugMode,
    AdvancedStats: new AdvancedStats(),
    ThemeManager: new ThemeManager()
};

// Initialiser le thème au chargement
document.addEventListener('DOMContentLoaded', () => {
    if (window.features.ThemeManager) {
        window.features.ThemeManager.apply();
    }
});

