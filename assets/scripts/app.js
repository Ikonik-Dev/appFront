/* =============================================
   APPLICATION PRINCIPALE - RNCP DWWM 2023
   Point d'entrée et orchestration
   ============================================= */

/**
 * Classe principale de l'application
 */
class App {
  constructor() {
    this.isInitialized = false;
    this.components = {};
    this.version = APP_CONFIG.version;

    // Binding des méthodes
    this.init = this.init.bind(this);
    this.handleGlobalError = this.handleGlobalError.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
  }

  /**
   * Initialisation de l'application
   */
  async init() {
    if (this.isInitialized) {
      DEBUG.warn("Application already initialized");
      return;
    }

    try {
      DEBUG.log("Initializing application...");

      // Vérifier les prérequis
      this.checkPrerequisites();

      // Initialiser les éléments DOM
      this.initDOMElements();

      // Charger les préférences utilisateur
      this.loadUserPreferences();

      // Initialiser les composants
      await this.initComponents();

      // Initialiser le router
      this.initRouter();

      // Configurer les événements globaux
      this.bindGlobalEvents();

      // Initialiser les animations
      this.initAnimations();

      // Marquer comme initialisé
      this.isInitialized = true;

      DEBUG.log("Application initialized successfully");

      // Émettre l'événement d'initialisation
      this.emitEvent("app:initialized");
    } catch (error) {
      DEBUG.error("Failed to initialize application:", error);
      this.showCriticalError(
        "Erreur lors de l'initialisation de l'application"
      );
    }
  }

  /**
   * Vérification des prérequis
   */
  checkPrerequisites() {
    // Vérifier le support des fonctionnalités modernes
    const requiredFeatures = [
      "fetch",
      "Promise",
      "Map",
      "Set",
      "localStorage",
      "sessionStorage",
    ];

    const missingFeatures = requiredFeatures.filter((feature) => {
      return typeof window[feature] === "undefined";
    });

    if (missingFeatures.length > 0) {
      throw new Error(
        `Fonctionnalités manquantes: ${missingFeatures.join(", ")}`
      );
    }

    // Vérifier la version du navigateur
    if (!this.isBrowserSupported()) {
      this.showBrowserWarning();
    }

    DEBUG.log("Prerequisites check passed");
  }

  /**
   * Initialisation des éléments DOM
   */
  initDOMElements() {
    // Créer la structure principale si nécessaire
    if (!DOMUtils.$("#app")) {
      const appContainer = DOMUtils.createElement("div", { id: "app" });
      document.body.appendChild(appContainer);
    }

    // Références aux éléments principaux
    DOM_ELEMENTS.app = DOMUtils.$("#app");
    DOM_ELEMENTS.navigation =
      DOMUtils.$("#navigation") || this.createNavigationContainer();
    DOM_ELEMENTS.mainContent =
      DOMUtils.$("#main-content") || this.createMainContainer();

    DEBUG.log("DOM elements initialized");
  }

  createNavigationContainer() {
    const nav = DOMUtils.createElement("div", { id: "navigation" });
    DOM_ELEMENTS.app.appendChild(nav);
    return nav;
  }

  createMainContainer() {
    const main = DOMUtils.createElement("main", { id: "main-content" });
    DOM_ELEMENTS.app.appendChild(main);
    return main;
  }

  /**
   * Chargement des préférences utilisateur
   */
  loadUserPreferences() {
    // Vérifier que StorageUtils est disponible
    if (typeof StorageUtils === "undefined") {
      DEBUG.warn(
        "StorageUtils not available, skipping user preferences loading"
      );
      return;
    }

    const savedPreferences = StorageUtils.getItem("userPreferences", {});

    // Fusionner avec les préférences par défaut
    APP_STATE.user.preferences = {
      ...APP_STATE.user.preferences,
      ...savedPreferences,
    };

    // Appliquer les préférences
    this.applyUserPreferences();

    DEBUG.log("User preferences loaded:", APP_STATE.user.preferences);
  }

  applyUserPreferences() {
    const { preferences } = APP_STATE.user;

    // Appliquer le thème
    if (preferences.theme) {
      document.body.classList.add(`theme-${preferences.theme}`);
    }

    // Respecter les préférences d'animation
    if (!preferences.animations || preferences.reducedMotion) {
      document.documentElement.style.setProperty("--animation-duration", "0ms");
    }

    // Autres préférences...
  }

