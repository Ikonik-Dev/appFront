/* =============================================
   SCRIPT DE COLORATION SYNTAXIQUE AUTOMATIQUE
   ============================================= */

/**
 * Applique automatiquement la coloration syntaxique aux blocs de code
 */
function applySyntaxHighlighting() {
  // Vérifier si on est sur la page lexique-javascript (exclue de la colorisation)
  if (
    window.location.pathname.includes("lexique-javascript.html") ||
    document.title.includes("Lexique JavaScript") ||
    window.location.hash === "#lexique-javascript" ||
    (window.APP_STATE &&
      window.APP_STATE.currentPage === "lexique-javascript") ||
    document.body.classList.contains("no-syntax-highlighting") ||
    document.querySelector(".no-auto-highlight")
  ) {
    console.log("🚫 Syntax highlighting désactivé pour cette page");
    return; // Arrêter l'exécution pour cette page
  }

  // Sélectionner tous les blocs de code dans toute l'application (en excluant les zones protégées)
  const codeBlocks = document.querySelectorAll(
    ".code-example code:not(.no-highlight), .course-content code:not(.no-highlight), .code-area code:not(.no-highlight), .comparison-side code:not(.no-highlight)"
  );

  // Exclure les blocs dans des conteneurs marqués comme non-highlightables
  const validCodeBlocks = Array.from(codeBlocks).filter((block) => {
    return !block.closest(".no-auto-highlight, .no-syntax-highlighting");
  });

  validCodeBlocks.forEach((codeBlock) => {
    // Éviter de traiter plusieurs fois le même bloc
    if (codeBlock.classList.contains("syntax-highlighted")) return;

    let content = codeBlock.innerHTML;

    // Détecter le type de contenu
    const isHTML = content.includes("&lt;") || content.includes("<");
    const isCSS = content.includes("{") && content.includes("}");
    const isJS =
      content.includes("function") ||
      content.includes("let ") ||
      content.includes("const ") ||
      content.includes("var ");

    if (isHTML) {
      content = highlightHTML(content);
    } else if (isCSS) {
      content = highlightCSS(content);
    } else if (isJS) {
      content = highlightJavaScript(content);
    }

    codeBlock.innerHTML = content;
    codeBlock.classList.add("syntax-highlighted");
  });
}

/**
 * Coloration syntaxique pour HTML
 */
function highlightHTML(code) {
  return (
    code
      // Commentaires HTML
      .replace(/(&lt;!--.*?--&gt;)/g, '<span class="html-comment">$1</span>')
      // Doctype
      .replace(
        /(&lt;!DOCTYPE\s+[^&gt;]*&gt;)/gi,
        '<span class="html-doctype">$1</span>'
      )
      // Balises avec attributs
      .replace(
        /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z-]+(?:=(?:"[^"]*"|'[^']*'|[^\s&gt;]+))?)*\s*)(&gt;)/g,
        function (match, openBracket, tagName, attributes, closeBracket) {
          let highlightedAttrs = attributes.replace(
            /\s+([a-zA-Z-]+)(=)((?:"[^"]*"|'[^']*'|[^\s&gt;]+))/g,
            ' <span class="html-attribute">$1</span><span class="html-operator">$2</span><span class="html-value">$3</span>'
          );
          return `<span class="html-bracket">${openBracket}</span><span class="html-tag">${tagName}</span>${highlightedAttrs}<span class="html-bracket">${closeBracket}</span>`;
        }
      )
      // Balises simples sans attributs
      .replace(
        /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)(\s*&gt;)/g,
        '<span class="html-bracket">$1</span><span class="html-tag">$2</span><span class="html-bracket">$3</span>'
      )
  );
}

/**
 * Coloration syntaxique pour CSS
 */
