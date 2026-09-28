// Intro "Entre e acenda a luz": cena escura de entrada, texto surge com
// uma animação simples (CSS), e um único clique no interruptor acende a
// luz e revela a Casa Di Lorenzo por trás, com um flash.
(function () {
  var introLayer = document.getElementById("introLayer");
  var heroLayer = document.getElementById("heroLayer");
  var lightSwitch = document.getElementById("lightSwitch");
  var lightFlash = document.getElementById("lightFlash");
  var header = document.querySelector(".header");
  var skipIntro = document.getElementById("skipIntro");

  if (!introLayer || !heroLayer) return;

  // Toda atualização de página recomeça do topo, com a intro do zero — sem
  // isso, o navegador tenta restaurar a posição de rolagem anterior, mas o
  // scroll-lock abaixo prende o usuário ali, fora do alcance do interruptor.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  var REVEAL_DURATION = 750; // ms — duração do corte de luz ao clicar no interruptor
  var HERO_CLIP_MAX = 150; // % — mesmo valor usado em .hero-layer.is-revealed no CSS

  var revealed = false;
  var revealing = false;

  function preventScroll(ev) {
    ev.preventDefault();
  }

  function lockScroll() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
  }

  function unlockScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    window.removeEventListener("wheel", preventScroll, { passive: false });
    window.removeEventListener("touchmove", preventScroll, { passive: false });
  }

  lockScroll();

  // Acende a luz: flash instantâneo no interruptor + máscara circular de
  // clip-path nascendo a partir do ponto do interruptor até cobrir a tela.
  function triggerReveal() {
    if (revealed || revealing) return;
    revealing = true;

    if (lightFlash) {
      lightFlash.classList.remove("is-flashing");
      void lightFlash.offsetWidth; // reinicia a animação
      lightFlash.classList.add("is-flashing");
    }
    if (lightSwitch) lightSwitch.style.pointerEvents = "none";
    if (introLayer) introLayer.style.pointerEvents = "none";

    if (heroLayer) {
      heroLayer.style.transition = "clip-path " + REVEAL_DURATION + "ms cubic-bezier(0.65, 0, 0.35, 1)";
      heroLayer.classList.add("is-revealed");
      heroLayer.style.clipPath = "circle(" + HERO_CLIP_MAX + "% at 82% 28%)";
      heroLayer.style.pointerEvents = "auto";
    }

    window.setTimeout(function () {
      revealed = true;
      revealing = false;
      unlockScroll();
      if (header) header.classList.add("is-visible");
      if (heroLayer) {
        heroLayer.style.transition = "";
        heroLayer.style.clipPath = "";
      }
    }, REVEAL_DURATION);
  }

  if (lightSwitch) {
    lightSwitch.addEventListener("click", function () {
      if (!revealed && !revealing) triggerReveal();
    });
  }

  if (skipIntro) {
    skipIntro.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (!revealed && !revealing) triggerReveal();
    });
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