  /**
   * Initialisation des composants
   */
  async initComponents() {
    try {
      // Vérifier que les classes sont disponibles
      if (typeof Navigation === "undefined") {
        throw new Error("Navigation class not available");
      }
      if (typeof NotificationManager === "undefined") {
        throw new Error("NotificationManager class not available");
      }

      // Navigation
      this.components.navigation = new Navigation(DOM_ELEMENTS.navigation);
      window.navigationComponent = this.components.navigation;

      // Gestionnaire de notifications
      this.components.notifications = new NotificationManager();
      window.notificationManager = this.components.notifications;

      // Gestionnaire de modales globales
      this.initGlobalModals();

      DEBUG.log("Components initialized");
    } catch (error) {
      DEBUG.error("Error initializing components:", error);
      throw error;
    }
  }

  initGlobalModals() {
    // Vérifier que Modal est disponible
    if (typeof Modal === "undefined") {
      DEBUG.warn("Modal class not available, skipping modal initialization");
      return;
    }

    // Modal de confirmation
    const confirmModal = DOMUtils.createElement("div", {
      id: "confirm-modal",
      className: "modal",
    });
    document.body.appendChild(confirmModal);

    this.components.confirmModal = new Modal(confirmModal);
    window.confirmModal = this.components.confirmModal;
  }

  /**
   * Initialisation du router
   */
  initRouter() {
    // Vérifier que initRouter est disponible
    if (typeof initRouter === "undefined") {
      throw new Error("initRouter function not available");
    }

    this.components.router = initRouter();
    window.router = this.components.router;

    DEBUG.log("Router initialized");
  }

  /**
   * Configuration des événements globaux
   */
  bindGlobalEvents() {
    // Gestion des erreurs globales
    window.addEventListener("error", this.handleGlobalError.bind(this));
    window.addEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection.bind(this)
    );

    // Gestion du redimensionnement
    const resizeHandler = PerformanceUtils.throttle(() => {
      this.onWindowResize();
    }, 250);
    window.addEventListener("resize", resizeHandler);

    // Gestion du scroll
    const scrollHandler = PerformanceUtils.throttle(() => {
      this.onWindowScroll();
    }, 100);
    window.addEventListener("scroll", scrollHandler);

    // Gestion des raccourcis clavier
    document.addEventListener(
      "keydown",
      this.handleKeyboardShortcuts.bind(this)
    );

    // Gestion de la visibilité de la page
    document.addEventListener(
      "visibilitychange",
      this.onVisibilityChange.bind(this)
    );

    // Gestion de la connexion réseau
    window.addEventListener("online", this.onNetworkStatusChange.bind(this));
    window.addEventListener("offline", this.onNetworkStatusChange.bind(this));

