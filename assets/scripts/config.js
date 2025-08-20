/* =============================================
   VARIABLES GLOBALES ET CONFIGURATION
   ============================================= */

// Marquer que config.js est chargé
window.CONFIG_LOADED = true;

// Configuration de l'application
const APP_CONFIG = {
  name: "RNCP DWWM 2023 - Front-End Demo",
  version: "1.0.0",
  author: "Votre Nom",
  pages: [
    { id: "home", title: "Accueil", icon: "🏠" },
    { id: "about", title: "À propos", icon: "ℹ️" },
    { id: "html", title: "HTML", icon: "📝" },
    { id: "css", title: "CSS", icon: "🎨" },
    { id: "javascript", title: "JavaScript", icon: "⚡" },
    { id: "responsive", title: "Responsive", icon: "📱" },
    { id: "forms", title: "Formulaires", icon: "📋" },
    { id: "ajax", title: "AJAX", icon: "🔄" },
    { id: "accessibility", title: "Accessibilité", icon: "♿" },
    { id: "dashboard", title: "Dashboard", icon: "📊" },
  ],
  animations: {
    duration: 300,
    easing: "ease-in-out",
  },
};

// Variables d'état globales
const APP_STATE = {
  currentPage: "home",
  isLoading: false,
  notifications: [],
  user: {
    preferences: {
      theme: "glassmorphism",
      animations: true,
      reducedMotion: false,
    },
  },
};

// Sélecteurs DOM fréquemment utilisés
const DOM_ELEMENTS = {
  body: document.body,
  navigation: null,
  mainContent: null,
  pageTitle: null,
  loadingSpinner: null,
  notificationContainer: null,
};

// Cache pour les performances
const CACHE = {
  pages: new Map(),
  templates: new Map(),
  assets: new Map(),
};

// Utilitaires de debug
const DEBUG = {
  enabled: true,
  log: (...args) => {
    if (DEBUG.enabled) {
      console.log("🚀 [APP]", ...args);
    }
  },
  warn: (...args) => {
    if (DEBUG.enabled) {
      console.warn("⚠️ [APP]", ...args);
    }
  },
  error: (...args) => {
    if (DEBUG.enabled) {
      console.error("❌ [APP]", ...args);
    }
  },
};

// Event listeners globaux
const EVENT_LISTENERS = {
  navigation: [],
  scroll: [],
  resize: [],
  keydown: [],
};

// Constantes pour les animations
const ANIMATION_CLASSES = {
  fadeIn: "animate-fade-in",
  slideInLeft: "animate-slide-in-left",
  slideInRight: "animate-slide-in-right",
  scaleIn: "animate-scale-in",
  bounceIn: "animate-bounce-in",
  pulse: "animate-pulse",
  glow: "animate-glow",
};

// Constantes pour les breakpoints responsive
const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1200,
};

// Configuration des notifications
const NOTIFICATION_TYPES = {
  success: { class: "alert-success", icon: "✅", duration: 3000 },
  warning: { class: "alert-warning", icon: "⚠️", duration: 4000 },
  error: { class: "alert-error", icon: "❌", duration: 5000 },
  info: { class: "alert-info", icon: "ℹ️", duration: 3000 },
};

// Patterns regex utiles
const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(?:\+33|0)[1-9](?:[.-\s]?\d{2}){4}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  password:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

// Messages d'erreur standardisés
const ERROR_MESSAGES = {
  network: "Erreur de connexion réseau",
  validation: "Données invalides",
  notFound: "Ressource non trouvée",
  unauthorized: "Accès non autorisé",
  server: "Erreur serveur",
  generic: "Une erreur inattendue s'est produite",
};

// Configuration locale
const LOCALE_CONFIG = {
  language: "fr",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "HH:mm",
  currency: "EUR",
  numberFormat: {
    decimal: ",",
    thousands: " ",
  },
};

/* =============================================
   EXPORT POUR MODULES
   ============================================= */

// Exposition globale des variables pour le navigateur
if (typeof window !== "undefined") {
  window.APP_CONFIG = APP_CONFIG;
  window.APP_STATE = APP_STATE;
  window.DOM_ELEMENTS = DOM_ELEMENTS;
  window.CACHE = CACHE;
  window.DEBUG = DEBUG;
  window.EVENT_LISTENERS = EVENT_LISTENERS;
  window.ANIMATION_CLASSES = ANIMATION_CLASSES;
  window.BREAKPOINTS = BREAKPOINTS;
  window.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
  window.REGEX_PATTERNS = REGEX_PATTERNS;
  window.ERROR_MESSAGES = ERROR_MESSAGES;
  window.LOCALE_CONFIG = LOCALE_CONFIG;
}

// Export des configurations pour utilisation dans d'autres modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    APP_CONFIG,
    APP_STATE,
    DOM_ELEMENTS,
    CACHE,
    DEBUG,
    EVENT_LISTENERS,
    ANIMATION_CLASSES,
    BREAKPOINTS,
    NOTIFICATION_TYPES,
    REGEX_PATTERNS,
    ERROR_MESSAGES,
    LOCALE_CONFIG,
  };
}
