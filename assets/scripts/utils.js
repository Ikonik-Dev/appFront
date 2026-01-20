/* =============================================
   UTILITAIRES - Fonctions helper réutilisables
   ============================================= */

/**
 * Utilitaires DOM
 */
const DOMUtils = {
  // Sélection d'éléments
  $(selector) {
    return document.querySelector(selector);
  },

  $$(selector) {
    return Array.from(document.querySelectorAll(selector));
  },

  // Création d'éléments
  createElement(tag, attributes = {}, textContent = "") {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "dataset") {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });

    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  },

  // Ajout/suppression de classes avec animation
  addClass(element, className, withAnimation = true) {
    if (withAnimation && APP_STATE.user.preferences.animations) {
      element.style.transition = `all ${APP_CONFIG.animations.duration}ms ${APP_CONFIG.animations.easing}`;
    }
    element.classList.add(className);
  },

  removeClass(element, className, withAnimation = true) {
    if (withAnimation && APP_STATE.user.preferences.animations) {
      element.style.transition = `all ${APP_CONFIG.animations.duration}ms ${APP_CONFIG.animations.easing}`;
    }
    element.classList.remove(className);
  },

  // Toggle de classes
  toggleClass(element, className) {
    element.classList.toggle(className);
  },

  // Vérification de visibilité
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Scroll smooth vers un élément
  scrollTo(element, offset = 0) {
    const elementPosition = element.offsetTop - offset;
    window.scrollTo({
      top: elementPosition,
      behavior: "smooth",
    });
  },
};

/**
 * Utilitaires d'animation
 */
const AnimationUtils = {
  activeAnimations: new Set(), // Track des animations actives

  // Ajouter une animation
  animate(element, animationClass, duration = null) {
    return new Promise((resolve, reject) => {
      // Vérifier les préférences utilisateur
      if (!APP_STATE.user.preferences.animations) {
        resolve();
        return;
      }

      // Vérifier que l'élément existe et est visible
      if (!element || !element.isConnected) {
        reject(new Error("Element not found or not connected to DOM"));
        return;
      }

      const animationDuration = duration || APP_CONFIG.animations.duration;
      const animationId = `${element.id || "anonymous"}-${Date.now()}`;

      // Éviter les animations multiples sur le même élément
      if (element.hasAttribute("data-animating")) {
        // Attendre la fin de l'animation en cours
        element.addEventListener(
          "animationend",
          () => {
            this.animate(element, animationClass, duration)
              .then(resolve)
              .catch(reject);
          },
          { once: true }
        );
        return;
      }

      element.setAttribute("data-animating", "true");
      element.classList.add(animationClass);
      this.activeAnimations.add(animationId);

      const handleAnimationEnd = () => {
        // Nettoyage
        element.classList.remove(animationClass);
        element.removeAttribute("data-animating");
        element.removeEventListener("animationend", handleAnimationEnd);
        element.removeEventListener("animationcancel", handleAnimationEnd);
        this.activeAnimations.delete(animationId);

        resolve();
      };

      const handleAnimationError = () => {
        // Nettoyage en cas d'erreur
        element.classList.remove(animationClass);
        element.removeAttribute("data-animating");
        element.removeEventListener("animationend", handleAnimationEnd);
        element.removeEventListener("animationcancel", handleAnimationEnd);
        this.activeAnimations.delete(animationId);

        reject(new Error("Animation was cancelled or failed"));
      };

      element.addEventListener("animationend", handleAnimationEnd, {
        once: true,
      });
      element.addEventListener("animationcancel", handleAnimationError, {
        once: true,
      });

      // Fallback timeout pour éviter les animations bloquées
      setTimeout(() => {
        if (this.activeAnimations.has(animationId)) {
          DEBUG.warn(
            `Animation timeout for ${animationClass} on element`,
            element
          );
          handleAnimationEnd();
        }
      }, animationDuration + 100);
    });
  },

  // Annuler toutes les animations actives
  cancelAllAnimations() {
    const elements = document.querySelectorAll("[data-animating]");
    elements.forEach((element) => {
      element.dispatchEvent(new Event("animationcancel"));
    });
    this.activeAnimations.clear();
    DEBUG.log("All animations cancelled");
  },

  // Animation d'apparition au scroll
  observeScrollAnimations() {
    // Vérifier que IntersectionObserver est supporté
    if (!window.IntersectionObserver) {
      DEBUG.warn(
        "IntersectionObserver not supported, skipping scroll animations"
      );
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.animate(entry.target, "animate-fade-in").catch((error) =>
              DEBUG.warn("Scroll animation failed:", error)
            );
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    const elements = DOMUtils.$$(".scroll-animate");
    if (elements.length === 0) {
      DEBUG.log("No scroll-animate elements found");
      return;
    }

    elements.forEach((element) => {
      observer.observe(element);
    });

    DEBUG.log(`Observing ${elements.length} elements for scroll animations`);
  },

  // Transition entre pages
  async pageTransition(oldPage, newPage) {
    try {
      if (oldPage && oldPage.isConnected) {
        await this.animate(oldPage, "page-transition-exit-active");
        oldPage.style.display = "none";
      }

      if (newPage && newPage.isConnected) {
        newPage.style.display = "block";
        await this.animate(newPage, "page-transition-enter-active");
      }
    } catch (error) {
      DEBUG.error("Page transition failed:", error);
      // Fallback sans animation
      if (oldPage) oldPage.style.display = "none";
      if (newPage) newPage.style.display = "block";
    }
  },

  // Vérifier la performance des animations
  getAnimationStats() {
    return {
      activeCount: this.activeAnimations.size,
      activeAnimations: Array.from(this.activeAnimations),
    };
  },
};

/**
 * Utilitaires de stockage
 */
const StorageUtils = {
  // LocalStorage avec try/catch
  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      DEBUG.error("Erreur lors de la sauvegarde:", error);
      return false;
    }
  },

  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      DEBUG.error("Erreur lors de la lecture:", error);
      return defaultValue;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      DEBUG.error("Erreur lors de la suppression:", error);
      return false;
    }
  },

  // Session storage
  setSessionItem(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      DEBUG.error("Erreur sessionStorage:", error);
      return false;
    }
  },

  getSessionItem(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      DEBUG.error("Erreur sessionStorage:", error);
      return defaultValue;
    }
  },
};

