/* =============================================
   ROUTER - Gestionnaire de navigation SPA
   ============================================= */

/**
 * Gestionnaire de routage pour Single Page Application
 */
class RouterManager {
  constructor() {
    this.routes = new Map();
    this.currentPage = null;
    this.isInitialized = false;
    this.pageContainer = null;

    this.init();
  }

  init() {
    if (this.isInitialized) return;

    this.pageContainer = DOMUtils.$("#main-content") || document.body;
    this.registerRoutes();
    this.bindEvents();
    this.initializeExistingLinks();
    this.handleInitialRoute();

    this.isInitialized = true;
    DEBUG.log("Router initialized");
  }

  registerRoutes() {
    // Enregistrement des routes pour chaque page
    APP_CONFIG.pages.forEach((page) => {
      this.routes.set(page.id, {
        id: page.id,
        title: page.title,
        icon: page.icon,
        loader: () => this.loadPage(page.id),
        template: null,
      });
    });

    DEBUG.log("Routes registered:", Array.from(this.routes.keys()));
  }

  bindEvents() {
    // Écouter les changements d'historique
    window.addEventListener("popstate", (e) => {
      const pageId = e.state?.pageId || this.getPageFromHash();
      this.navigateTo(pageId, false);
    });

    // Écouter les clics sur les liens internes
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link) {
        e.preventDefault();
        const pageId = link.getAttribute("href").slice(1);
        this.navigateTo(pageId);
      }
    });
  }

  initializeExistingLinks() {
    // Gestion des clics sur les cartes de concepts
    document.addEventListener("click", (e) => {
      const conceptCard = e.target.closest(".concept-card[data-page]");
      if (conceptCard) {
        // Si le clic n'est pas sur un bouton ou un lien à l'intérieur
        if (!e.target.closest("a, button")) {
          e.preventDefault();
          const pageId = conceptCard.getAttribute("data-page");
          if (pageId) {
            this.navigateTo(pageId);
          }
        }
      }
    });

    DEBUG.log("Existing links and cards initialized");
  }

  async navigateTo(pageId, pushState = true) {
    if (!pageId || !this.routes.has(pageId)) {
      DEBUG.warn("Page not found:", pageId);
      pageId = "home"; // Fallback vers la page d'accueil
    }

    const route = this.routes.get(pageId);

    if (!route) {
      DEBUG.error("Route not found even after fallback:", pageId);
      return;
    }

    try {
      // Afficher le loading
      this.showLoading();

      // Charger le contenu de la page
      const content = await route.loader();

      // Vérifier que le contenu a été chargé
      if (!content) {
        throw new Error("No content returned from loader");
      }

      // Mettre à jour l'historique
      if (pushState) {
        const url = pageId === "home" ? "/" : `#${pageId}`;
        history.pushState({ pageId }, route.title, url);
      }

      // Afficher la nouvelle page
      await this.showPage(pageId, content);

      // Mettre à jour l'état
      this.currentPage = pageId;
      APP_STATE.currentPage = pageId;

      // Mettre à jour le titre de la page
      document.title = `${APP_CONFIG.name} - ${route.title}`;

      // Notifier la navigation
      this.onPageChanged(pageId);
    } catch (error) {
      DEBUG.error("Erreur lors de la navigation:", error);
      this.showError(
        `Erreur lors du chargement de la page "${pageId}": ${error.message}`
      );

      // Fallback navigation vers home si pas déjà sur home
      if (pageId !== "home") {
        DEBUG.log("Attempting fallback navigation to home");
        setTimeout(() => this.navigateTo("home", false), 1000);
      }
    } finally {
      this.hideLoading();
    }
  }

  async loadPage(pageId) {
    // Vérifier le cache avec validation
    if (CACHE.pages.has(pageId)) {
      const cachedContent = CACHE.pages.get(pageId);
      // Vérifier que le contenu en cache n'est pas vide ou corrompu
      if (cachedContent && cachedContent.trim().length > 0) {
        DEBUG.log("Page loaded from cache:", pageId);
        return cachedContent;
      } else {
        DEBUG.warn("Cached content invalid, removing from cache:", pageId);
        CACHE.pages.delete(pageId);
      }
    }

    // Cas spéciaux pour les pages sans fichiers HTML
    if (pageId === "home") {
      // Utiliser le template existant
      const homeTemplate = document.getElementById("home-template");
      if (homeTemplate) {
        const content = homeTemplate.innerHTML;
        // Validation du contenu avant mise en cache
        if (content && content.trim().length > 0) {
          CACHE.pages.set(pageId, content);
          DEBUG.log("Home page content loaded from template:", pageId);
          return content;
        }
      }
      // Fallback si le template n'existe pas ou est vide
      const content = this.getHomeContent();
      if (content && content.trim().length > 0) {
        CACHE.pages.set(pageId, content);
        DEBUG.log("Home page content generated:", pageId);
        return content;
      }
    }

    try {
      // Charger le template de la page depuis le fichier HTML
      const response = await fetch(`./pages/${pageId}.html`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Page ${pageId} not found`);
      }

      const content = await response.text();

      // Validation du contenu chargé
      if (!content || content.trim().length === 0) {
        throw new Error("Loaded content is empty");
      }

      // Mettre en cache seulement si valide
      CACHE.pages.set(pageId, content);

      DEBUG.log("Page loaded from file:", pageId);
      return content;
    } catch (error) {
      DEBUG.warn(
        "Failed to load page file, using fallback:",
        pageId,
        error.message
      );
      const fallbackContent = await this.getFallbackContent(pageId);

      // Validation du fallback
      if (fallbackContent && fallbackContent.trim().length > 0) {
        return fallbackContent;
      } else {
        return this.getErrorContent(
          `Impossible de charger la page "${pageId}"`
        );
      }
    }
  }

  async getFallbackContent(pageId) {
    const page = APP_CONFIG.pages.find((p) => p.id === pageId);

    if (!page) {
      return this.getErrorContent("Page non trouvée");
    }

    // Contenu de base selon le type de page
    switch (pageId) {
      case "home":
        return this.getHomeContent();
      case "about":
        return this.getAboutContent();
      case "html":
        return this.getHtmlContent();
      case "css":
        return this.getCssContent();
      case "javascript":
        return this.getJavaScriptContent();
      case "responsive":
        return this.getResponsiveContent();
      case "forms":
        return this.getFormsContent();
      case "ajax":
        return await this.getAjaxContent();
      case "accessibility":
        return this.getAccessibilityContent();
      default:
        return this.getGenericContent(page);
    }
  }

  async showPage(pageId, content) {
    const oldPage = this.pageContainer.querySelector(".page.active");

    // Supprimer l'ancienne page
    if (oldPage) {
      oldPage.classList.remove("active");
      oldPage.remove();
    }

    // Masquer le loader initial
    const initialLoader = document.querySelector(".loading-initial");
    if (initialLoader) {
      initialLoader.style.display = "none";
    }

    // Créer la nouvelle page
    const newPage = DOMUtils.createElement("div", {
      className: "page active",
      id: `page-${pageId}`,
    });

    // Injecter le contenu
    newPage.innerHTML = content;

    // Ajouter au container
    this.pageContainer.appendChild(newPage);

    // Animation simple d'apparition
    newPage.style.opacity = "0";
    this.pageContainer.style.opacity = "1";

    setTimeout(() => {
      newPage.style.transition = "opacity 0.3s ease-in-out";
      newPage.style.opacity = "1";
    }, 50);

    // Initialiser les composants de la page
    this.initPageComponents(newPage);

    // Scroll vers le haut
    window.scrollTo({ top: 0, behavior: "smooth" });

    DEBUG.log("Page displayed:", pageId);
  }

  initPageComponents(pageElement) {
    try {
      // Initialiser les liens de navigation internes
      const links = pageElement.querySelectorAll('a[href^="#"]');
      links.forEach((link) => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          const pageId = link.getAttribute("href").substring(1);
          this.navigateTo(pageId);
        });
      });

      // Initialiser les animations au scroll si elles existent
      if (
        typeof AnimationUtils !== "undefined" &&
        AnimationUtils.observeScrollAnimations
      ) {
        AnimationUtils.observeScrollAnimations();
      }

      // Initialiser les démonstrations spécifiques selon la page
      if (this.currentPage === "css" && typeof CSSDemo !== "undefined") {
        // Attendre un peu plus que les éléments soient bien rendus
        setTimeout(() => {
          try {
            DEBUG.log("Starting CSS Demo initialization...");
            CSSDemo.initializeAll();
          } catch (error) {
            DEBUG.error("Failed to initialize CSS Demo:", error);
          }
        }, 300);
      } else if (
        this.currentPage === "responsive" &&
        typeof ResponsiveDemo !== "undefined"
      ) {
        // Attendre un peu que les éléments soient bien rendus
        setTimeout(() => {
          try {
            DEBUG.log("Starting Responsive Demo initialization...");
            ResponsiveDemo.initializeAll();
          } catch (error) {
            DEBUG.error("Failed to initialize Responsive Demo:", error);
          }
        }, 300);
      } else if (
        this.currentPage === "ajax" &&
        typeof AjaxDemo !== "undefined"
      ) {
        // Attendre un peu que les éléments soient bien rendus
        setTimeout(() => {
          try {
            DEBUG.log("Starting Ajax Demo initialization...");
            AjaxDemo.initializeAll();
          } catch (error) {
            DEBUG.error("Failed to initialize Ajax Demo:", error);
          }
        }, 300);
      }

      // Exécuter les scripts de la page
      this.executePageScripts(pageElement);

      // Initialiser la navigation sidebar universelle
      this.initSidebarNavigation();

      DEBUG.log("Page components initialized");
    } catch (error) {
      DEBUG.error("Error initializing page components:", error);
    }
  }

  // Initialiser la navigation sidebar universelle
  initSidebarNavigation() {
    try {
      // Créer ou récupérer l'instance du gestionnaire sidebar
      if (!window.sidebarNavigationManager) {
        window.sidebarNavigationManager = new SidebarNavigationManager();
      }

      // Réinitialiser pour la nouvelle page
      window.sidebarNavigationManager.reinit();

      DEBUG.log("Sidebar navigation initialized");
    } catch (error) {
      DEBUG.error("Error initializing sidebar navigation:", error);
    }
  }

  executePageScripts(pageElement) {
    try {
      // Trouver et exécuter tous les scripts dans la page
      const scripts = pageElement.querySelectorAll("script");
      scripts.forEach((script) => {
        if (script.textContent) {
          // Créer un nouveau script pour l'exécuter
          const newScript = document.createElement("script");
          newScript.textContent = script.textContent;

          // L'ajouter temporairement au document pour l'exécution
          document.head.appendChild(newScript);

          // Le supprimer immédiatement après
          document.head.removeChild(newScript);
        }
      });

      DEBUG.log("Page scripts executed");
    } catch (error) {
      DEBUG.error("Error executing page scripts:", error);
    }
  }

  showLoading() {
    APP_STATE.isLoading = true;

    if (!DOM_ELEMENTS.loadingSpinner) {
      DOM_ELEMENTS.loadingSpinner = DOMUtils.createElement("div", {
        className: "loading-overlay",
        innerHTML: `
          <div class="loading-content">
            <div class="spinner"></div>
            <p>Chargement...</p>
          </div>
        `,
      });
      document.body.appendChild(DOM_ELEMENTS.loadingSpinner);
    }

    DOM_ELEMENTS.loadingSpinner.style.display = "flex";
  }

  hideLoading() {
    APP_STATE.isLoading = false;

    if (DOM_ELEMENTS.loadingSpinner) {
      DOM_ELEMENTS.loadingSpinner.style.display = "none";
    }
  }

  showError(message) {
    if (window.notificationManager) {
      window.notificationManager.error(message);
    }
  }

  onPageChanged(pageId) {
    // Mettre à jour la navigation
    if (window.navigationComponent) {
      // Reset d'abord pour éviter les états persistants
      window.navigationComponent.reset();
      // Puis définir le bon état actif
      window.navigationComponent.setActive(pageId);
    }

    // Sauvegarder la préférence
    StorageUtils.setItem("lastPage", pageId);

    // Émettre un événement personnalisé
    const event = new CustomEvent("pageChanged", {
      detail: { pageId, route: this.routes.get(pageId) },
    });
    document.dispatchEvent(event);

    DEBUG.log("Page changed to:", pageId);
  }

  getPageFromHash() {
    const hash = window.location.hash.slice(1);
    return hash || "home";
  }

  handleInitialRoute() {
    const pageId = this.getPageFromHash();
    const lastPage = StorageUtils.getItem("lastPage", "home");

    // Utiliser la page de l'URL ou la dernière page visitée
    this.navigateTo(pageId || lastPage, false);
  }

  // Méthodes de génération de contenu de base
  getHomeContent() {
    return `
      <div class="page-header">
        <h1 class="page-title">RNCP DWWM 2023</h1>
        <p class="page-subtitle">Application de démonstration des concepts front-end</p>
      </div>
      
      <div class="home-grid">
        ${APP_CONFIG.pages
          .slice(1)
          .map(
            (page) => `
          <div class="concept-card" data-page="${page.id}">
            <div class="concept-icon">${page.icon}</div>
            <h3 class="concept-title">${page.title}</h3>
            <p class="concept-description">
              Découvrez les concepts et techniques de ${page.title.toLowerCase()}
            </p>
            <a href="#${page.id}" class="btn btn-primary">Explorer</a>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  getAboutContent() {
    return `
      <div class="page-header">
        <h1 class="page-title">ℹ️ À propos du projet</h1>
        <p class="page-subtitle">Découvrez les objectifs pédagogiques et l'architecture de cette application SPA</p>
      </div>
      
      <div class="content-area">
        <div class="about-section">
          <h2>🎯 Objectifs pédagogiques</h2>
          <p>Cette application constitue un <strong>projet d'évaluation en cours de formation (ECF)</strong> 
          visant à démontrer la maîtrise complète des technologies front-end modernes selon le référentiel 
          <strong>RNCP DWWM 2023 (Développeur Web et Web Mobile)</strong>.</p>
          
          <div class="objectives-grid">
            <div class="objective-card">
              <div class="objective-icon">📚</div>
              <h3>Apprentissage interactif</h3>
              <p>Chaque section propose des démonstrations pratiques avec du code modifiable en temps réel, 
              permettant d'expérimenter et de comprendre les concepts par la pratique.</p>
            </div>
            
            <div class="objective-card">
              <div class="objective-icon">🏗️</div>
              <h3>Architecture moderne</h3>
              <p>Mise en œuvre d'une Single Page Application (SPA) native utilisant les dernières 
              fonctionnalités JavaScript ES6+ sans framework externe.</p>
            </div>
            
            <div class="objective-card">
              <div class="objective-icon">♿</div>
              <h3>Accessibilité & UX</h3>
              <p>Respect des standards WCAG avec navigation clavier, sémantique HTML5 appropriée 
              et design inclusif pour tous les utilisateurs.</p>
            </div>
            
            <div class="objective-card">
              <div class="objective-icon">📱</div>
              <h3>Responsive Design</h3>
              <p>Interface adaptative utilisant Flexbox, CSS Grid et media queries pour une 
              expérience optimale sur tous les appareils.</p>
            </div>
          </div>
          
          <h2>🏛️ Architecture SPA (Single Page Application)</h2>
          <p>L'application utilise une <strong>architecture SPA native</strong> construite entièrement 
          en JavaScript vanilla, sans dépendances externes :</p>
          
          <div class="architecture-section">
            <h3>📂 Structure modulaire</h3>
            <div class="code-area">
              <pre><code class="code-highlight">
<span class="comment">// Structure des fichiers</span>
assets/
├── scripts/
│   ├── <span class="function">app.js</span>         <span class="comment">// Point d'entrée et gestionnaire global</span>
│   ├── <span class="function">router.js</span>     <span class="comment">// Routeur SPA avec gestion d'historique</span>
│   ├── <span class="function">config.js</span>     <span class="comment">// Configuration centralisée</span>
│   ├── <span class="function">utils.js</span>      <span class="comment">// Modules de démonstration</span>
│   └── <span class="function">components.js</span> <span class="comment">// Composants UI réutilisables</span>
├── styles/
│   ├── <span class="function">base.css</span>      <span class="comment">// Variables CSS et reset</span>
│   ├── <span class="function">layout.css</span>    <span class="comment">// Mise en page et grilles</span>
│   ├── <span class="function">components.css</span> <span class="comment">// Composants UI</span>
│   └── <span class="function">animations.css</span> <span class="comment">// Animations et transitions</span>
└── pages/              <span class="comment">// Templates HTML statiques</span>
              </code></pre>
            </div>
            
            <h3>🔀 Système de routage</h3>
            <p>Le <strong>RouterManager</strong> gère la navigation SPA avec :</p>
            <ul>
              <li><strong>Hash routing</strong> : Navigation via fragments URL (#page)</li>
              <li><strong>Chargement dynamique</strong> : Templates injectés à la demande</li>
              <li><strong>Gestion d'historique</strong> : Support du bouton "Précédent"</li>
              <li><strong>Mise en cache</strong> : Optimisation des performances</li>
              <li><strong>Initialisation contextuelle</strong> : Modules activés selon la page</li>
            </ul>
            
            <h3>⚙️ Modules de démonstration</h3>
            <div class="demo-modules">
              <div class="module-item">
                <strong>CSSDemo</strong> : Contrôles interactifs pour Flexbox et CSS Grid avec retry automatique
              </div>
              <div class="module-item">
                <strong>ResponsiveDemo</strong> : Simulateur de viewport et tests de responsive design
              </div>
              <div class="module-item">
                <strong>AjaxDemo</strong> : Démonstrations Fetch API avec gestion d'erreurs complète
              </div>
            </div>
            
            <h3>🎨 Design Glassmorphisme</h3>
            <p>Interface moderne utilisant :</p>
            <ul>
              <li><strong>Backdrop-filter</strong> : Effets de flou et transparence</li>
              <li><strong>Gradients dynamiques</strong> : Animations de fond fluides</li>
              <li><strong>Micro-interactions</strong> : Feedbacks visuels subtils</li>
              <li><strong>Variables CSS</strong> : Thème cohérent et maintenable</li>
            </ul>
          </div>
          
          <h2>🛠️ Technologies utilisées</h2>
          <div class="tech-grid">
            <div class="tech-item">
              <div class="tech-icon">🌐</div>
              <strong>HTML5 Sémantique</strong>
              <p>Structure avec éléments sectionnants, attributs ARIA et métadonnées optimisées</p>
            </div>
            <div class="tech-item">
              <div class="tech-icon">🎨</div>
              <strong>CSS3 Moderne</strong>
              <p>Flexbox, Grid, Custom Properties, animations fluides et design glassmorphisme</p>
            </div>
            <div class="tech-item">
              <div class="tech-icon">⚡</div>
              <strong>JavaScript ES6+</strong>
              <p>Modules ES6, async/await, destructuring, classes et gestion d'événements moderne</p>
            </div>
            <div class="tech-item">
              <div class="tech-icon">📱</div>
              <strong>Responsive Design</strong>
              <p>Mobile-first, media queries, images adaptatives et typography fluide</p>
            </div>
            <div class="tech-item">
              <div class="tech-icon">🔄</div>
              <strong>APIs modernes</strong>
              <p>Fetch API, Intersection Observer, Web Storage et gestion des promesses</p>
            </div>
            <div class="tech-item">
              <div class="tech-icon">🚀</div>
              <strong>Performance</strong>
              <p>Lazy loading, mise en cache, optimisation des ressources et animations 60fps</p>
            </div>
          </div>
          
          <h2>📈 Compétences démontrées</h2>
          <div class="skills-section">
            <div class="skill-category">
              <h3>💻 Développement Front-end</h3>
              <ul>
                <li>Maîtrise des langages HTML5, CSS3 et JavaScript ES6+</li>
                <li>Architecture SPA scalable et maintenable</li>
                <li>Gestion d'état et communication entre modules</li>
                <li>Debug et gestion d'erreurs robuste</li>
              </ul>
            </div>
            
            <div class="skill-category">
              <h3>🎯 UX/UI Design</h3>
              <ul>
                <li>Design system cohérent avec composants réutilisables</li>
                <li>Micro-interactions et animations fluides</li>
                <li>Accessibilité et navigation inclusive</li>
                <li>Tests utilisateur et optimisation continue</li>
              </ul>
            </div>
            
            <div class="skill-category">
              <h3>⚡ Performance & Optimisation</h3>
              <ul>
                <li>Chargement asynchrone et mise en cache intelligente</li>
                <li>Optimisation des ressources et du temps de rendu</li>
                <li>Stratégies de lazy loading et code splitting</li>
                <li>Monitoring des performances en temps réel</li>
              </ul>
            </div>
          </div>
          
          <div class="actions">
            <a href="#home" class="btn btn-primary">
              <span class="btn-icon">🏠</span>
              Retour à l'accueil
            </a>
            <a href="#html" class="btn btn-secondary">
              <span class="btn-icon">🚀</span>
              Commencer l'exploration
            </a>
            <a href="#ajax" class="btn btn-accent">
              <span class="btn-icon">🔄</span>
              Voir les démonstrations AJAX
            </a>
          </div>
        </div>
      </div>
    `;
  }

  getGenericContent(page) {
    return `
      <div class="page-header">
        <h1 class="page-title">${page.icon} ${page.title}</h1>
        <p class="page-subtitle">Concepts et démonstrations pratiques</p>
      </div>
      
      <div class="content-area">
        <h2>Introduction à ${page.title}</h2>
        <p>Cette section présente les concepts essentiels de ${page.title.toLowerCase()} 
        couverts dans le référentiel RNCP DWWM 2023.</p>
        
        <div class="demo-area">
          <p>Zone de démonstration pour ${page.title}</p>
        </div>
      </div>
    `;
  }

  getFormsContent() {
    return `
      <div class="page-header">
        <h1 class="page-title">📋 Formulaires</h1>
        <p class="page-subtitle">Validation côté client, UX et accessibilité</p>
      </div>
      
      <div class="content-area">
        <h2>Concepts des formulaires web</h2>
        <p>Cette section présente les techniques modernes de création et validation de formulaires.</p>
        
        <div class="demo-area">
          <h3>Formulaire de démonstration</h3>
          <form class="demo-form">
            <div class="form-group">
              <label for="email">Email :</label>
              <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
              <label for="password">Mot de passe :</label>
              <input type="password" id="password" name="password" required minlength="8">
            </div>
            <div class="form-group">
              <label for="age">Âge :</label>
              <input type="number" id="age" name="age" min="18" max="100">
            </div>
            <button type="submit" class="btn btn-primary">Valider</button>
          </form>
          
          <h3>Techniques abordées :</h3>
          <ul>
            <li>Validation HTML5 native</li>
            <li>Types d'input modernes</li>
            <li>Accessibilité avec labels</li>
            <li>Gestion des erreurs</li>
          </ul>
        </div>
      </div>
    `;
  }

  async getAjaxContent() {
    try {
      // Essayer de charger le fichier ajax.html
      const response = await fetch("./pages/ajax.html");
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      DEBUG.warn("Failed to load ajax.html, using fallback content");
    }

    // Contenu de fallback si le fichier n'existe pas
    return `
      <div class="page-header">
        <h1 class="page-title">🔄 AJAX & API</h1>
        <p class="page-subtitle">Fetch API, gestion asynchrone et intégration de services web</p>
      </div>
      
      <div class="content-area">
        <h2>Requêtes asynchrones</h2>
        <p>Découvrez les techniques modernes pour communiquer avec des API.</p>
        
        <div class="demo-area">
          <h3>Démonstration Fetch API</h3>
          <button id="fetch-demo" class="btn btn-primary">Charger des données</button>
          <div id="api-result" class="api-result"></div>
          
          <h3>Concepts couverts :</h3>
          <ul>
            <li>Fetch API moderne</li>
            <li>Promesses et async/await</li>
            <li>Gestion des erreurs réseau</li>
            <li>Formats JSON et REST</li>
          </ul>
        </div>
      </div>
    `;
  }

  getAccessibilityContent() {
    return `
      <div class="page-header">
        <h1 class="page-title">♿ Accessibilité Web</h1>
        <p class="page-subtitle">ARIA, navigation clavier, WCAG et inclusion numérique pour tous</p>
      </div>
      
      <div class="sidebar-layout">
        <aside class="sidebar">
          <nav class="sidebar-nav">
            <ul>
              <li><a href="#aria-basics" class="active">ARIA & Sémantique</a></li>
              <li><a href="#keyboard-nav">Navigation clavier</a></li>
              <li><a href="#contrast-readability">Contraste & Lisibilité</a></li>
              <li><a href="#screen-readers">Lecteurs d'écran</a></li>
              <li><a href="#wcag-guidelines">Guidelines WCAG</a></li>
            </ul>
          </nav>
        </aside>

        <main class="content">
          <section id="aria-basics" class="section">
            <div class="section-header">
              <h2 class="section-title">ARIA et Structure Sémantique</h2>
              <p class="section-description">
                Accessible Rich Internet Applications (ARIA) enrichit la sémantique HTML pour les technologies d'assistance
              </p>
            </div>

            <div class="content-area">
              <h3>Attributs ARIA essentiels</h3>
              
              <div class="demo-area">
                <h4>Démonstration interactive</h4>
                
                <div class="accessibility-demo-container">
                  <!-- Boutons avec différents niveaux d'accessibilité -->
                  <div class="demo-section">
                    <h5>❌ Bouton non accessible :</h5>
                    <div class="bad-example" onclick="showAlert('Clic détecté!')">Cliquer ici</div>
                    
                    <h5>✅ Bouton accessible :</h5>
                    <button 
                      class="btn btn-primary" 
                      aria-label="Déclencher une notification d'exemple"
                      onclick="showAlert('Bouton accessible cliqué!')"
                    >
                      <span aria-hidden="true">🔔</span>
                      Notification
                    </button>
                  </div>
                  
                  <!-- Zones de statut dynamiques -->
                  <div class="demo-section">
                    <h5>Messages dynamiques :</h5>
                    <button class="btn btn-secondary" onclick="updateStatus()">
                      Mettre à jour le statut
                    </button>
                    <div 
                      id="status-live" 
                      aria-live="polite" 
                      aria-atomic="true"
                      class="status-display"
                    >
                      Statut : En attente...
                    </div>
                    
                    <button class="btn btn-warning" onclick="showError()">
                      Déclencher une erreur
                    </button>
                    <div 
                      id="error-alert" 
                      role="alert" 
                      aria-live="assertive"
                      class="error-display"
                    >
                      <!-- Les erreurs apparaîtront ici -->
                    </div>
                  </div>
                  
                  <!-- Navigation avec rôles ARIA -->
                  <div class="demo-section">
                    <h5>Navigation avec landmarks :</h5>
                    <nav aria-label="Navigation de démonstration" class="demo-nav">
                      <ul role="menubar" aria-label="Menu principal">
                        <li role="none">
                          <a href="#" role="menuitem" tabindex="0">Accueil</a>
                        </li>
                        <li role="none">
                          <a href="#" role="menuitem" tabindex="-1">Services</a>
                        </li>
                        <li role="none">
                          <a href="#" role="menuitem" tabindex="-1">Contact</a>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>

              <div class="code-area">
                <h4>Code des exemples ci-dessus</h4>
                <pre><code class="code-highlight">
<span class="comment">&lt;!-- ❌ Élément non accessible --&gt;</span>
<span class="keyword">&lt;div</span> <span class="string">onclick="showAlert('Clic détecté!')"</span><span class="keyword">&gt;</span>Cliquer ici<span class="keyword">&lt;/div&gt;</span>

<span class="comment">&lt;!-- ✅ Bouton accessible avec ARIA --&gt;</span>
<span class="keyword">&lt;button</span> 
  <span class="string">class="btn btn-primary"</span>
  <span class="string">aria-label="Déclencher une notification d'exemple"</span>
  <span class="string">onclick="showAlert('Bouton accessible cliqué!')"</span>
<span class="keyword">&gt;</span>
  <span class="keyword">&lt;span</span> <span class="string">aria-hidden="true"</span><span class="keyword">&gt;</span>🔔<span class="keyword">&lt;/span&gt;</span>
  Notification
<span class="keyword">&lt;/button&gt;</span>

<span class="comment">&lt;!-- Zone de statut dynamique --&gt;</span>
<span class="keyword">&lt;div</span> 
  <span class="string">id="status-live"</span>
  <span class="string">aria-live="polite"</span>
  <span class="string">aria-atomic="true"</span>
<span class="keyword">&gt;</span>
  Statut : En attente...
<span class="keyword">&lt;/div&gt;</span>

<span class="comment">&lt;!-- Zone d'alerte pour erreurs --&gt;</span>
<span class="keyword">&lt;div</span> 
  <span class="string">id="error-alert"</span>
  <span class="string">role="alert"</span>
  <span class="string">aria-live="assertive"</span>
<span class="keyword">&gt;</span>
  &lt;!-- Les erreurs apparaîtront ici --&gt;
<span class="keyword">&lt;/div&gt;</span>

<span class="comment">&lt;!-- Navigation avec landmarks ARIA --&gt;</span>
<span class="keyword">&lt;nav</span> <span class="string">aria-label="Navigation de démonstration"</span><span class="keyword">&gt;</span>
  <span class="keyword">&lt;ul</span> <span class="string">role="menubar"</span> <span class="string">aria-label="Menu principal"</span><span class="keyword">&gt;</span>
    <span class="keyword">&lt;li</span> <span class="string">role="none"</span><span class="keyword">&gt;</span>
      <span class="keyword">&lt;a</span> <span class="string">href="#"</span> <span class="string">role="menuitem"</span> <span class="string">tabindex="0"</span><span class="keyword">&gt;</span>Accueil<span class="keyword">&lt;/a&gt;</span>
    <span class="keyword">&lt;/li&gt;</span>
  <span class="keyword">&lt;/ul&gt;</span>
<span class="keyword">&lt;/nav&gt;</span>
                </code></pre>
              </div>
            </div>
          </section>

          <section id="keyboard-nav" class="section">
            <div class="section-header">
              <h2 class="section-title">Navigation au Clavier</h2>
              <p class="section-description">
                Permettre une navigation complète sans souris via les touches du clavier
              </p>
            </div>

            <div class="content-area">
              <h3>Tests de navigation clavier</h3>
              
              <div class="demo-area">
                <div class="keyboard-demo">
                  <h4>🎯 Testez avec TAB, ENTER, ESPACE et flèches :</h4>
                  
                  <div class="keyboard-test-zone">
                    <button class="btn btn-primary" onkeydown="handleKeydown(event, 'btn1')">
                      Bouton 1 (TAB + ENTER)
                    </button>
                    
                    <div class="custom-dropdown" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox">
                      <span>Sélectionnez une option</span>
                      <div class="dropdown-options" role="listbox">
                        <div role="option" tabindex="-1">Option 1</div>
                        <div role="option" tabindex="-1">Option 2</div>
                        <div role="option" tabindex="-1">Option 3</div>
                      </div>
                    </div>
                    
                    <div class="slider-container">
                      <label for="accessibility-slider">Volume (0-100) :</label>
                      <input 
                        type="range" 
                        id="accessibility-slider" 
                        min="0" 
                        max="100" 
                        value="50"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow="50"
                        aria-label="Réglage du volume"
                        oninput="updateSliderValue(this)"
                      >
                      <span id="slider-value" aria-live="polite">50</span>
                    </div>
                    
                    <fieldset class="radio-group">
                      <legend>Choisissez votre préférence :</legend>
                      <label>
                        <input type="radio" name="preference" value="dark" />
                        Thème sombre
                      </label>
                      <label>
                        <input type="radio" name="preference" value="light" />
                        Thème clair
                      </label>
                      <label>
                        <input type="radio" name="preference" value="auto" checked />
                        Automatique
                      </label>
                    </fieldset>
                  </div>
                </div>
              </div>

              <div class="code-area">
                <h4>Gestion des événements clavier</h4>
                <pre><code class="code-highlight">
<span class="comment">// Gestion des touches pour les composants personnalisés</span>
<span class="keyword">function</span> <span class="function">handleKeydown</span>(event, elementId) {
  <span class="keyword">switch</span> (event.key) {
    <span class="keyword">case</span> <span class="string">'Enter'</span>:
    <span class="keyword">case</span> <span class="string">' '</span>: <span class="comment">// Espace</span>
      event.<span class="function">preventDefault</span>();
      <span class="function">activateElement</span>(elementId);
      <span class="keyword">break</span>;
    
    <span class="keyword">case</span> <span class="string">'ArrowDown'</span>:
      event.<span class="function">preventDefault</span>();
      <span class="function">focusNext</span>(elementId);
      <span class="keyword">break</span>;
      
    <span class="keyword">case</span> <span class="string">'ArrowUp'</span>:
      event.<span class="function">preventDefault</span>();
      <span class="function">focusPrevious</span>(elementId);
      <span class="keyword">break</span>;
      
    <span class="keyword">case</span> <span class="string">'Escape'</span>:
      <span class="function">closeDropdown</span>(elementId);
      <span class="keyword">break</span>;
  }
}

<span class="comment">// Gestion du focus programmatique</span>
<span class="keyword">function</span> <span class="function">setFocusTo</span>(element) {
  element.<span class="function">focus</span>();
  element.<span class="function">setAttribute</span>(<span class="string">'aria-selected'</span>, <span class="string">'true'</span>);
}
                </code></pre>
              </div>
            </div>
          </section>

          <section id="contrast-readability" class="section">
            <div class="section-header">
              <h2 class="section-title">Contraste et Lisibilité</h2>
              <p class="section-description">
                Respecter les ratios de contraste WCAG pour garantir la lisibilité
              </p>
            </div>

            <div class="content-area">
              <div class="demo-area">
                <h4>Tests de contraste</h4>
                
                <div class="contrast-examples">
                  <div class="contrast-bad">
                    <span class="contrast-label">❌ Contraste insuffisant (2.1:1)</span>
                    <p style="color: #999; background: #fff; padding: 10px;">
                      Ce texte gris clair sur fond blanc ne respecte pas les standards WCAG AA (4.5:1 minimum)
                    </p>
                  </div>
                  
                  <div class="contrast-good">
                    <span class="contrast-label">✅ Contraste suffisant (7.2:1)</span>
                    <p style="color: #333; background: #fff; padding: 10px; border: 1px solid #ddd;">
                      Ce texte foncé sur fond blanc respecte largement les standards WCAG AAA (7:1)
                    </p>
                  </div>
                  
                  <div class="contrast-test">
                    <span class="contrast-label">🔍 Testeur de contraste interactif</span>
                    <div class="contrast-tester">
                      <div class="color-inputs">
                        <label>
                          Couleur du texte :
                          <input type="color" id="text-color" value="#333333" onchange="updateContrast()">
                        </label>
                        <label>
                          Couleur de fond :
                          <input type="color" id="bg-color" value="#ffffff" onchange="updateContrast()">
                        </label>
                      </div>
                      <div id="contrast-result" class="contrast-result">
                        <div id="contrast-preview" style="color: #333; background: #fff; padding: 15px; border-radius: 8px;">
                          Exemple de texte avec ce contraste
                        </div>
                        <div id="contrast-ratio" class="contrast-info">
                          Ratio de contraste : <strong>21:1</strong> ✅ WCAG AAA
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="screen-readers" class="section">
            <div class="section-header">
              <h2 class="section-title">Optimisation Lecteurs d'Écran</h2>
              <p class="section-description">
                Structurer le contenu pour une lecture fluide par les technologies d'assistance
              </p>
            </div>

            <div class="content-area">
              <div class="demo-area">
                <h4>Structure optimisée pour lecteurs d'écran</h4>
                
                <div class="screen-reader-demo">
                  <article aria-labelledby="article-title" aria-describedby="article-summary">
                    <header>
                      <h5 id="article-title">Guide d'Accessibilité Web</h5>
                      <p id="article-summary" class="sr-only">
                        Cet article explique les bonnes pratiques d'accessibilité web avec des exemples concrets
                      </p>
                      <div class="article-meta">
                        <time datetime="2025-08-20" aria-label="Publié le 20 août 2025">20/08/2025</time>
                        <span aria-label="Temps de lecture estimé">⏱️ 5 min</span>
                      </div>
                    </header>
                    
                    <section aria-labelledby="section1-title">
                      <h6 id="section1-title">Introduction à l'accessibilité</h6>
                      <p>L'accessibilité web garantit que les sites soient utilisables par tous...</p>
                      
                      <aside aria-label="Information complémentaire" class="info-box">
                        <span aria-hidden="true">💡</span>
                        <strong>Conseil :</strong> Utilisez toujours des alternatives textuelles pour les images
                      </aside>
                    </section>
                    
                    <section aria-labelledby="section2-title">
                      <h6 id="section2-title">Outils de test</h6>
                      <ul aria-label="Liste des outils recommandés">
                        <li>NVDA (gratuit) pour Windows</li>
                        <li>VoiceOver (intégré) pour macOS</li>
                        <li>TalkBack (intégré) pour Android</li>
                      </ul>
                    </section>
                  </article>
                </div>
              </div>

              <div class="code-area">
                <h4>Techniques pour lecteurs d'écran</h4>
                <pre><code class="code-highlight">
<span class="comment">&lt;!-- Texte caché visuellement mais accessible aux lecteurs d'écran --&gt;</span>
<span class="keyword">&lt;span</span> <span class="string">class="sr-only"</span><span class="keyword">&gt;</span>
  Description détaillée pour lecteurs d'écran uniquement
<span class="keyword">&lt;/span&gt;</span>

<span class="comment">&lt;!-- Masquer du contenu décoratif --&gt;</span>
<span class="keyword">&lt;span</span> <span class="string">aria-hidden="true"</span><span class="keyword">&gt;</span>🎨<span class="keyword">&lt;/span&gt;</span>

<span class="comment">&lt;!-- Relations entre éléments --&gt;</span>
<span class="keyword">&lt;article</span> 
  <span class="string">aria-labelledby="title"</span> 
  <span class="string">aria-describedby="summary"</span>
<span class="keyword">&gt;</span>
  <span class="keyword">&lt;h3</span> <span class="string">id="title"</span><span class="keyword">&gt;</span>Titre de l'article<span class="keyword">&lt;/h3&gt;</span>
  <span class="keyword">&lt;p</span> <span class="string">id="summary"</span><span class="keyword">&gt;</span>Résumé de l'article<span class="keyword">&lt;/p&gt;</span>
<span class="keyword">&lt;/article&gt;</span>

<span class="comment">&lt;!-- Images avec alternatives --&gt;</span>
<span class="keyword">&lt;img</span> 
  <span class="string">src="chart.png"</span> 
  <span class="string">alt="Graphique montrant une augmentation de 25% des ventes en 2024"</span>
<span class="keyword">&gt;</span>
                </code></pre>
              </div>
            </div>
          </section>

          <section id="wcag-guidelines" class="section">
            <div class="section-header">
              <h2 class="section-title">Guidelines WCAG 2.1</h2>
              <p class="section-description">
                Les 4 principes fondamentaux : Perceptible, Utilisable, Compréhensible, Robuste
              </p>
            </div>

            <div class="content-area">
              <div class="wcag-principles">
                <div class="principle-card">
                  <div class="principle-icon">👁️</div>
                  <h4>1. Perceptible</h4>
                  <ul>
                    <li>Alternative textuelle pour images</li>
                    <li>Sous-titres pour vidéos</li>
                    <li>Contraste suffisant (4.5:1 min)</li>
                    <li>Texte redimensionnable (200%)</li>
                  </ul>
                </div>
                
                <div class="principle-card">
                  <div class="principle-icon">⌨️</div>
                  <h4>2. Utilisable</h4>
                  <ul>
                    <li>Navigation au clavier complète</li>
                    <li>Pas de contenu clignotant</li>
                    <li>Temps suffisant pour lire</li>
                    <li>Aide à la navigation</li>
                  </ul>
                </div>
                
                <div class="principle-card">
                  <div class="principle-icon">🧠</div>
                  <h4>3. Compréhensible</h4>
                  <ul>
                    <li>Langue du contenu déclarée</li>
                    <li>Comportements prévisibles</li>
                    <li>Aide à la saisie</li>
                    <li>Messages d'erreur clairs</li>
                  </ul>
                </div>
                
                <div class="principle-card">
                  <div class="principle-icon">🔧</div>
                  <h4>4. Robuste</h4>
                  <ul>
                    <li>HTML valide et sémantique</li>
                    <li>Compatible technologies d'assistance</li>
                    <li>Noms et rôles définies</li>
                    <li>États communiqués</li>
                  </ul>
                </div>
              </div>
              
              <div class="demo-area">
                <h4>🔧 Checklist d'accessibilité</h4>
                <div class="accessibility-checklist">
                  <label class="checklist-item">
                    <input type="checkbox" checked disabled>
                    <span class="checkmark">✅</span>
                    Toutes les images ont un attribut alt approprié
                  </label>
                  <label class="checklist-item">
                    <input type="checkbox" checked disabled>
                    <span class="checkmark">✅</span>
                    La navigation fonctionne entièrement au clavier
                  </label>
                  <label class="checklist-item">
                    <input type="checkbox" checked disabled>
                    <span class="checkmark">✅</span>
                    Le contraste respecte les ratios WCAG AA (4.5:1)
                  </label>
                  <label class="checklist-item">
                    <input type="checkbox" checked disabled>
                    <span class="checkmark">✅</span>
                    Les formulaires ont des labels associés
                  </label>
                  <label class="checklist-item">
                    <input type="checkbox" checked disabled>
                    <span class="checkmark">✅</span>
                    Les landmarks ARIA structurent la page
                  </label>
                  <label class="checklist-item">
                    <input type="checkbox" checked disabled>
                    <span class="checkmark">✅</span>
                    Les messages d'erreur sont annoncés
                  </label>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <script>
        // Fonctions pour les démonstrations d'accessibilité
        function showAlert(message) {
          alert(message);
        }
        
        let statusCounter = 0;
        function updateStatus() {
          statusCounter++;
          const statusEl = document.getElementById('status-live');
          if (statusEl) {
            statusEl.textContent = \`Statut mis à jour \${statusCounter} fois - \${new Date().toLocaleTimeString()}\`;
          }
        }
        
        function showError() {
          const errorEl = document.getElementById('error-alert');
          if (errorEl) {
            errorEl.textContent = '⚠️ Erreur : Quelque chose s\\'est mal passé !';
            setTimeout(() => {
              errorEl.textContent = '';
            }, 5000);
          }
        }
        
        function updateSliderValue(slider) {
          const valueEl = document.getElementById('slider-value');
          if (valueEl) {
            valueEl.textContent = slider.value;
            slider.setAttribute('aria-valuenow', slider.value);
          }
        }
        
        function updateContrast() {
          const textColor = document.getElementById('text-color').value;
          const bgColor = document.getElementById('bg-color').value;
          const preview = document.getElementById('contrast-preview');
          const ratio = document.getElementById('contrast-ratio');
          
          if (preview) {
            preview.style.color = textColor;
            preview.style.background = bgColor;
          }
          
          // Calcul simplifié du ratio de contraste
          const contrast = calculateContrast(textColor, bgColor);
          const level = contrast >= 7 ? 'AAA' : contrast >= 4.5 ? 'AA' : 'Échec';
          const icon = contrast >= 4.5 ? '✅' : '❌';
          
          if (ratio) {
            ratio.innerHTML = \`Ratio de contraste : <strong>\${contrast.toFixed(1)}:1</strong> \${icon} WCAG \${level}\`;
          }
        }
        
        function calculateContrast(color1, color2) {
          // Fonction simplifiée - dans un vrai projet, utilisez une librairie dédiée
          return 4.5 + Math.random() * 16; // Simulation pour la démo
        }
      </script>
    `;
  }

  getErrorContent(message) {
    return `
      <div class="page-header">
        <h1 class="page-title">❌ Erreur</h1>
        <p class="page-subtitle">${message}</p>
      </div>
      
      <div class="content-area">
        <div class="glass-card">
          <p>Une erreur s'est produite lors du chargement de cette page.</p>
          <button onclick="window.router.navigateTo('home')" class="btn btn-primary">
            Retour à l'accueil
          </button>
        </div>
      </div>
    `;
  }

  // Méthodes de gestion du cache
  clearCache() {
    CACHE.pages.clear();
    CACHE.templates.clear();
    CACHE.assets.clear();
    DEBUG.log("Cache cleared");
  }

  getCacheStats() {
    return {
      pages: CACHE.pages.size,
      templates: CACHE.templates.size,
      assets: CACHE.assets.size,
      totalSize: this.calculateCacheSize(),
    };
  }

  calculateCacheSize() {
    let totalSize = 0;

    CACHE.pages.forEach((content) => {
      totalSize += new Blob([content]).size;
    });

    return totalSize;
  }

  // Nettoyage automatique du cache si trop volumineux (> 5MB)
  cleanupCacheIfNeeded() {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const currentSize = this.calculateCacheSize();

    if (currentSize > maxSize) {
      DEBUG.warn("Cache size exceeded, clearing cache");
      this.clearCache();
    }
  }
}

// Instance globale du router
let RouterInstance = null;

// Fonction d'initialisation du router
function initRouter() {
  if (!RouterInstance) {
    RouterInstance = new RouterManager();
    // Rendre l'instance disponible globalement
    window.RouterInstance = RouterInstance;
  }
  return RouterInstance;
}

// Export
if (typeof window !== "undefined") {
  window.RouterManager = RouterManager;
  window.initRouter = initRouter;
}
