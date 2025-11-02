// ============================================
// GESTION DES ONGLETS STYLE NETFLIX
// ============================================

class TabManager {
    constructor() {
        this.tabs = document.querySelectorAll('.tab-btn');
        this.pages = document.querySelectorAll('.game-page');
        this.currentTab = 'flappy';
        
        this.init();
    }

    init() {
        // Ajouter les event listeners aux onglets
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Afficher la première page par défaut
        this.switchTab('flappy');
    }

    switchTab(tabName) {
        // Désactiver tous les onglets
        this.tabs.forEach(tab => {
            tab.classList.remove('active');
        });

        // Masquer toutes les pages
        this.pages.forEach(page => {
            page.classList.remove('active');
        });

        // Activer l'onglet sélectionné
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Afficher la page correspondante
        const activePage = document.getElementById(tabName);
        if (activePage) {
            activePage.classList.add('active');
        }

        this.currentTab = tabName;

        // Notifier les jeux du changement (pour pause/resume)
        if (window.flappyGame) {
            // Le jeu Flappy gère automatiquement
        }
        if (window.f1Game && tabName !== 'f1') {
            // Pause F1 si on change de tab
            window.f1Game.pause();
        }
    }
}

// Initialiser le gestionnaire d'onglets au chargement
document.addEventListener('DOMContentLoaded', () => {
    window.tabManager = new TabManager();
});