/**
 * Utilitaires de validation
 */
const ValidationUtils = {
  // Validation email
  isValidEmail(email) {
    return REGEX_PATTERNS.email.test(email);
  },

  // Validation téléphone français
  isValidPhone(phone) {
    return REGEX_PATTERNS.phone.test(phone);
  },

  // Validation URL
  isValidUrl(url) {
    return REGEX_PATTERNS.url.test(url);
  },

  // Validation mot de passe fort
  isStrongPassword(password) {
    return REGEX_PATTERNS.password.test(password);
  },

  // Validation générique
  validate(value, rules) {
    const errors = [];

    if (rules.required && (!value || value.trim() === "")) {
      errors.push("Ce champ est requis");
    }

    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Minimum ${rules.minLength} caractères requis`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Maximum ${rules.maxLength} caractères autorisés`);
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || "Format invalide");
    }

    return errors;
  },
};

/**
 * Utilitaires de formatage
 */
const FormatUtils = {
  // Formatage de date
  formatDate(date, format = LOCALE_CONFIG.dateFormat) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return format.replace("DD", day).replace("MM", month).replace("YYYY", year);
  },

  // Formatage de nombre
  formatNumber(number, decimals = 2) {
    return number
      .toFixed(decimals)
      .replace(".", LOCALE_CONFIG.numberFormat.decimal)
      .replace(/\B(?=(\d{3})+(?!\d))/g, LOCALE_CONFIG.numberFormat.thousands);
  },

  // Capitalisation
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Truncate text
  truncate(text, maxLength, suffix = "...") {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
  },
};

/**
 * Utilitaires de débounce/throttle
 */
const PerformanceUtils = {
  // Debounce
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Mesure de performance
  measurePerformance(name, func) {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    DEBUG.log(`${name} took ${end - start} milliseconds`);
    return result;
  },
};

/**
 * Utilitaires réseau
 */
const NetworkUtils = {
  // Fetch avec gestion d'erreurs
  async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      DEBUG.error("Erreur réseau:", error);
      throw error;
    }
  },

  // Vérification de la connexion
  isOnline() {
    return navigator.onLine;
  },

  // Simulation de délai réseau
  async simulateNetworkDelay(min = 500, max = 2000) {
    const delay = Math.random() * (max - min) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  },
};

/**
 * Export des utilitaires
 */
if (typeof window !== "undefined") {
  window.DOMUtils = DOMUtils;
  window.AnimationUtils = AnimationUtils;
  window.StorageUtils = StorageUtils;
  window.ValidationUtils = ValidationUtils;
  window.FormatUtils = FormatUtils;
  window.PerformanceUtils = PerformanceUtils;
  window.NetworkUtils = NetworkUtils;
}

/**
 * Fonctions globales pour les démonstrations interactives
 */
window.setTheme = function (theme) {
  const themedContent = document.getElementById("themedContent");
  if (!themedContent) {
    DEBUG.warn("Element themedContent not found for setTheme");
    return;
  }

  const themes = {
    blue: { primary: "#4facfe", secondary: "#00f2fe" },
    green: { primary: "#96ceb4", secondary: "#85d1b2" },
    purple: { primary: "#667eea", secondary: "#764ba2" },
    orange: { primary: "#ff9a56", secondary: "#ff6b35" },
  };

  const selectedTheme = themes[theme];
  if (selectedTheme) {
    themedContent.style.setProperty("--theme-primary", selectedTheme.primary);
    themedContent.style.setProperty(
      "--theme-secondary",
      selectedTheme.secondary
    );
    DEBUG.log(`Theme changed to: ${theme}`);
  } else {
    DEBUG.warn(`Unknown theme: ${theme}`);
  }
};

window.restartAnimations = function () {
  const animationDemos = document.querySelectorAll(".animation-demo");
  if (animationDemos.length === 0) {
    DEBUG.warn("No animation demos found");
    return;
  }

  animationDemos.forEach((demo) => {
    demo.style.animation = "none";
    demo.offsetHeight; // Trigger reflow
    demo.style.animation = null;
  });
  DEBUG.log("Animations restarted");
};

/**
 * Utilitaires pour les démonstrations CSS
 */