function highlightCSS(code) {
  return (
    code
      // Commentaires CSS
      .replace(/(\/\*.*?\*\/)/gs, '<span class="css-comment">$1</span>')
      // Sélecteurs (classes, ids, éléments)
      .replace(/^([^{]*?)(\s*{)/gm, function (match, selector, bracket) {
        let highlightedSelector = selector
          .replace(/(\.[a-zA-Z-_]+)/g, '<span class="css-class">$1</span>')
          .replace(/(#[a-zA-Z-_]+)/g, '<span class="css-id">$1</span>')
          .replace(
            /\b([a-zA-Z]+)(?=[\s\.,#:])/g,
            '<span class="css-element">$1</span>'
          )
          .replace(/(:+[a-zA-Z-]+)/g, '<span class="css-pseudo">$1</span>');
        return highlightedSelector + bracket;
      })
      // Propriétés CSS
      .replace(
        /(\s+)([a-zA-Z-]+)(\s*:)/g,
        '$1<span class="css-property">$2</span><span class="css-operator">$3</span>'
      )
      // Valeurs CSS
      .replace(
        /(:\s*)([^;]+)(;)/g,
        '$1<span class="css-value">$2</span><span class="css-operator">$3</span>'
      )
      // Nombres et unités
      .replace(
        /\b(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|deg|s|ms)?\b/g,
        '<span class="css-number">$1</span><span class="css-unit">$2</span>'
      )
      // Fonctions CSS
      .replace(
        /\b(rgb|rgba|hsl|hsla|url|calc|var|linear-gradient|radial-gradient|clamp|min|max)\(/g,
        '<span class="css-function">$1</span><span class="css-operator">(</span>'
      )
      // Variables CSS
      .replace(/(--[a-zA-Z-]+)/g, '<span class="css-variable">$1</span>')
  );
}

/**
 * Coloration syntaxique pour JavaScript
 */
function highlightJavaScript(code) {
  return (
    code
      // Commentaires
      .replace(/(\/\/.*?$)/gm, '<span class="js-comment">$1</span>')
      .replace(/(\/\*.*?\*\/)/gs, '<span class="js-comment">$1</span>')
      // Chaînes de caractères (template literals, strings)
      .replace(/(`([^`\\]|\\.)*`)/g, '<span class="js-template">$1</span>')
      .replace(
        /('([^'\\]|\\.)*'|"([^"\\]|\\.)*")/g,
        '<span class="js-string">$1</span>'
      )
      // Mots-clés JavaScript
      .replace(
        /\b(const|let|var|function|class|if|else|for|while|do|break|continue|return|try|catch|finally|throw|async|await|import|export|default|from|extends|super|this|new|typeof|instanceof|in|of)\b/g,
        '<span class="js-keyword">$1</span>'
      )
      // Valeurs spéciales
      .replace(
        /\b(null|undefined|true|false)\b/g,
        '<span class="js-literal">$1</span>'
      )
      // Nombres
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="js-number">$1</span>')
      // Méthodes et fonctions
      .replace(
        /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
        '<span class="js-function">$1</span><span class="js-operator">(</span>'
      )
      // Propriétés d'objets
      .replace(
        /\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
        '<span class="js-operator">.</span><span class="js-property">$1</span>'
      )
      // Opérateurs
      .replace(
        /(\+\+|--|=>|===|!==|==|!=|<=|>=|&&|\|\||[\+\-\*\/\%\=\<\>\!\&\|\?\:])/g,
        '<span class="js-operator">$1</span>'
      )
  );
}

/**
 * Initialiser la coloration syntaxique quand le DOM est prêt
 */
function initSyntaxHighlighting() {
  // Appliquer immédiatement si le DOM est déjà chargé
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySyntaxHighlighting);
  } else {
    applySyntaxHighlighting();
  }

  // Observer les changements dans le DOM pour les nouvelles pages
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Vérifier si de nouveaux blocs de code ont été ajoutés
        const hasNewCodeBlocks = Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            node.querySelector &&
            node.querySelector(
              ".code-example code, .course-content code, .code-area code, .comparison-side code"
            )
        );

        if (hasNewCodeBlocks) {
          setTimeout(applySyntaxHighlighting, 100);
        }
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Exposer les fonctions globalement
window.applySyntaxHighlighting = applySyntaxHighlighting;
window.initSyntaxHighlighting = initSyntaxHighlighting;

// Auto-initialisation
initSyntaxHighlighting();
