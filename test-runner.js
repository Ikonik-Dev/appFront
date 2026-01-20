// Script de test automatisé pour l'application RNCP DWWM 2023
// À exécuter dans la console du navigateur

(function () {
  "use strict";

  const TestRunner = {
    results: [],
    startTime: null,

    log(message, type = "info") {
      const entry = {
        timestamp: new Date().toISOString(),
        type,
        message,
      };
      this.results.push(entry);

      const prefix =
        {
          success: "✅",
          error: "❌",
          warning: "⚠️",
          info: "ℹ️",
        }[type] || "ℹ️";

      console.log(`${prefix} [TEST] ${message}`);
    },

    async run() {
      this.startTime = performance.now();
      this.log("🚀 Starting comprehensive application tests...");

      try {
        await this.testScriptLoading();
        await this.testApplicationStartup();
        await this.testNavigation();
        await this.testAccessibility();
        await this.testPerformance();
        await this.testErrorHandling();
        await this.testCacheSystem();
        await this.testAnimations();

        this.generateReport();
      } catch (error) {
        this.log(`Fatal error during testing: ${error.message}`, "error");
      }
    },

    async testScriptLoading() {
      this.log("📦 Testing script loading...");

      const requiredGlobals = [
        "APP_CONFIG",
        "APP_STATE",
        "DEBUG",
        "DOMUtils",
        "RouterManager",
        "Navigation",
        "AnimationUtils",
        "StorageUtils",
        "ValidationUtils",
        "PerformanceUtils",
      ];

      const missing = requiredGlobals.filter(
        (global) => typeof window[global] === "undefined"
      );

      if (missing.length === 0) {
        this.log("All required scripts loaded successfully", "success");
      } else {
        this.log(`Missing scripts: ${missing.join(", ")}`, "error");
      }

      // Test configuration
      if (window.APP_CONFIG && window.APP_CONFIG.version) {
        this.log(
          `Configuration loaded - Version: ${window.APP_CONFIG.version}`,
          "success"
        );
      } else {
        this.log("Configuration missing or invalid", "error");
      }
    },

    async testApplicationStartup() {
      this.log("🚀 Testing application startup...");

      if (typeof window.app !== "undefined") {
        this.log("Application instance found", "success");

        if (window.app.isReady()) {
          this.log("Application is ready", "success");
        } else {
          this.log("Application not ready", "warning");
        }

        // Test components
        const components = window.app.components || {};
        Object.keys(components).forEach((name) => {
          if (components[name]) {
            this.log(`Component "${name}" initialized`, "success");
          } else {
            this.log(`Component "${name}" missing`, "error");
          }
        });
      } else {
        this.log("Application instance not found", "error");
      }
    },

    async testNavigation() {
      this.log("🧭 Testing navigation system...");

      const router = window.router || window.RouterInstance;
      if (!router) {
        this.log("Router not found", "error");
        return;
      }

      const testPages = ["home", "about", "html", "css", "javascript"];

      for (const pageId of testPages) {
        try {
          await router.navigateTo(pageId, false);
          this.log(`Navigation to "${pageId}" successful`, "success");

          // Petit délai pour laisser la page se charger
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          this.log(
            `Navigation to "${pageId}" failed: ${error.message}`,
            "error"
          );
        }
      }

      // Test cache
      if (router.getCacheStats) {
        const stats = router.getCacheStats();
        this.log(
          `Cache contains ${stats.pages} pages (${Math.round(
            stats.totalSize / 1024
          )}KB)`,
          "info"
        );
      }
    },

    async testAccessibility() {
      this.log("♿ Testing accessibility features...");

      // Test ARIA attributes
      const ariaElements = document.querySelectorAll(
        "[aria-label], [aria-labelledby], [aria-describedby], [role]"
      );
      this.log(
        `Found ${ariaElements.length} elements with ARIA attributes`,
        ariaElements.length > 0 ? "success" : "warning"
      );

      // Test landmarks
      const landmarks = document.querySelectorAll(
        'main, nav, header, footer, aside, [role="banner"], [role="navigation"], [role="main"]'
      );
      this.log(
        `Found ${landmarks.length} semantic landmarks`,
        landmarks.length > 0 ? "success" : "warning"
      );

      // Test keyboard navigation
      const focusableElements = document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      this.log(`Found ${focusableElements.length} focusable elements`, "info");

      // Test skip links
      const skipLinks = document.querySelectorAll('a[href^="#"]:first-child');
      if (skipLinks.length > 0) {
        this.log("Skip links found", "success");
      } else {
        this.log("No skip links found", "warning");
      }
    },

    async testPerformance() {
      this.log("⚡ Testing performance...");

      // Test animation system
      if (window.AnimationUtils && window.AnimationUtils.getAnimationStats) {
        const animStats = window.AnimationUtils.getAnimationStats();
        this.log(`${animStats.activeCount} active animations`, "info");

        if (animStats.activeCount < 10) {
          this.log("Animation count is reasonable", "success");
        } else {
          this.log("High number of active animations", "warning");
        }
      }

      // Test memory usage (approximation)
      if (performance.memory) {
        const memoryMB = Math.round(
          performance.memory.usedJSHeapSize / 1024 / 1024
        );
        this.log(
          `Memory usage: ${memoryMB}MB`,
          memoryMB < 50 ? "success" : "warning"
        );
      }

      // Test DOM size
      const elementCount = document.querySelectorAll("*").length;
      this.log(
        `DOM elements: ${elementCount}`,
        elementCount < 1000 ? "success" : "warning"
      );

      // Test loading time
      if (performance.timing) {
        const loadTime =
          performance.timing.loadEventEnd - performance.timing.navigationStart;
        this.log(
          `Page load time: ${loadTime}ms`,
          loadTime < 3000 ? "success" : "warning"
        );
      }
    },

    async testErrorHandling() {
      this.log("🛡️ Testing error handling...");

      // Test with invalid navigation
      const router = window.router || window.RouterInstance;
      if (router) {
        try {
          await router.navigateTo("nonexistent-page", false);
          this.log("Invalid navigation handled gracefully", "success");
        } catch (error) {
          this.log("Error handling needs improvement", "warning");
        }
      }

      // Test with missing elements
      try {
        const missingElement = document.getElementById("nonexistent-element");
        if (window.DOMUtils) {
          window.DOMUtils.addClass(missingElement, "test-class");
        }
        this.log("DOM utilities handle missing elements", "success");
      } catch (error) {
        this.log("DOM error handling could be improved", "warning");
      }
    },

    async testCacheSystem() {
      this.log("💾 Testing cache system...");

      const router = window.router || window.RouterInstance;
      if (router && router.getCacheStats) {
        const initialStats = router.getCacheStats();

        // Test cache clear
        if (router.clearCache) {
          router.clearCache();
          const clearedStats = router.getCacheStats();

          if (clearedStats.pages === 0) {
            this.log("Cache clear functionality works", "success");
          } else {
            this.log("Cache clear might not work properly", "warning");
          }
        }

        // Test cache rebuild
        await router.navigateTo("home", false);
        const rebuiltStats = router.getCacheStats();

        if (rebuiltStats.pages > 0) {
          this.log("Cache rebuild works correctly", "success");
        } else {
          this.log("Cache rebuild issues detected", "warning");
        }
      }
    },

    async testAnimations() {
      this.log("🎬 Testing animation system...");

      if (window.AnimationUtils) {
        // Test animation capabilities
        const testElement = document.createElement("div");
        testElement.style.cssText =
          "position: absolute; top: -9999px; left: -9999px;";
        document.body.appendChild(testElement);

        try {
          await window.AnimationUtils.animate(
            testElement,
            "animate-fade-in",
            100
          );
          this.log("Animation system works correctly", "success");
        } catch (error) {
          this.log(`Animation error: ${error.message}`, "warning");
        } finally {
          document.body.removeChild(testElement);
        }

        // Test animation cleanup
        if (window.AnimationUtils.cancelAllAnimations) {
          window.AnimationUtils.cancelAllAnimations();
          this.log("Animation cleanup available", "success");
        }
      }
    },

    generateReport() {
      const endTime = performance.now();
      const duration = Math.round(endTime - this.startTime);

      this.log("📊 Generating test report...");

      const summary = this.results.reduce((acc, result) => {
        acc[result.type] = (acc[result.type] || 0) + 1;
        return acc;
      }, {});

      const report = {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        summary,
        results: this.results,
        browser: {
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          online: navigator.onLine,
        },
      };

      console.log("📋 TEST REPORT");
      console.log("=".repeat(50));
      console.log(`📅 Time: ${report.timestamp}`);
      console.log(`⏱️ Duration: ${report.duration}`);
      console.log(
        `📊 Results: ${summary.success || 0} success, ${
          summary.error || 0
        } errors, ${summary.warning || 0} warnings`
      );
      console.log("=".repeat(50));

      // Store report globally for access
      window.lastTestReport = report;

      this.log(`Test completed in ${duration}ms`, "info");
      this.log(
        `Results: ${summary.success || 0} ✅, ${summary.error || 0} ❌, ${
          summary.warning || 0
        } ⚠️`,
        "info"
      );

      if ((summary.error || 0) === 0) {
        this.log("🎉 All tests passed!", "success");
      } else {
        this.log("🔧 Some issues found - check details above", "warning");
      }

      return report;
    },
  };

  // Expose test runner globally
  window.TestRunner = TestRunner;

  // Auto-run if requested
  if (window.location.search.includes("autotest=true")) {
    setTimeout(() => TestRunner.run(), 1000);
  }

  console.log("🧪 Test Runner loaded. Use TestRunner.run() to start tests.");
})();