const CSSDemo = {
  // Initialiser les démonstrations CSS
  initializeFlexDemo() {
    const flexContainer = document.getElementById("flexContainer");
    const justifyControl = document.getElementById("justify-content");
    const alignControl = document.getElementById("align-items");
    const directionControl = document.getElementById("flex-direction");

    DEBUG.log("Initializing Flex Demo...", {
      flexContainer: !!flexContainer,
      justifyControl: !!justifyControl,
      alignControl: !!alignControl,
      directionControl: !!directionControl,
    });

    if (!flexContainer) {
      DEBUG.warn("flexContainer element not found");
      return false;
    }

    if (!justifyControl) {
      DEBUG.warn("justify-content control not found");
      return false;
    }

    if (!alignControl) {
      DEBUG.warn("align-items control not found");
      return false;
    }

    if (!directionControl) {
      DEBUG.warn("flex-direction control not found");
      return false;
    }

    try {
      // Justify Content
      if (flexContainer && justifyControl) {
        // Retirer les anciens event listeners s'ils existent
        const newJustifyControl = justifyControl.cloneNode(true);
        justifyControl.parentNode.replaceChild(
          newJustifyControl,
          justifyControl
        );

        newJustifyControl.addEventListener("change", function () {
          DEBUG.log("Changing justify-content to:", this.value);
          flexContainer.style.justifyContent = this.value;
        });
        // Appliquer la valeur initiale
        flexContainer.style.justifyContent = newJustifyControl.value;
      }

      // Align Items
      if (flexContainer && alignControl) {
        // Retirer les anciens event listeners s'ils existent
        const newAlignControl = alignControl.cloneNode(true);
        alignControl.parentNode.replaceChild(newAlignControl, alignControl);

        newAlignControl.addEventListener("change", function () {
          DEBUG.log("Changing align-items to:", this.value);
          flexContainer.style.alignItems = this.value;
        });
        // Appliquer la valeur initiale
        flexContainer.style.alignItems = newAlignControl.value;
      }

      // Flex Direction
      if (flexContainer && directionControl) {
        // Retirer les anciens event listeners s'ils existent
        const newDirectionControl = directionControl.cloneNode(true);
        directionControl.parentNode.replaceChild(
          newDirectionControl,
          directionControl
        );

        newDirectionControl.addEventListener("change", function () {
          DEBUG.log("Changing flex-direction to:", this.value);
          flexContainer.style.flexDirection = this.value;
        });
        // Appliquer la valeur initiale
        flexContainer.style.flexDirection = newDirectionControl.value;
      }

      DEBUG.log("Flex Demo initialized successfully");
      return true;
    } catch (error) {
      DEBUG.error("Error in initializeFlexDemo:", error);
      return false;
    }
  },

  // Initialiser les démonstrations Grid
  initializeGridDemo() {
    const gridContainer = document.getElementById("gridContainer");
    const columnsControl = document.getElementById("grid-columns");
    const gapControl = document.getElementById("grid-gap");
    const gapValue = document.getElementById("gap-value");

    DEBUG.log("Initializing Grid Demo...", {
      gridContainer,
      columnsControl,
      gapControl,
      gapValue,
    });

    if (gridContainer && columnsControl) {
      // Retirer les anciens event listeners s'ils existent
      const newColumnsControl = columnsControl.cloneNode(true);
      columnsControl.parentNode.replaceChild(newColumnsControl, columnsControl);

      newColumnsControl.addEventListener("change", function () {
        DEBUG.log("Changing grid-template-columns to:", this.value);
        gridContainer.style.gridTemplateColumns = this.value;
      });
      // Appliquer la valeur initiale
      gridContainer.style.gridTemplateColumns = newColumnsControl.value;
    }

    if (gridContainer && gapControl) {
      // Retirer les anciens event listeners s'ils existent
      const newGapControl = gapControl.cloneNode(true);
      gapControl.parentNode.replaceChild(newGapControl, gapControl);

      newGapControl.addEventListener("input", function () {
        const value = this.value + "px";
        DEBUG.log("Changing grid gap to:", value);
        gridContainer.style.gap = value;
        if (gapValue) gapValue.textContent = value;
      });
      // Appliquer la valeur initiale
      const initialGap = newGapControl.value + "px";
      gridContainer.style.gap = initialGap;
      if (gapValue) gapValue.textContent = initialGap;
    }

    return !!(gridContainer && columnsControl && gapControl);
  },

  // Initialiser toutes les démonstrations CSS
  initializeAll() {
    let attempts = 0;
    const maxAttempts = 10;

    const tryInitialize = () => {
      attempts++;
      let flexInitialized = false;
      let gridInitialized = false;

      try {
        flexInitialized = this.initializeFlexDemo();
        gridInitialized = this.initializeGridDemo();
      } catch (error) {
        DEBUG.error("Error during CSS demo initialization:", error);
      }

      if (flexInitialized && gridInitialized) {
        DEBUG.log("All CSS demos initialized successfully!");
        return true;
      } else if (attempts < maxAttempts) {
        DEBUG.log(
          `CSS Demo initialization attempt ${attempts}: Flex=${flexInitialized}, Grid=${gridInitialized}. Retrying in 200ms...`
        );
        setTimeout(tryInitialize, 200);
      } else {
        DEBUG.warn("CSS Demo initialization failed after maximum attempts", {
          flexInitialized,
          gridInitialized,
        });
      }

      return false;
    };

    tryInitialize();
  },
};

/**
 * Utilitaires pour les démonstrations Responsive
 */
