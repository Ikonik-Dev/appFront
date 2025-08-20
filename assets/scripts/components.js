/* =============================================
   COMPOSANTS - Classes et fonctions des composants UI
   ============================================= */

/**
 * Classe de base pour tous les composants
 */
class BaseComponent {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...this.defaultOptions, ...options };
    this.isInitialized = false;
    this.eventListeners = [];

    this.init();
  }

  get defaultOptions() {
    return {};
  }

  init() {
    if (this.isInitialized) return;

    this.render();
    this.bindEvents();
    this.isInitialized = true;

    DEBUG.log(`${this.constructor.name} initialized`);
  }

  render() {
    // À implémenter dans les classes filles
  }

  bindEvents() {
    // À implémenter dans les classes filles
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  destroy() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
    this.isInitialized = false;
  }
}

/**
 * Composant Navigation
 */
class Navigation extends BaseComponent {
  get defaultOptions() {
    return {
      activeClass: "active",
      animationDuration: 300,
    };
  }

  render() {
    this.element.innerHTML = `
      <nav class="nav-glass" role="navigation" aria-label="Navigation principale">
        <ul class="nav-list" role="menubar">
          ${APP_CONFIG.pages
            .map(
              (page, index) => `
            <li class="nav-item" role="none">
              <a href="#${page.id}" 
                 class="nav-link" 
                 data-page="${page.id}"
                 role="menuitem"
                 aria-label="Naviguer vers ${page.title}"
                 tabindex="${index === 0 ? "0" : "-1"}">
                <span class="nav-icon" aria-hidden="true">${page.icon}</span>
                <span class="nav-text">${page.title}</span>
              </a>
            </li>
          `
            )
            .join("")}
          <li class="nav-item course-select-container" role="none">
            <select class="course-select" aria-label="Sélectionner un cours">
              <option value="">📚 Cours</option>
              ${APP_CONFIG.courses
                .map(
                  (course) => `
                <option value="${course.id}">${course.icon} ${course.title}</option>
              `
                )
                .join("")}
            </select>
          </li>
        </ul>
      </nav>
    `;
  }

  bindEvents() {
    const navLinks = this.element.querySelectorAll(".nav-link");
    const courseSelect = this.element.querySelector(".course-select");

    navLinks.forEach((link, index) => {
      // Gestion des clics
      this.addEventListener(link, "click", (e) => {
        e.preventDefault();
        const pageId = link.dataset.page;
        this.setActive(pageId);
        // Utiliser l'instance globale du router
        if (
          window.RouterInstance &&
          typeof window.RouterInstance.navigateTo === "function"
        ) {
          window.RouterInstance.navigateTo(pageId);
        } else {
          // Fallback navigation
          window.location.hash = pageId;
        }
      });

      // Gestion de la navigation au clavier
      this.addEventListener(link, "keydown", (e) => {
        const currentIndex = Array.from(navLinks).indexOf(link);
        let targetIndex = currentIndex;

        switch (e.key) {
          case "ArrowRight":
          case "ArrowDown":
            e.preventDefault();
            targetIndex = (currentIndex + 1) % navLinks.length;
            break;
          case "ArrowLeft":
          case "ArrowUp":
            e.preventDefault();
            targetIndex =
              (currentIndex - 1 + navLinks.length) % navLinks.length;
            break;
          case "Home":
            e.preventDefault();
            targetIndex = 0;
            break;
          case "End":
            e.preventDefault();
            targetIndex = navLinks.length - 1;
            break;
          case "Enter":
          case " ":
            e.preventDefault();
            link.click();
            return;
        }

        // Mettre à jour le focus et les tabindex
        this.updateFocus(targetIndex);
        navLinks[targetIndex].focus();
      });
    });

    // Gestion du select des cours
    if (courseSelect) {
      this.addEventListener(courseSelect, "change", (e) => {
        const courseId = e.target.value;
        if (courseId) {
          // Naviguer vers la page de cours
          if (
            window.RouterInstance &&
            typeof window.RouterInstance.navigateTo === "function"
          ) {
            window.RouterInstance.navigateTo(courseId);
          } else {
            // Fallback navigation
            window.location.hash = courseId;
          }
          // Réinitialiser le select
          setTimeout(() => {
            e.target.value = "";
          }, 100);
        }
      });
    }

    // Amélioration : Support du live region pour annoncer les changements
    this.createLiveRegion();
  }

