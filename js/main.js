// Hero: sem intro — a cena 3D do armário (quando existe, hoje só no
// desktop) se monta sozinha assim que a página carrega.
(function () {
  var heroLayer = document.getElementById("heroLayer");
  var heroSceneDesktop = document.getElementById("heroSceneDesktop");
  var heroSceneMobile = document.getElementById("heroSceneMobile");
  var mobileSceneQuery = window.matchMedia && window.matchMedia("(max-width: 640px)");
  function activeHeroScene() {
    return mobileSceneQuery && mobileSceneQuery.matches ? heroSceneMobile : heroSceneDesktop;
  }
  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!heroLayer) return;

  var heroScene = activeHeroScene();
  function startHeroScene() {
    if (!heroScene) return;
    window.setTimeout(function () { heroScene.classList.add("is-assembling"); }, 250);
    window.setTimeout(function () { heroScene.classList.add("is-filled"); }, 1600);
    window.setTimeout(function () { heroScene.classList.add("is-done"); }, 3450);
  }
  if (!prefersReducedMotion) {
    // Com a abertura do logo em andamento, a cena do armário espera ela acabar.
    if (document.documentElement.classList.contains("has-logo-intro")) {
      window.addEventListener("logointro:done", startHeroScene, { once: true });
    } else {
      startHeroScene();
    }
  } else if (heroScene) {
    heroScene.classList.add("is-done");
  }

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

// Efeito de aproximação no banner do hero: ao passar o mouse sobre uma
// peça da foto, a imagem dá um zoom nascendo exatamente daquele ponto
// (transform-origin dinâmico), como se o usuário andasse até ali pra ver
// o detalhe de perto. Ignorado em touch e quando o usuário prefere menos
// movimento.
(function () {
  var heroSection = document.querySelector(".hero-inner");
  var heroImg = document.querySelector(".hero-banner-bg img");
  var heroContent = document.querySelector(".hero-content");
  var heroSpotlight = document.getElementById("heroSpotlight");
  if (!heroSection || !heroImg) return;

  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (prefersReducedMotion || !hasFinePointer) return;

  var REST_SCALE = 1.08;
  var APPROACH_SCALE = 1.32; // zoom ao "chegar perto" da peça sob o cursor
  var MAX_PAN = 10; // px de deslocamento do texto (parallax oposto, reforça profundidade)
  var ticking = false;
  var hovering = false;
  var lastX = 0.5;
  var lastY = 0.5;

  function update() {
    ticking = false;
    var scale = hovering ? APPROACH_SCALE : REST_SCALE;
    var originX = hovering ? lastX * 100 : 50;
    var originY = hovering ? lastY * 100 : 50;
    heroImg.style.transformOrigin = originX + "% " + originY + "%";
    heroImg.style.transform = "scale(" + scale + ")";
    if (heroContent) {
      var panX = hovering ? (lastX - 0.5) * MAX_PAN : 0;
      var panY = hovering ? (lastY - 0.5) * MAX_PAN : 0;
      heroContent.style.transform = "translate(" + panX + "px, " + panY + "px)";
    }
    if (heroSpotlight) {
      heroSpotlight.style.setProperty("--spot-x", originX + "%");
      heroSpotlight.style.setProperty("--spot-y", originY + "%");
      heroSpotlight.classList.toggle("is-active", hovering);
    }
  }

  function onMouseMove(ev) {
    var rect = heroSection.getBoundingClientRect();
    if (rect.height === 0) return;
    hovering = true;
    lastX = (ev.clientX - rect.left) / rect.width;
    lastY = (ev.clientY - rect.top) / rect.height;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function onMouseLeave() {
    hovering = false;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  heroSection.addEventListener("mousemove", onMouseMove);
  heroSection.addEventListener("mouseleave", onMouseLeave);
})();

// Ambientes no mobile: cards que empilham na rolagem, como um fichário —
// mesmo mecanismo do "Nosso Time" do site da academia. Cada card gruda no
// topo (position: sticky via CSS) e o card seguinte sobe por cima dele; o
// de baixo encolhe e escurece, dando a sensação de pilha. Só roda dentro
// da media query mobile — em telas maiores os cards já ficam lado a lado
// na grade e o efeito é desligado.
(function () {
  var section = document.getElementById("ambientes");
  if (!section) return;

  var cards = Array.prototype.slice.call(section.querySelectorAll(".servico-card"));
  if (cards.length === 0) return;

  var mq = window.matchMedia("(max-width: 639px)");
  var TOPO = 90; // mesmo valor do "top" do sticky no CSS (.servico-card)
  var naturais = [];
  var active = false;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function medirPosicoesNaturais() {
    return cards.map(function (c) {
      var antes = c.style.position;
      c.style.position = "static";
      var y = c.getBoundingClientRect().top + window.scrollY;
      c.style.position = antes;
      return y;
    });
  }

  function limpar() {
    cards.forEach(function (c) {
      c.style.transform = "";
      c.style.filter = "";
      c.style.zIndex = "";
    });
  }

  var ticking = false;

  function update() {
    ticking = false;
    if (!active) return;
    cards.forEach(function (c, i) {
      var vao = c.offsetHeight + 16;
      var preso = clamp((window.scrollY + TOPO - naturais[i]) / vao, 0, 1);
      c.style.transform = "scale(" + (1 - preso * 0.08) + ")";
      c.style.filter = "brightness(" + (1 - preso * 0.35) + ")";
      c.style.zIndex = i;
    });
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function syncMode() {
    active = mq.matches;
    if (active) {
      naturais = medirPosicoesNaturais();
      requestUpdate();
    } else {
      limpar();
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", function () {
    if (active) naturais = medirPosicoesNaturais();
    requestUpdate();
  });
  if (mq.addEventListener) mq.addEventListener("change", syncMode);
  else if (mq.addListener) mq.addListener(syncMode);

  syncMode();
})();

// Botão flutuante do WhatsApp: só aparece depois que o usuário rola até a
// seção Sobre.
(function () {
  var whatsappFloat = document.getElementById("whatsapp-float");
  var sobre = document.getElementById("sobre");
  if (!whatsappFloat || !sobre) return;

  if (!("IntersectionObserver" in window)) {
    whatsappFloat.hidden = false;
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          whatsappFloat.hidden = false;
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -60% 0px" }
  );

  observer.observe(sobre);
})();

// Revela ao rolar: fade + leve translateY para as seções do site.
(function () {
  var elements = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (elements.length === 0) return;

  if (!("IntersectionObserver" in window)) {
    elements.forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach(function (el) {
    observer.observe(el);
  });
})();

// Scrollspy: destaca no cabeçalho o link correspondente à seção na tela.
(function () {
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a[href^='#']"));
  if (navLinks.length === 0 || !("IntersectionObserver" in window)) return;

  var linkByTarget = {};
  var sections = [];
  navLinks.forEach(function (link) {
    var id = link.getAttribute("href").slice(1);
    var section = document.getElementById(id);
    if (!section) return;
    linkByTarget[id] = link;
    sections.push(section);
  });
  if (sections.length === 0) return;

  function setActive(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", linkByTarget[id] === link);
    });
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
})();