const ResponsiveDemo = {
  // Initialiser le simulateur de viewport
  initializeViewportSimulator() {
    const deviceButtons = document.querySelectorAll(".device-btn");
    const customWidth = document.getElementById("customWidth");
    const widthDisplay = document.getElementById("widthDisplay");

    DEBUG.log("Initializing Viewport Simulator...", {
      deviceButtons: deviceButtons.length,
      customWidth,
      widthDisplay,
    });

    // Gestion des boutons de devices
    deviceButtons.forEach((button) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener("click", (e) => {
        const size = newButton.getAttribute("onclick")?.match(/'([^']+)'/)?.[1];
        if (size) {
          this.setViewport(size, newButton);
        }
      });
    });

    // Gestion du slider personnalisé
    if (customWidth && widthDisplay) {
      const newCustomWidth = customWidth.cloneNode(true);
      customWidth.parentNode.replaceChild(newCustomWidth, customWidth);

      newCustomWidth.addEventListener("input", () => {
        const width = newCustomWidth.value + "px";
        const frame = document.getElementById("deviceFrame");
        const info = document.getElementById("breakpointInfo");

        if (frame) {
          frame.style.width = width;
          frame.removeAttribute("data-size");
        }

        if (info) {
          info.innerHTML = `<strong>Personnalisé - ${width}</strong>`;
        }

        widthDisplay.textContent = width;

        // Reset active button
        document.querySelectorAll(".device-btn").forEach((btn) => {
          btn.classList.remove("active");
        });
      });
    }

    // Initialiser la navigation mobile
    this.initializeMobileNav();

    return deviceButtons.length > 0;
  },

  setViewport(size, activeButton) {
    const frame = document.getElementById("deviceFrame");
    const info = document.getElementById("breakpointInfo");
    const buttons = document.querySelectorAll(".device-btn");

    if (!frame || !info) return;

    // Reset active button
    buttons.forEach((btn) => btn.classList.remove("active"));
    if (activeButton) activeButton.classList.add("active");

    const sizes = {
      mobile: { width: "320px", label: "Mobile - 320px" },
      tablet: { width: "768px", label: "Tablette - 768px" },
      desktop: { width: "1024px", label: "Desktop - 1024px" },
      large: { width: "1440px", label: "Large - 1440px" },
    };

    const config = sizes[size];
    if (config) {
      frame.style.width = config.width;
      frame.setAttribute("data-size", size);
      info.innerHTML = `<strong>${config.label}</strong>`;
    }

    DEBUG.log("Viewport changed to:", size);
  },

  initializeMobileNav() {
    const navToggle = document.querySelector(".nav-toggle");
    if (navToggle) {
      const newNavToggle = navToggle.cloneNode(true);
      navToggle.parentNode.replaceChild(newNavToggle, navToggle);

      newNavToggle.addEventListener("click", () => {
        this.toggleMobileNav();
      });
    }
  },

  toggleMobileNav() {
    const navMenu = document.getElementById("navMenu");
    if (navMenu) {
      navMenu.classList.toggle("active");
      DEBUG.log("Mobile nav toggled");
    }
  },

  // Initialiser les contrôles de grille responsive
  initializeGridControls() {
    const gridType = document.getElementById("gridType");
    const minSize = document.getElementById("minSize");
    const minSizeDisplay = document.getElementById("minSizeDisplay");
    const grid = document.getElementById("responsiveGrid");

    DEBUG.log("Initializing Grid Controls...", {
      gridType,
      minSize,
      minSizeDisplay,
      grid,
    });

    if (gridType && grid) {
      const newGridType = gridType.cloneNode(true);
      gridType.parentNode.replaceChild(newGridType, gridType);

      newGridType.addEventListener("change", () => {
        const type = newGridType.value;
        const size = minSize ? minSize.value + "px" : "200px";

        let columns;
        switch (type) {
          case "auto-fit":
            columns = `repeat(auto-fit, minmax(${size}, 1fr))`;
            break;
          case "auto-fill":
            columns = `repeat(auto-fill, minmax(${size}, 1fr))`;
            break;
          case "fixed":
            columns = "repeat(3, 1fr)";
            break;
        }

        grid.style.gridTemplateColumns = columns;
        DEBUG.log("Grid template changed:", columns);
      });
    }

    if (minSize && minSizeDisplay && grid) {
      const newMinSize = minSize.cloneNode(true);
      minSize.parentNode.replaceChild(newMinSize, minSize);

      newMinSize.addEventListener("input", () => {
        const size = newMinSize.value + "px";
        minSizeDisplay.textContent = size;

        const type = gridType ? gridType.value : "auto-fit";
        if (type !== "fixed") {
          const columns = `repeat(${type}, minmax(${size}, 1fr))`;
          grid.style.gridTemplateColumns = columns;
        }
        DEBUG.log("Grid min size changed:", size);
      });
    }

    return !!(gridType && grid);
  },

  // Initialiser les contrôles de typographie
  initializeTypographyControls() {
    const buttons = document.querySelectorAll(".approach-btn");

    DEBUG.log("Initializing Typography Controls...", {
      buttons: buttons.length,
    });

    buttons.forEach((button) => {
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener("click", (e) => {
        const approach = newButton
          .getAttribute("onclick")
          ?.match(/'([^']+)'/)?.[1];
        if (approach) {
          this.setTypographyApproach(approach, newButton);
        }
      });
    });

    return buttons.length > 0;
  },

  setTypographyApproach(approach, activeButton) {
    const demo = document.querySelector(".typography-demo");
    const buttons = document.querySelectorAll(".approach-btn");

    if (!demo) return;

    // Reset classes
    demo.classList.remove(
      "typography-fluid",
      "typography-breakpoints",
      "typography-vw"
    );

    // Add new class
    demo.classList.add(`typography-${approach}`);

    // Update active button
    buttons.forEach((btn) => btn.classList.remove("active"));
    if (activeButton) activeButton.classList.add("active");

    DEBUG.log("Typography approach changed to:", approach);
  },

  // Initialiser les autres contrôles
  initializeImageQualityToggle() {
    const checkbox = document.getElementById("slowConnection");

    if (checkbox) {
      const newCheckbox = checkbox.cloneNode(true);
      checkbox.parentNode.replaceChild(newCheckbox, checkbox);

      newCheckbox.addEventListener("change", () => {
        this.toggleImageQuality(newCheckbox);
      });
    }

    return !!checkbox;
  },

  toggleImageQuality(checkbox) {
    const images = document.querySelectorAll(".responsive-image");

    images.forEach((img) => {
      if (checkbox.checked) {
        img.style.filter = "blur(1px) brightness(0.8)";
        img.style.opacity = "0.8";
      } else {
        img.style.filter = "";
        img.style.opacity = "";
      }
    });

    DEBUG.log("Image quality toggled:", checkbox.checked);
  },

  // Initialiser la démonstration responsive des images
  initializeResponsiveImageDemo() {
    const updateResponsiveDemo = () => {
      const desktop = document.querySelector(".placeholder-desktop");
      const mobile = document.querySelector(".placeholder-mobile");

      if (desktop && mobile) {
        if (window.innerWidth >= 768) {
          desktop.style.display = "flex";
          mobile.style.display = "none";
        } else {
          desktop.style.display = "none";
          mobile.style.display = "flex";
        }
      }
    };

    // Écouter les changements de taille
    window.addEventListener("resize", updateResponsiveDemo);
    updateResponsiveDemo(); // Appel initial

    DEBUG.log("Responsive image demo initialized");
  },

  // Test d'impression
  testPrintStyles() {
    window.print();
    DEBUG.log("Print styles test triggered");
  },

  // Initialiser toutes les démonstrations responsive
  initializeAll() {
    // Exposer les fonctions globalement dès le début pour éviter les erreurs
    window.setViewport = (size) => this.setViewport(size);
    window.toggleMobileNav = () => this.toggleMobileNav();
    window.setTypographyApproach = (approach) =>
      this.setTypographyApproach(approach);
    window.toggleImageQuality = () => this.toggleImageQuality();
    window.testPrintStyles = () => this.testPrintStyles();

    let attempts = 0;
    const maxAttempts = 10;

    const tryInitialize = () => {
      attempts++;
      const results = {
        viewport: false,
        grid: false,
        typography: false,
        imageQuality: false,
      };

      try {
        results.viewport = this.initializeViewportSimulator();
        results.grid = this.initializeGridControls();
        results.typography = this.initializeTypographyControls();
        results.imageQuality = this.initializeImageQualityToggle();
        this.initializeResponsiveImageDemo();
      } catch (error) {
        DEBUG.error("Error during Responsive demo initialization:", error);
      }

      const allInitialized = Object.values(results).every(Boolean);

      if (allInitialized) {
        DEBUG.log("All Responsive demos initialized successfully!", results);
        return true;
      } else if (attempts < maxAttempts) {
        DEBUG.log(
          `Responsive Demo initialization attempt ${attempts}:`,
          results,
          ". Retrying in 200ms..."
        );
        setTimeout(tryInitialize, 200);
      } else {
        DEBUG.warn(
          "Responsive Demo initialization failed after maximum attempts",
          results
        );
      }

      return false;
    };

    tryInitialize();
  },
};