    DEBUG.log("Global events bound");
  }

  /**
   * Initialisation des animations
   */
  initAnimations() {
    // Observer pour les animations au scroll
    AnimationUtils.observeScrollAnimations();

    // Animation d'entrée de l'application
    if (APP_STATE.user.preferences.animations) {
      AnimationUtils.animate(DOM_ELEMENTS.app, ANIMATION_CLASSES.fadeIn);
    }

    DEBUG.log("Animations initialized");
  }

  /**
   * Gestionnaires d'événements
   */
  handleGlobalError(event) {
    DEBUG.error("Global error:", event.error);

    if (this.components.notifications) {
      this.components.notifications.error(
        "Une erreur inattendue s'est produite"
      );
    }
  }

  handleUnhandledRejection(event) {
    DEBUG.error("Unhandled promise rejection:", event.reason);

    if (this.components.notifications) {
      this.components.notifications.error(
        "Erreur lors d'une opération asynchrone"
      );
    }
  }

  onWindowResize() {
    // Mettre à jour les variables CSS pour les dimensions
    document.documentElement.style.setProperty(
      "--viewport-width",
      `${window.innerWidth}px`
    );
    document.documentElement.style.setProperty(
      "--viewport-height",
      `${window.innerHeight}px`
    );

    // Émettre un événement de redimensionnement
    this.emitEvent("app:resize", {
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }

  onWindowScroll() {
    const scrollY = window.scrollY;

    // Émettre un événement de scroll
    this.emitEvent("app:scroll", { scrollY });
  }

  handleKeyboardShortcuts(event) {
    // Raccourcis globaux
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case "h":
          event.preventDefault();
          this.components.router.navigateTo("home");
          break;
        case "k":
          event.preventDefault();
          // Ouvrir la recherche/navigation rapide
          this.showQuickNavigation();
          break;
      }
    }

    // Échap pour fermer les modales
    if (event.key === "Escape") {
      this.closeAllModals();
    }
  }

  onVisibilityChange() {
    if (document.hidden) {
      // Page cachée
      this.emitEvent("app:hidden");
    } else {
      // Page visible
      this.emitEvent("app:visible");
    }
  }

  onNetworkStatusChange() {
    const isOnline = navigator.onLine;

    if (isOnline) {
      this.components.notifications?.success("Connexion rétablie");
    } else {
      this.components.notifications?.warning("Connexion perdue");
    }

    this.emitEvent("app:networkChange", { isOnline });
  }

  /**
   * Méthodes utilitaires
   */
  showQuickNavigation() {
    // Implémenter la navigation rapide
    console.log("Quick navigation would open here");
  }

  closeAllModals() {
    // Fermer toutes les modales ouvertes
    const openModals = document.querySelectorAll('.modal[style*="flex"]');
    openModals.forEach((modal) => {
      if (modal.modalInstance && modal.modalInstance.hide) {
        modal.modalInstance.hide();
      }
    });
  }

  isBrowserSupported() {
    // Vérification basique du support navigateur
    return "IntersectionObserver" in window && "CustomEvent" in window;
  }

  showBrowserWarning() {
    const message =
      "Votre navigateur peut ne pas supporter toutes les fonctionnalités de cette application.";

    if (this.components.notifications) {
      this.components.notifications.warning(message, 8000);
    } else {
      alert(message);
    }
  }

  showCriticalError(message) {
    const errorDiv = DOMUtils.createElement("div", {
      className: "critical-error",
      innerHTML: `
        <h1>Erreur Critique</h1>
        <p>${message}</p>
        <button onclick="location.reload()">Recharger la page</button>
      `,
    });

    document.body.innerHTML = "";
    document.body.appendChild(errorDiv);
  }

  emitEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  /**
   * Méthodes publiques de l'API
   */
  getVersion() {
    return this.version;
  }

  isReady() {
    return this.isInitialized;
  }

  restart() {
    location.reload();
  }

  // Nouvelle méthode de nettoyage
  cleanup() {
    DEBUG.log("Cleaning up application...");

    // Annuler toutes les animations actives
    if (
      typeof AnimationUtils !== "undefined" &&
      AnimationUtils.cancelAllAnimations
    ) {
      AnimationUtils.cancelAllAnimations();
    }

    // Nettoyer les composants
    Object.values(this.components).forEach((component) => {
      if (component && typeof component.destroy === "function") {
        component.destroy();
      }
    });

    // Nettoyer le cache du router
    if (
      this.components.router &&
      typeof this.components.router.clearCache === "function"
    ) {
      this.components.router.clearCache();
    }

    // Nettoyer les event listeners globaux
    window.removeEventListener("error", this.handleGlobalError);
    window.removeEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection
    );

    // Marquer comme non initialisé
    this.isInitialized = false;

    DEBUG.log("Application cleanup completed");
  }

  // Méthode pour diagnostiquer les performances
  getPerformanceInfo() {
    const info = {
      version: this.version,
      isInitialized: this.isInitialized,
      components: Object.keys(this.components),
      timestamp: new Date().toISOString(),
    };

    // Ajouter les stats du cache si disponibles
    if (
      this.components.router &&
      typeof this.components.router.getCacheStats === "function"
    ) {
      info.cache = this.components.router.getCacheStats();
    }

    // Ajouter les stats d'animation si disponibles
    if (
      typeof AnimationUtils !== "undefined" &&
      AnimationUtils.getAnimationStats
    ) {
      info.animations = AnimationUtils.getAnimationStats();
    }

    return info;
  }
}

/**
 * Point d'entrée de l'application
 */
class ApplicationBootstrap {
  static async start() {
    // Vérifier d'abord que DEBUG existe, sinon utiliser console
    const logger =
      typeof DEBUG !== "undefined"
        ? DEBUG
        : {
            log: (...args) => console.log("🚀 [APP]", ...args),
            warn: (...args) => console.warn("⚠️ [APP]", ...args),
            error: (...args) => console.error("❌ [APP]", ...args),
          };

    logger.log("Starting application...");

    try {
      // Vérifier que les dépendances essentielles sont chargées
      const requiredGlobals = ["APP_CONFIG", "APP_STATE", "DOM_ELEMENTS"];
      const missingGlobals = requiredGlobals.filter(
        (global) => typeof window[global] === "undefined"
      );

      if (missingGlobals.length > 0) {
        throw new Error(
          `Required dependencies not loaded: ${missingGlobals.join(", ")}`
        );
      }

      // Créer l'instance de l'application
      const app = new App();

      // Attendre que le DOM soit prêt
      if (document.readyState === "loading") {
        await new Promise((resolve) => {
          document.addEventListener("DOMContentLoaded", resolve);
        });
      }

      // Initialiser l'application
      await app.init();

      // Exposer globalement
      window.app = app;

      // Message de démarrage
      console.log(`
🚀 Application RNCP DWWM 2023 démarrée
📦 Version: ${app.getVersion()}
🌐 URL: ${window.location.href}
⚡ Prêt à utiliser!
      `);

      return app;
    } catch (error) {
      DEBUG.error("Failed to start application:", error);

      // Affichage d'erreur de fallback
      document.body.innerHTML = `
        <div style="padding: 2rem; text-align: center; background: #1a1a1a; color: white; font-family: Arial, sans-serif;">
          <h1>❌ Erreur de chargement</h1>
          <p>Impossible de démarrer l'application : ${error.message}</p>
          <button onclick="location.reload()" style="padding: 1rem 2rem; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Recharger la page
          </button>
        </div>
      `;

      throw error;
    }
  }
}