  createLiveRegion() {
    // Créer une zone live pour annoncer les changements de navigation
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only"; // Screen reader only
    liveRegion.id = "nav-live-region";

    // Ajouter au DOM si pas déjà présent
    if (!document.getElementById("nav-live-region")) {
      document.body.appendChild(liveRegion);
    }
  }

  announceNavigation(pageTitle) {
    const liveRegion = document.getElementById("nav-live-region");
    if (liveRegion) {
      liveRegion.textContent = `Navigation vers ${pageTitle}`;

      // Nettoyer après l'annonce
      setTimeout(() => {
        liveRegion.textContent = "";
      }, 1000);
    }
  }

  updateFocus(targetIndex) {
    const links = this.element.querySelectorAll(".nav-link");

    links.forEach((link, index) => {
      if (index === targetIndex) {
        link.setAttribute("tabindex", "0");
      } else {
        link.setAttribute("tabindex", "-1");
      }
    });
  }

  setActive(pageId) {
    // Debug : log de l'état de navigation
    console.log(`🔄 Navigation: Setting active page to "${pageId}"`);

    const links = this.element.querySelectorAll(".nav-link");
    let activeFound = false;
    let activePageTitle = "";

    links.forEach((link, index) => {
      const linkPageId = link.dataset.page;
      const isActive = linkPageId === pageId;

      // Debug : log de chaque lien
      console.log(
        `   Link ${index}: "${linkPageId}" -> ${
          isActive ? "ACTIVE" : "inactive"
        }`
      );

      // Retirer d'abord la classe active de tous les liens
      link.classList.remove(this.options.activeClass);

      // Ajouter la classe active uniquement au bon lien
      if (isActive) {
        link.classList.add(this.options.activeClass);
        link.setAttribute("aria-current", "page");
        link.setAttribute("tabindex", "0");
        activeFound = true;
        activePageTitle =
          link.querySelector(".nav-text")?.textContent || pageId;

        // Annoncer le changement pour les lecteurs d'écran
        this.announceNavigation(activePageTitle);
      } else {
        link.setAttribute("aria-current", "false");
        link.setAttribute("tabindex", "-1");
      }
    });

    // Debug : vérifier si un lien actif a été trouvé
    if (!activeFound) {
      console.warn(`⚠️ Navigation: No link found for pageId "${pageId}"`);
      console.log(
        "Available page IDs:",
        Array.from(links).map((l) => l.dataset.page)
      );
    } else {
      console.log(`✅ Navigation: Successfully set "${pageId}" as active`);
    }
  }

  // Méthode pour forcer la réinitialisation de la navigation
  reset() {
    console.log("🔄 Navigation: Resetting all active states");
    const links = this.element.querySelectorAll(".nav-link");
    links.forEach((link) => {
      link.classList.remove(this.options.activeClass);
      link.setAttribute("aria-current", "false");
      link.setAttribute("tabindex", "-1");
    });
  }

  updateFocus(targetIndex) {
    const links = this.element.querySelectorAll(".nav-link");
    links.forEach((link, index) => {
      link.setAttribute("tabindex", index === targetIndex ? "0" : "-1");
    });
  }
}

/**
 * Composant de notification
 */
class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.init();
  }

  init() {
    this.createContainer();
  }

  createContainer() {
    this.container = DOMUtils.createElement("div", {
      id: "notification-container",
      className: "notification-container",
    });
    document.body.appendChild(this.container);
  }

  show(message, type = "info", duration = null) {
    const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    const notificationDuration = duration || config.duration;

    const notification = DOMUtils.createElement("div", {
      className: `alert ${config.class} animate-slide-in-right`,
    });

    // Définir le contenu HTML après création
    notification.innerHTML = `
      <span class="alert-icon">${config.icon}</span>
      <span class="alert-message">${message}</span>
      <button class="alert-close" aria-label="Fermer">&times;</button>
    `;

    this.container.appendChild(notification);
    this.notifications.push(notification);

    // Auto-suppression
    setTimeout(() => {
      this.hide(notification);
    }, notificationDuration);

    // Bouton de fermeture
    const closeBtn = notification.querySelector(".alert-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.hide(notification);
      });
    } else {
      DEBUG.warn("Close button not found in notification");
    }

    return notification;
  }

  hide(notification) {
    if (!notification.parentNode) return;

    notification.classList.add("animate-slide-out-right");

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }

      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  success(message, duration) {
    return this.show(message, "success", duration);
  }

  warning(message, duration) {
    return this.show(message, "warning", duration);
  }

  error(message, duration) {
    return this.show(message, "error", duration);
  }

  info(message, duration) {
    return this.show(message, "info", duration);
  }
}