// Rendre les fonctions globalement accessibles
window.CSSDemo = CSSDemo;
window.ResponsiveDemo = ResponsiveDemo;

/**
 * Utilitaires pour les démonstrations AJAX
 */
const AjaxDemo = {
  // API de base pour les tests
  baseAPI: "https://jsonplaceholder.typicode.com",

  // État des démonstrations
  state: {
    isLoading: false,
    lastRequest: null,
    requestCount: 0,
  },

  // Initialiser toutes les démonstrations AJAX
  initializeAll() {
    this.initializeBasicDemo();
    this.initializeFetchDemo();
    this.initializeAsyncDemo();
    this.initializeErrorDemo();
    this.initializeRestDemo();
    this.setupMethodToggle();

    DEBUG.log("Ajax demos initialized successfully!");

    // Exposer les fonctions globalement
    this.exposeGlobalFunctions();
  },

  // Exposer toutes les fonctions nécessaires
  exposeGlobalFunctions() {
    // Démo de base
    window.loadUserData = () => this.loadUserData();
    window.loadMultipleUsers = () => this.loadMultipleUsers();
    window.simulateError = () => this.simulateBasicError();
    window.clearResults = () => this.clearResults();

    // Démo Fetch
    window.executeFetchDemo = () => this.executeFetchDemo();
    window.showGeneratedCode = () => this.showGeneratedCode();

    // Démo Async
    window.runAsyncDemo = () => this.runAsyncDemo();
    window.runParallelDemo = () => this.runParallelDemo();
    window.resetAsyncDemo = () => this.resetAsyncDemo();

    // Démo erreurs
    window.simulateNetworkError = () => this.simulateNetworkError();
    window.simulate404Error = () => this.simulate404Error();
    window.simulate500Error = () => this.simulate500Error();
    window.simulateTimeoutError = () => this.simulateTimeoutError();
    window.simulateParseError = () => this.simulateParseError();

    // Démo REST
    window.executeRestRequest = () => this.executeRestRequest();
    window.showCurlCommand = () => this.showCurlCommand();
    window.validateJSON = () => this.validateJSON();
    window.loadExample = (type) => this.loadExample(type);
  },

  // Initialiser la démonstration de base
  initializeBasicDemo() {
    // Pas d'initialisation spéciale nécessaire
  },

  // Charger un utilisateur unique
  async loadUserData() {
    const statusEl = document.getElementById("demoStatus");
    const resultsEl = document.getElementById("demoResults");

    if (!statusEl || !resultsEl) return;

    try {
      statusEl.textContent = "Chargement en cours...";
      statusEl.style.color = "#4facfe";

      const response = await fetch(
        `${this.baseAPI}/users/${Math.floor(Math.random() * 10) + 1}`
      );
      const user = await response.json();

      statusEl.textContent = "Utilisateur chargé avec succès !";
      statusEl.style.color = "#4caf50";

      resultsEl.innerHTML = `
<strong>Utilisateur récupéré :</strong>
{
  "id": ${user.id},
  "name": "${user.name}",
  "username": "${user.username}",
  "email": "${user.email}",
  "phone": "${user.phone}",
  "website": "${user.website}",
  "company": "${user.company.name}",
  "address": "${user.address.city}, ${user.address.zipcode}"
}`;
    } catch (error) {
      statusEl.textContent = "Erreur lors du chargement";
      statusEl.style.color = "#f44336";
      resultsEl.textContent = `Erreur: ${error.message}`;
    }
  },

  // Charger plusieurs utilisateurs
  async loadMultipleUsers() {
    const statusEl = document.getElementById("demoStatus");
    const resultsEl = document.getElementById("demoResults");

    if (!statusEl || !resultsEl) return;

    try {
      statusEl.textContent = "Chargement de tous les utilisateurs...";
      statusEl.style.color = "#4facfe";

      const response = await fetch(`${this.baseAPI}/users`);
      const users = await response.json();

      statusEl.textContent = `${users.length} utilisateurs chargés !`;
      statusEl.style.color = "#4caf50";

      resultsEl.innerHTML = `
<strong>Liste des utilisateurs :</strong>
[
${users
  .map(
    (user) => `  {
    "id": ${user.id},
    "name": "${user.name}",
    "email": "${user.email}"
  }`
  )
  .join(",\n")}
]`;
    } catch (error) {
      statusEl.textContent = "Erreur lors du chargement";
      statusEl.style.color = "#f44336";
      resultsEl.textContent = `Erreur: ${error.message}`;
    }
  },

  // Simuler une erreur basique
  async simulateBasicError() {
    const statusEl = document.getElementById("demoStatus");
    const resultsEl = document.getElementById("demoResults");

    if (!statusEl || !resultsEl) return;

    try {
      statusEl.textContent = "Tentative de connexion à une URL invalide...";
      statusEl.style.color = "#ff9800";

      // URL invalide pour générer une erreur
      await fetch("https://invalid-url-that-does-not-exist.com/api/data");
    } catch (error) {
      statusEl.textContent = "Erreur simulée correctement !";
      statusEl.style.color = "#f44336";
      resultsEl.innerHTML = `
<strong>Erreur capturée :</strong>
{
  "type": "${error.name}",
  "message": "${error.message}",
  "description": "Cette erreur est normale - elle démontre la gestion d'erreurs réseau"
}`;
    }
  },

  // Effacer les résultats
  clearResults() {
    const statusEl = document.getElementById("demoStatus");
    const resultsEl = document.getElementById("demoResults");

    if (statusEl) {
      statusEl.textContent = "Prêt à charger des données...";
      statusEl.style.color = "rgba(255, 255, 255, 0.8)";
    }

    if (resultsEl) {
      resultsEl.textContent = "";
    }
  },

  // Initialiser la démo Fetch
  initializeFetchDemo() {
    // Gestion du changement de méthode HTTP
    const methodSelect = document.getElementById("httpMethod");
    if (methodSelect) {
      methodSelect.addEventListener("change", () => {
        this.updateBodySection();
      });
    }
  },

  // Mettre à jour la section body selon la méthode
  updateBodySection() {
    const method = document.getElementById("httpMethod")?.value;
    const bodySection = document.getElementById("bodySection");

    if (bodySection) {
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        bodySection.style.display = "block";
      } else {
        bodySection.style.display = "none";
      }
    }
  },

  // Exécuter la démo Fetch
  async executeFetchDemo() {
    const resultsEl = document.getElementById("fetchResults");
    if (!resultsEl) return;

    const method = document.getElementById("httpMethod")?.value || "GET";
    const endpoint = document.getElementById("apiEndpoint")?.value || "users";
    const resourceId = document.getElementById("resourceId")?.value;
    const includeHeaders = document.getElementById("includeHeaders")?.checked;

    try {
      resultsEl.textContent = "Exécution de la requête...\n";

      let url = `${this.baseAPI}/${endpoint}`;
      if (resourceId) {
        url += `/${resourceId}`;
      }

      const options = {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      // Ajouter un body pour POST/PUT
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        options.body = JSON.stringify({
          title: "Titre de test",
          body: "Contenu de test",
          userId: 1,
        });
      }

      const startTime = performance.now();
      const response = await fetch(url, options);
      const endTime = performance.now();

      let result = `URL: ${url}
Méthode: ${method}
Statut: ${response.status} ${response.statusText}
Temps: ${(endTime - startTime).toFixed(2)}ms
`;

      if (includeHeaders) {
        result += "\nHeaders de réponse:\n";
        for (const [key, value] of response.headers.entries()) {
          result += `  ${key}: ${value}\n`;
        }
      }

      if (response.ok) {
        const data = await response.json();
        result += `\nDonnées reçues:\n${JSON.stringify(data, null, 2)}`;
      } else {
        result += `\nErreur: ${response.status} ${response.statusText}`;
      }

      resultsEl.textContent = result;
    } catch (error) {
      resultsEl.textContent = `Erreur lors de la requête:\n${error.message}`;
    }
  },

  // Afficher le code généré
  showGeneratedCode() {
    const method = document.getElementById("httpMethod")?.value || "GET";
    const endpoint = document.getElementById("apiEndpoint")?.value || "users";
    const resourceId = document.getElementById("resourceId")?.value;

    let url = `${this.baseAPI}/${endpoint}`;
    if (resourceId) {
      url += `/${resourceId}`;
    }

    let code = `// Code JavaScript généré\nfetch('${url}'`;

    if (method !== "GET") {
      code += `, {\n  method: '${method}',\n  headers: {\n    'Content-Type': 'application/json'\n  }`;

      if (method === "POST" || method === "PUT" || method === "PATCH") {
        code += `,\n  body: JSON.stringify({\n    title: 'Nouveau titre',\n    body: 'Contenu',\n    userId: 1\n  })`;
      }

      code += "\n}";
    }

    code += `)\n  .then(response => {\n    if (!response.ok) {\n      throw new Error(\`HTTP error! status: \${response.status}\`);\n    }\n    return response.json();\n  })\n  .then(data => {\n    console.log('Données reçues:', data);\n  })\n  .catch(error => {\n    console.error('Erreur:', error);\n  });`;

    const resultsEl = document.getElementById("fetchResults");
    if (resultsEl) {
      resultsEl.textContent = code;
    }
  },

  // Initialiser la démo async
  initializeAsyncDemo() {
    // Pas d'initialisation spéciale nécessaire
  },

  // Exécuter la démo async séquentielle
  async runAsyncDemo() {
    const stepsEl = document.getElementById("asyncSteps");
    const timingEl = document.getElementById("demoTiming");
    const resultsEl = document.getElementById("asyncResults");

    if (!stepsEl || !timingEl || !resultsEl) return;

    const startTime = performance.now();
    let userData, posts, comments;

    try {
      // Étape 1: Charger utilisateur
      this.updateStepStatus(1, "loading", "Chargement en cours...");
      const userResponse = await fetch(`${this.baseAPI}/users/1`);
      userData = await userResponse.json();
      this.updateStepStatus(
        1,
        "success",
        `Utilisateur "${userData.name}" chargé`
      );

      // Étape 2: Charger posts
      this.updateStepStatus(2, "loading", "Chargement des posts...");
      const postsResponse = await fetch(`${this.baseAPI}/users/1/posts`);
      posts = await postsResponse.json();
      this.updateStepStatus(2, "success", `${posts.length} posts chargés`);

      // Étape 3: Charger commentaires du premier post
      this.updateStepStatus(3, "loading", "Chargement des commentaires...");
      const commentsResponse = await fetch(
        `${this.baseAPI}/posts/${posts[0].id}/comments`
      );
      comments = await commentsResponse.json();
      this.updateStepStatus(
        3,
        "success",
        `${comments.length} commentaires chargés`
      );

      const endTime = performance.now();
      const totalTime = (endTime - startTime).toFixed(2);

      timingEl.innerHTML = `⏱️ Temps total (séquentiel): <strong>${totalTime}ms</strong>`;

      resultsEl.innerHTML = `Résultat final:
• Utilisateur: ${userData.name}
• Posts: ${posts.length} articles
• Commentaires: ${comments.length} commentaires sur "${posts[0].title}"

Premier commentaire:
"${comments[0].body}"
- ${comments[0].name} (${comments[0].email})`;
    } catch (error) {
      timingEl.textContent = `❌ Erreur: ${error.message}`;
      this.updateStepStatus(1, "error", "Erreur");
      this.updateStepStatus(2, "error", "Erreur");
      this.updateStepStatus(3, "error", "Erreur");
    }
  },

  // Exécuter la version parallèle
  async runParallelDemo() {
    const timingEl = document.getElementById("demoTiming");
    const resultsEl = document.getElementById("asyncResults");

    if (!timingEl || !resultsEl) return;

    const startTime = performance.now();

    try {
      // Charger tout en parallèle
      timingEl.textContent = "⚡ Chargement en parallèle...";

      const [userResponse, postsResponse, albumsResponse] = await Promise.all([
        fetch(`${this.baseAPI}/users/1`),
        fetch(`${this.baseAPI}/users/1/posts`),
        fetch(`${this.baseAPI}/users/1/albums`),
      ]);

      const [userData, posts, albums] = await Promise.all([
        userResponse.json(),
        postsResponse.json(),
        albumsResponse.json(),
      ]);

      const endTime = performance.now();
      const totalTime = (endTime - startTime).toFixed(2);

      timingEl.innerHTML = `⚡ Temps total (parallèle): <strong>${totalTime}ms</strong> - Beaucoup plus rapide !`;

      resultsEl.innerHTML = `Résultat parallèle:
• Utilisateur: ${userData.name}
• Posts: ${posts.length} articles  
• Albums: ${albums.length} albums

Gain de temps considérable grâce à Promise.all() !`;
    } catch (error) {
      timingEl.textContent = `❌ Erreur: ${error.message}`;
    }
  },

  // Mettre à jour le statut d'une étape
  updateStepStatus(stepNumber, status, message) {
    const step = document.querySelector(`[data-step="${stepNumber}"]`);
    if (!step) return;

    // Supprimer les anciennes classes
    step.classList.remove("loading", "success", "error");
    if (status) step.classList.add(status);

    const statusEl = step.querySelector(".step-status");
    if (statusEl) {
      statusEl.textContent = message;
    }
  },

  // Reset de la démo async
  resetAsyncDemo() {
    for (let i = 1; i <= 3; i++) {
      this.updateStepStatus(i, "", "En attente...");
      const step = document.querySelector(`[data-step="${i}"]`);
      if (step) {
        step.classList.remove("loading", "success", "error");
      }
    }

    const timingEl = document.getElementById("demoTiming");
    const resultsEl = document.getElementById("asyncResults");

    if (timingEl) timingEl.textContent = "";
    if (resultsEl) resultsEl.textContent = "";
  },

  // Initialiser la démo d'erreurs
  initializeErrorDemo() {
    // Pas d'initialisation spéciale nécessaire
  },

  // Simuler différents types d'erreurs
  async simulateNetworkError() {
    const displayEl = document.getElementById("errorDisplay");
    if (!displayEl) return;

    displayEl.innerHTML = `<strong>🌐 Simulation d'erreur réseau</strong>

Tentative de connexion à une URL inexistante...`;

    try {
      await fetch("https://url-qui-nexiste-absolument-pas.invalid/api/data");
    } catch (error) {
      displayEl.innerHTML += `

<strong>Erreur capturée:</strong>
Type: ${error.name}
Message: ${error.message}

<strong>Code de gestion:</strong>
try {
  await fetch('https://invalid-url.com/api');
} catch (error) {
  if (error instanceof TypeError) {
    console.log('Erreur réseau - vérifiez la connexion');
  }
}`;
    }
  },

  async simulate404Error() {
    const displayEl = document.getElementById("errorDisplay");
    if (!displayEl) return;

    displayEl.innerHTML = `<strong>4️⃣ Simulation d'erreur 404</strong>

Tentative d'accès à une ressource inexistante...`;

    try {
      const response = await fetch(`${this.baseAPI}/users/99999`);

      displayEl.innerHTML += `

<strong>Réponse reçue:</strong>
Statut: ${response.status} ${response.statusText}
OK: ${response.ok}

<strong>Gestion recommandée:</strong>
if (!response.ok) {
  if (response.status === 404) {
    console.log('Ressource non trouvée');
  }
  throw new Error(\`HTTP \${response.status}\`);
}`;
    } catch (error) {
      displayEl.innerHTML += `\nErreur: ${error.message}`;
    }
  },

  async simulate500Error() {
    const displayEl = document.getElementById("errorDisplay");
    if (!displayEl) return;

    displayEl.innerHTML = `<strong>5️⃣ Simulation d'erreur serveur</strong>

Les API publiques renvoient rarement des erreurs 500.
Voici comment les gérer:

<strong>Code de gestion:</strong>
try {
  const response = await fetch('/api/data');
  
  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error('Erreur serveur - Réessayez plus tard');
    }
    throw new Error(\`Erreur \${response.status}\`);
  }
  
} catch (error) {
  console.error('Erreur:', error.message);
}`;
  },

  async simulateTimeoutError() {
    const displayEl = document.getElementById("errorDisplay");
    if (!displayEl) return;

    displayEl.innerHTML = `<strong>⏱️ Simulation de timeout</strong>

Création d'une requête avec timeout...`;

    try {
      const controller = new AbortController();

      // Timeout très court pour forcer l'erreur
      setTimeout(() => controller.abort(), 100);

      await fetch(`${this.baseAPI}/users`, {
        signal: controller.signal,
      });
    } catch (error) {
      displayEl.innerHTML += `

<strong>Timeout simulé:</strong>
Type: ${error.name}
Message: ${error.message}

<strong>Code avec gestion de timeout:</strong>
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000); // 5 sec

try {
  const response = await fetch(url, {
    signal: controller.signal
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Requête interrompue (timeout)');
  }
}`;
    }
  },

  async simulateParseError() {
    const displayEl = document.getElementById("errorDisplay");
    if (!displayEl) return;

    displayEl.innerHTML = `<strong>📊 Simulation d'erreur de parsing JSON</strong>

Tentative de parser du JSON invalide...`;

    try {
      // Simuler une réponse avec JSON invalide
      const invalidJson = '{"name": "John", "age": 30,}'; // Virgule en trop
      JSON.parse(invalidJson);
    } catch (error) {
      displayEl.innerHTML += `

<strong>Erreur de parsing JSON:</strong>
Type: ${error.name}
Message: ${error.message}

<strong>Gestion recommandée:</strong>
try {
  const response = await fetch('/api/data');
  const data = await response.json();
} catch (error) {
  if (error instanceof SyntaxError) {
    console.log('Réponse JSON invalide');
  }
}`;
    }
  },

  // Initialiser la démo REST
  initializeRestDemo() {
    // Gestion du changement de méthode pour afficher/masquer le body
    const methodSelect = document.getElementById("restMethod");
    if (methodSelect) {
      methodSelect.addEventListener("change", () => {
        this.updateRestBodyVisibility();
      });
    }
  },

  // Mettre à jour la visibilité du body selon la méthode REST
  updateRestBodyVisibility() {
    const method = document.getElementById("restMethod")?.value;
    const bodySection = document.querySelector(".body-section");

    if (bodySection) {
      if (method === "POST" || method === "PUT" || method === "PATCH") {
        bodySection.style.display = "block";
      } else {
        bodySection.style.display = "none";
      }
    }
  },

  // Configuration du toggle de méthode
  setupMethodToggle() {
    // Appeler immédiatement pour définir l'état initial
    setTimeout(() => {
      this.updateBodySection();
      this.updateRestBodyVisibility();
    }, 100);
  },

  // Exécuter une requête REST
  async executeRestRequest() {
    const responseEl = document.getElementById("apiResponse");
    if (!responseEl) return;

    const method = document.getElementById("restMethod")?.value || "GET";
    const url =
      document.getElementById("restUrl")?.value || `${this.baseAPI}/users`;
    const headers = document.getElementById("requestHeaders")?.value || "";
    const body = document.getElementById("requestBody")?.value || "";

    try {
      responseEl.textContent = "Envoi de la requête...\n";

      // Parser les headers
      const requestHeaders = { "Content-Type": "application/json" };
      if (headers) {
        headers.split("\n").forEach((line) => {
          const [key, value] = line.split(":").map((s) => s.trim());
          if (key && value) {
            requestHeaders[key] = value;
          }
        });
      }

      // Options de la requête
      const options = {
        method: method,
        headers: requestHeaders,
      };

      // Ajouter le body si nécessaire
      if (
        (method === "POST" || method === "PUT" || method === "PATCH") &&
        body
      ) {
        options.body = body;
      }

      const startTime = performance.now();
      const response = await fetch(url, options);
      const endTime = performance.now();

      let result = `=== REQUÊTE ===
${method} ${url}
Temps de réponse: ${(endTime - startTime).toFixed(2)}ms

=== HEADERS ENVOYÉS ===
${Object.entries(requestHeaders)
  .map(([k, v]) => `${k}: ${v}`)
  .join("\n")}
`;

      if (options.body) {
        result += `\n=== BODY ENVOYÉ ===\n${options.body}\n`;
      }

      result += `\n=== RÉPONSE ===
Statut: ${response.status} ${response.statusText}
Content-Type: ${response.headers.get("content-type") || "non spécifié"}
`;

      if (response.ok) {
        try {
          const data = await response.json();
          result += `\n=== DONNÉES REÇUES ===\n${JSON.stringify(
            data,
            null,
            2
          )}`;
        } catch (e) {
          const text = await response.text();
          result += `\n=== CONTENU REÇU ===\n${text}`;
        }
      } else {
        result += `\n=== ERREUR ===\nLa requête a échoué avec le statut ${response.status}`;
      }

      responseEl.textContent = result;
    } catch (error) {
      responseEl.textContent = `=== ERREUR ===\n${error.message}`;
    }
  },

  // Afficher la commande cURL équivalente
  showCurlCommand() {
    const method = document.getElementById("restMethod")?.value || "GET";
    const url =
      document.getElementById("restUrl")?.value || `${this.baseAPI}/users`;
    const headers = document.getElementById("requestHeaders")?.value || "";
    const body = document.getElementById("requestBody")?.value || "";

    let curl = `curl -X ${method} "${url}"`;

    // Ajouter les headers
    if (headers) {
      headers.split("\n").forEach((line) => {
        const [key, value] = line.split(":").map((s) => s.trim());
        if (key && value) {
          curl += ` \\\n  -H "${key}: ${value}"`;
        }
      });
    }

    // Ajouter le Content-Type par défaut
    curl += ` \\\n  -H "Content-Type: application/json"`;

    // Ajouter le body si nécessaire
    if ((method === "POST" || method === "PUT" || method === "PATCH") && body) {
      curl += ` \\\n  -d '${body}'`;
    }

    const responseEl = document.getElementById("apiResponse");
    if (responseEl) {
      responseEl.textContent = `=== COMMANDE cURL ÉQUIVALENTE ===\n\n${curl}`;
    }
  },

  // Valider le JSON
  validateJSON() {
    const body = document.getElementById("requestBody")?.value || "";
    const responseEl = document.getElementById("apiResponse");

    if (!responseEl) return;

    if (!body.trim()) {
      responseEl.textContent =
        "=== VALIDATION JSON ===\n\nAucun contenu à valider.";
      return;
    }

    try {
      const parsed = JSON.parse(body);
      responseEl.textContent = `=== VALIDATION JSON ===\n\n✅ JSON VALIDE\n\nJSON formaté:\n${JSON.stringify(
        parsed,
        null,
        2
      )}`;
    } catch (error) {
      responseEl.textContent = `=== VALIDATION JSON ===\n\n❌ JSON INVALIDE\n\nErreur: ${error.message}\n\nVérifiez:\n- Les guillemets manquants\n- Les virgules en trop\n- Les accolades/crochets non fermés`;
    }
  },

  // Charger des exemples prédéfinis
  loadExample(type) {
    const methodEl = document.getElementById("restMethod");
    const urlEl = document.getElementById("restUrl");
    const headersEl = document.getElementById("requestHeaders");
    const bodyEl = document.getElementById("requestBody");

    if (!methodEl || !urlEl) return;

    const examples = {
      getUsers: {
        method: "GET",
        url: `${this.baseAPI}/users`,
        headers: "",
        body: "",
      },
      getUser: {
        method: "GET",
        url: `${this.baseAPI}/users/1`,
        headers: "",
        body: "",
      },
      createUser: {
        method: "POST",
        url: `${this.baseAPI}/users`,
        headers: "Authorization: Bearer your-token-here",
        body: JSON.stringify(
          {
            name: "John Doe",
            username: "johndoe",
            email: "john@example.com",
            phone: "1-770-736-8031",
            website: "johndoe.com",
          },
          null,
          2
        ),
      },
      updateUser: {
        method: "PUT",
        url: `${this.baseAPI}/users/1`,
        headers: "Authorization: Bearer your-token-here",
        body: JSON.stringify(
          {
            id: 1,
            name: "John Doe Updated",
            username: "johndoe_updated",
            email: "john.updated@example.com",
          },
          null,
          2
        ),
      },
      deleteUser: {
        method: "DELETE",
        url: `${this.baseAPI}/users/1`,
        headers: "Authorization: Bearer your-token-here",
        body: "",
      },
    };

    const example = examples[type];
    if (example) {
      methodEl.value = example.method;
      urlEl.value = example.url;
      if (headersEl) headersEl.value = example.headers;
      if (bodyEl) bodyEl.value = example.body;

      // Mettre à jour la visibilité du body
      this.updateRestBodyVisibility();
    }
  },
};

// Rendre le module AjaxDemo globalement accessible
window.AjaxDemo = AjaxDemo;