/**
 * Démarrage automatique de l'application
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    ApplicationBootstrap.start().catch((error) => {
      console.error("Application startup failed:", error);
    });
  });
} else {
  ApplicationBootstrap.start().catch((error) => {
    console.error("Application startup failed:", error);
  });
}

// Export pour les tests ou l'utilisation externe
if (typeof module !== "undefined" && module.exports) {
  module.exports = { App, ApplicationBootstrap };
}

/* =============================================
   FONCTION DE TÉLÉCHARGEMENT PDF
   ============================================= */

/**
 * Fonction globale pour télécharger un cours en PDF
 * @param {string} courseId - L'identifiant du cours
 */
function downloadPDF(courseId) {
  try {
    DEBUG.log("Attempting to download PDF for course:", courseId);

    // Obtenir le contenu de la page de cours
    const courseContent = document.querySelector(".course-content");
    if (!courseContent) {
      throw new Error("Contenu du cours non trouvé");
    }

    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error(
        "Impossible d'ouvrir la fenêtre d'impression. Vérifiez que les pop-ups sont autorisés."
      );
    }

    // Obtenir le titre du cours
    const courseTitle =
      courseContent.querySelector("h1")?.textContent || "Cours";

    // Générer le HTML pour l'impression/PDF
    const printHTML = generatePrintHTML(courseContent, courseTitle);

    // Écrire le contenu dans la nouvelle fenêtre
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Attendre que le contenu soit chargé puis déclencher l'impression
    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.print();
        // Fermer la fenêtre après impression (optionnel)
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };

    // Notifier l'utilisateur
    if (
      window.NotificationManager &&
      typeof window.NotificationManager.show === "function"
    ) {
      window.NotificationManager.show(
        `Préparation du PDF "${courseTitle}" en cours...`,
        "info"
      );
    }
  } catch (error) {
    DEBUG.error("Erreur lors du téléchargement PDF:", error);

    // Notifier l'erreur à l'utilisateur
    if (
      window.NotificationManager &&
      typeof window.NotificationManager.show === "function"
    ) {
      window.NotificationManager.show(`Erreur: ${error.message}`, "error");
    } else {
      alert(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  }
}

/**
 * Génère le HTML formaté pour l'impression PDF
 * @param {HTMLElement} content - Le contenu à imprimer
 * @param {string} title - Le titre du document
 * @returns {string} HTML formaté pour l'impression
 */
function generatePrintHTML(content, title) {
  const today = new Date().toLocaleDateString("fr-FR");

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - RNCP DWWM 2023</title>
    <style>
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
        }
        
        .print-header {
            text-align: center;
            border-bottom: 2px solid #00ff88;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .print-header h1 {
            color: #00ff88;
            margin: 0 0 10px 0;
            font-size: 2rem;
        }
        
        .print-meta {
            color: #666;
            font-size: 0.9rem;
        }
        
        .course-section {
            margin-bottom: 30px;
            break-inside: avoid;
        }
        
        .course-section h2 {
            color: #00ff88;
            font-size: 1.5rem;
            margin-bottom: 15px;
            border-left: 4px solid #00ff88;
            padding-left: 15px;
        }
        
        .course-section h3 {
            color: #333;
            font-size: 1.3rem;
            margin: 20px 0 10px 0;
        }
        
        .course-section h4 {
            color: #555;
            font-size: 1.1rem;
            margin: 15px 0 8px 0;
        }
        
        .code-example {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-left: 4px solid #00ff88;
            padding: 15px;
            margin: 15px 0;
            break-inside: avoid;
        }
        
        .code-example pre {
            margin: 0;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        code {
            background: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        
        li {
            margin-bottom: 8px;
        }
        
        .print-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 15px;
            }
            
            .print-header {
                break-after: avoid;
            }
            
            .course-section {
                break-inside: avoid;
            }
            
            .code-example {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <h1>${title}</h1>
        <div class="print-meta">
            RNCP DWWM 2023 - Formation Front-End<br>
            Généré le ${today}
        </div>
    </div>
    
    <div class="print-content">
        ${content.innerHTML}
    </div>
    
    <div class="print-footer">
        <p>Document généré automatiquement - RNCP DWWM 2023</p>
        <p>Pour plus d'informations, consultez l'application complète</p>
    </div>
</body>
</html>`;
}

// Exposer la fonction globalement
window.downloadPDF = downloadPDF;