/**
 * Composant Modal
 */
class Modal extends BaseComponent {
  constructor(element, options = {}) {
    super(element, options);
    this.previousActiveElement = null;
    this.focusableElements = [];
  }

  get defaultOptions() {
    return {
      closeOnOverlay: true,
      closeOnEscape: true,
      showCloseButton: true,
      size: "medium", // small, medium, large
      animation: "scale",
      trapFocus: true, // Nouveau: gestion du focus
    };
  }

  render() {
    this.element.innerHTML = `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-body">
        <div class="modal-content modal-${this.options.size}">
          ${
            this.options.showCloseButton
              ? '<button class="modal-close" aria-label="Fermer la modale" type="button">&times;</button>'
              : ""
          }
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title"></h3>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer"></div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const overlay = this.element.querySelector(".modal-overlay");
    const closeBtn = this.element.querySelector(".modal-close");

    if (this.options.closeOnOverlay) {
      this.addEventListener(overlay, "click", (e) => {
        if (e.target === overlay) {
          this.hide();
        }
      });
    }

    if (closeBtn) {
      this.addEventListener(closeBtn, "click", () => {
        this.hide();
      });
    }

    if (this.options.closeOnEscape) {
      this.addEventListener(document, "keydown", (e) => {
        if (e.key === "Escape" && this.isVisible()) {
          this.hide();
        }
      });
    }

    // Gestion du focus trap
    if (this.options.trapFocus) {
      this.addEventListener(document, "keydown", (e) => {
        if (e.key === "Tab" && this.isVisible()) {
          this.handleTabKey(e);
        }
      });
    }
  }

  show(title = "", body = "", footer = "") {
    // Sauvegarder l'élément actuellement focus
    this.previousActiveElement = document.activeElement;

    const titleEl = this.element.querySelector(".modal-title");
    const bodyEl = this.element.querySelector(".modal-body");
    const footerEl = this.element.querySelector(".modal-footer");

    if (title) titleEl.textContent = title;
    if (body) bodyEl.innerHTML = body;
    if (footer) footerEl.innerHTML = footer;

    this.element.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Mettre à jour la liste des éléments focusables
    this.updateFocusableElements();

    // Animation d'ouverture
    const content = this.element.querySelector(".modal-content");
    AnimationUtils.animate(content, `animate-${this.options.animation}-in`);

    // Focus sur le premier élément focusable ou le bouton de fermeture
    setTimeout(() => {
      this.focusFirstElement();
    }, 100);

    return this;
  }

  hide() {
    const content = this.element.querySelector(".modal-content");

    AnimationUtils.animate(
      content,
      `animate-${this.options.animation}-out`
    ).then(() => {
      this.element.style.display = "none";
      document.body.style.overflow = "";

      // Restaurer le focus sur l'élément précédent
      if (
        this.previousActiveElement &&
        typeof this.previousActiveElement.focus === "function"
      ) {
        this.previousActiveElement.focus();
      }
    });

    return this;
  }

  // Nouveaux méthodes pour l'accessibilité
  updateFocusableElements() {
    const focusableSelectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
    ];

    this.focusableElements = Array.from(
      this.element.querySelectorAll(focusableSelectors.join(", "))
    ).filter((el) => {
      // Vérifier que l'élément est visible
      return el.offsetWidth > 0 && el.offsetHeight > 0;
    });
  }

  focusFirstElement() {
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    } else {
      // Si aucun élément focusable, focus sur la modale elle-même
      const content = this.element.querySelector(".modal-content");
      content.setAttribute("tabindex", "-1");
      content.focus();
    }
  }

  handleTabKey(e) {
    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement =
      this.focusableElements[this.focusableElements.length - 1];
    const currentIndex = this.focusableElements.indexOf(document.activeElement);

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement || currentIndex === -1) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab seul
      if (document.activeElement === lastElement || currentIndex === -1) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  isVisible() {
    return this.element.style.display === "flex";
  }

  setTitle(title) {
    const titleEl = this.element.querySelector(".modal-title");
    titleEl.textContent = title;
    return this;
  }

  setBody(body) {
    const bodyEl = this.element.querySelector(".modal-body");
    bodyEl.innerHTML = body;
    return this;
  }

  setFooter(footer) {
    const footerEl = this.element.querySelector(".modal-footer");
    footerEl.innerHTML = footer;
    return this;
  }
}

/**
 * Composant de formulaire avec validation
 */
class FormValidator extends BaseComponent {
  get defaultOptions() {
    return {
      validateOnBlur: true,
      validateOnSubmit: true,
      showErrors: true,
      errorClass: "form-error",
    };
  }

  bindEvents() {
    if (this.options.validateOnSubmit) {
      this.addEventListener(this.element, "submit", (e) => {
        if (!this.validateForm()) {
          e.preventDefault();
        }
      });
    }

    if (this.options.validateOnBlur) {
      const inputs = this.element.querySelectorAll("input, textarea, select");
      inputs.forEach((input) => {
        this.addEventListener(input, "blur", () => {
          this.validateField(input);
        });
      });
    }
  }

  validateForm() {
    const inputs = this.element.querySelectorAll("[data-validate]");
    let isValid = true;

    inputs.forEach((input) => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  validateField(input) {
    const rules = this.parseValidationRules(input.dataset.validate);
    const errors = ValidationUtils.validate(input.value, rules);

    this.clearFieldErrors(input);

    if (errors.length > 0) {
      this.showFieldErrors(input, errors);
      return false;
    }

    return true;
  }

  parseValidationRules(rulesString) {
    const rules = {};

    if (rulesString.includes("required")) {
      rules.required = true;
    }

    const minMatch = rulesString.match(/min:(\d+)/);
    if (minMatch) {
      rules.minLength = parseInt(minMatch[1]);
    }

    const maxMatch = rulesString.match(/max:(\d+)/);
    if (maxMatch) {
      rules.maxLength = parseInt(maxMatch[1]);
    }

    if (rulesString.includes("email")) {
      rules.pattern = REGEX_PATTERNS.email;
      rules.message = "Adresse email invalide";
    }

    return rules;
  }

  showFieldErrors(input, errors) {
    if (!this.options.showErrors) return;

    const errorContainer = DOMUtils.createElement("div", {
      className: `${this.options.errorClass} form-feedback`,
    });

    errorContainer.innerHTML = errors
      .map((error) => `<div class="error-message">${error}</div>`)
      .join("");

    input.classList.add("is-invalid");
    input.parentNode.appendChild(errorContainer);
  }

  clearFieldErrors(input) {
    input.classList.remove("is-invalid");
    const errorContainer = input.parentNode.querySelector(
      `.${this.options.errorClass}`
    );
    if (errorContainer) {
      errorContainer.remove();
    }
  }
}

/**
 * Gestionnaire universel de navigation pour les sidebars
 */
class SidebarNavigationManager {
  constructor() {
    this.isInitialized = false;
    this.activeLinks = new Set();
    this.boundHandleSidebarClick = this.handleSidebarClick.bind(this);
  }

  // Initialiser la gestion des sidebars
  init() {
    if (this.isInitialized) return;

    console.log("🔧 SidebarNavigationManager: Initializing...");

    // Délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.setupSidebarNavigation();
      this.setupScrollSpy();
      this.isInitialized = true;
      console.log("✅ SidebarNavigationManager: Ready");
    }, 100);
  }

  // Réinitialiser pour une nouvelle page
  reinit() {
    this.isInitialized = false;
    this.activeLinks.clear();
    this.init();
  }

  // Configuration de la navigation sidebar
  setupSidebarNavigation() {
    // Trouver tous les liens de sidebar (liens commençant par #)
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a[href^="#"]');

    console.log(`🔍 Found ${sidebarLinks.length} sidebar links`);

    sidebarLinks.forEach((link, index) => {
      // Retirer les anciens event listeners pour éviter les doublons
      link.removeEventListener("click", this.boundHandleSidebarClick);

      // Ajouter le nouveau event listener
      link.addEventListener("click", this.boundHandleSidebarClick);

      console.log(
        `   Link ${index}: ${link.getAttribute(
          "href"
        )} -> "${link.textContent.trim()}"`
      );
    });
  }

  // Gestion des clics sur liens sidebar
  handleSidebarClick(e) {
    e.preventDefault();

    const link = e.currentTarget;
    const targetId = link.getAttribute("href").substring(1); // Retirer le #
    const targetSection = document.getElementById(targetId);

    console.log(`🎯 Sidebar click: targeting "${targetId}"`);

    if (targetSection) {
      // Mettre à jour l'état actif
      this.setActiveSidebarLink(link);

      // Scroll smooth vers la section
      this.scrollToSection(targetSection);

      // Focus pour l'accessibilité
      this.focusSection(targetSection);

      console.log(`✅ Scrolled to section: ${targetId}`);
    } else {
      console.warn(`⚠️ Section not found: ${targetId}`);
      // Afficher les sections disponibles pour debug
      const availableSections = Array.from(
        document.querySelectorAll("[id]")
      ).map((el) => el.id);
      console.log("Available sections:", availableSections);
    }
  }

  // Mettre à jour le lien actif dans la sidebar
  setActiveSidebarLink(activeLink) {
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a[href^="#"]');

    sidebarLinks.forEach((link) => {
      link.classList.remove("active");
    });

    activeLink.classList.add("active");
    this.activeLinks.clear();
    this.activeLinks.add(activeLink);
  }

  // Scroll fluide vers une section
  scrollToSection(section) {
    const offsetTop = section.offsetTop - 80; // Offset pour éviter que le header cache le contenu

    window.scrollTo({
      top: offsetTop,
      behavior: "smooth",
    });

    // Animation de highlight temporaire
    this.highlightSection(section);
  }

  // Focus accessible sur la section
  focusSection(section) {
    section.setAttribute("tabindex", "-1");
    section.focus();

    // Retirer le tabindex après un délai
    setTimeout(() => {
      section.removeAttribute("tabindex");
    }, 1000);
  }

  // Highlight temporaire de la section
  highlightSection(section) {
    const originalTransition = section.style.transition;
    const originalBackground = section.style.backgroundColor;

    section.style.transition = "background-color 0.3s ease";
    section.style.backgroundColor = "rgba(74, 144, 226, 0.1)";

    setTimeout(() => {
      section.style.backgroundColor = originalBackground;
      setTimeout(() => {
        section.style.transition = originalTransition;
      }, 300);
    }, 1000);
  }

  // Spy de scroll pour mettre à jour automatiquement le lien actif
  setupScrollSpy() {
    let isScrolling = false;

    window.addEventListener("scroll", () => {
      if (isScrolling) return;

      isScrolling = true;
      requestAnimationFrame(() => {
        this.updateActiveOnScroll();
        isScrolling = false;
      });
    });
  }

  // Mettre à jour le lien actif basé sur la position de scroll
  updateActiveOnScroll() {
    const sections = document.querySelectorAll(".section[id], section[id]");
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a[href^="#"]');

    let currentSection = "";
    const scrollPosition = window.scrollY + 100; // Offset

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (
        scrollPosition >= sectionTop &&
        scrollPosition < sectionTop + sectionHeight
      ) {
        currentSection = section.getAttribute("id");
      }
    });

    // Mettre à jour les classes actives
    if (currentSection) {
      sidebarLinks.forEach((link) => {
        const linkTarget = link.getAttribute("href").substring(1);

        if (linkTarget === currentSection) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      });
    }
  }
}

/**
 * Export des composants
 */
if (typeof window !== "undefined") {
  window.BaseComponent = BaseComponent;
  window.Navigation = Navigation;
  window.NotificationManager = NotificationManager;
  window.Modal = Modal;
  window.FormValidator = FormValidator;
  window.SidebarNavigationManager = SidebarNavigationManager;
}
