// Intro "Entre e acenda a luz": a 1ª puxada (maçaneta) abre o texto e dá
// profundidade à cena (simulando avançar pra dentro da casa), travando num
// checkpoint na metade da trilha. Ali aparece um interruptor — um clique
// único acende a luz e revela a Casa Di Lorenzo por trás, com um flash.
(function () {
  var cableText = document.getElementById("introCableText");
  var railTrack = document.querySelector(".drag-rail");
  var dragHandle = document.getElementById("dragHandle");
  var dragHandleRingFill = document.getElementById("dragHandleRingFill");
  var dragRailFill = document.getElementById("dragRailFill");
  var dragRailMark = document.getElementById("dragRailMark");
  var dragHint = document.getElementById("dragHint");
  var dragHintLabel = document.getElementById("dragHintLabel");
  var introLayer = document.getElementById("introLayer");
  var introDoorBg = document.getElementById("introDoorBg");
  var heroLayer = document.getElementById("heroLayer");
  var lightSwitch = document.getElementById("lightSwitch");
  var lightFlash = document.getElementById("lightFlash");
  var header = document.querySelector(".header");
  var skipIntro = document.getElementById("skipIntro");

  if (!cableText || !railTrack || !dragHandle) return;

  var CHECKPOINT_VALUE = 100; // a 1ª (única) puxada vai até o fim da trilha, liberando o interruptor
  var REVEAL_DURATION = 750; // ms — duração do corte de luz ao clicar no interruptor
  var HERO_CLIP_MAX = 150; // % — mesmo valor usado em .hero-layer.is-revealed no CSS
  var RING_CIRCUMFERENCE = 2 * Math.PI * 18; // deve bater com o r="18" do círculo no SVG
  var MAX_DEPTH_SCALE = 1.18; // "dolly zoom" do fundo enquanto arrasta

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  var SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@*";
  var scrambleStop = null;

  function scrambleLabel(finalText) {
    if (!dragHintLabel) return;
    if (scrambleStop) scrambleStop();
    var frame = 0;
    var rafId;
    function spin() {
      var locked = Math.floor(frame / 3);
      var out = "";
      for (var i = 0; i < finalText.length; i++) {
        out += i < locked || finalText[i] === " " ? finalText[i] : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }
      dragHintLabel.textContent = out;
      frame++;
      if (locked <= finalText.length) rafId = requestAnimationFrame(spin);
    }
    spin();
    scrambleStop = function () {
      cancelAnimationFrame(rafId);
      scrambleStop = null;
    };
  }

  function positionRailMark() {
    if (!dragRailMark) return;
    var railTravel = Math.max(railTrack.clientHeight - dragHandle.offsetHeight, 0);
    var centerY = (CHECKPOINT_VALUE / 100) * railTravel + dragHandle.offsetHeight / 2;
    dragRailMark.style.top = centerY + "px";
  }

  var revealed = false;
  var revealing = false;
  var dragging = false;
  var checkpointReached = false;
  var value = 0; // 0-100
  var startY = 0;
  var startValue = 0;

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

  function applyValue(v) {
    value = clamp(v, 0, 100);

    var frac = value / 100;

    var scale = lerp(0.88, 1, frac);
    var tracking = lerp(-2.5, -0.5, frac);
    var blur = lerp(8, 0, frac);
    var opacity = lerp(0, 1, frac);
    cableText.style.transform = "scale(" + scale + ")";
    cableText.style.letterSpacing = tracking + "px";
    cableText.style.filter = "blur(" + blur + "px)";
    cableText.style.opacity = opacity;

    // Dolly/zoom 3D: o fundo da entrada "anda pra frente" enquanto arrasta.
    if (introDoorBg) {
      var depthScale = lerp(1, MAX_DEPTH_SCALE, frac);
      introDoorBg.style.transform = "scale(" + depthScale + ")";
    }

    var railTravel = Math.max(railTrack.clientHeight - dragHandle.offsetHeight, 0);
    dragHandle.style.transform = "translateY(" + frac * railTravel + "px)";

    if (dragRailFill) {
      dragRailFill.style.height = frac * railTravel + "px";
    }

    if (dragRailMark) dragRailMark.classList.toggle("is-reached", value >= CHECKPOINT_VALUE);

    if (dragHandleRingFill) {
      dragHandleRingFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - frac);
    }

    if (!checkpointReached && value >= CHECKPOINT_VALUE) {
      checkpointReached = true;
      activateSwitch();
    }
  }

  function activateSwitch() {
    if (dragHint) dragHint.style.opacity = 0;
    if (lightSwitch) lightSwitch.classList.add("is-active");
  }

  function snapBack() {
    var easing = "0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    cableText.style.transition = "transform " + easing + ", letter-spacing " + easing + ", filter " + easing + ", opacity " + easing;
    dragHandle.style.transition = "transform " + easing;
    if (dragHandleRingFill) dragHandleRingFill.style.transition = "stroke-dashoffset " + easing;
    if (dragRailFill) dragRailFill.style.transition = "height " + easing;
    if (introDoorBg) introDoorBg.style.transition = "transform " + easing;
    applyValue(0);
    if (dragHint) dragHint.style.opacity = 1;
    scrambleLabel("Entre");
    window.setTimeout(function () {
      cableText.style.transition = "";
      dragHandle.style.transition = "";
      if (dragHandleRingFill) dragHandleRingFill.style.transition = "";
      if (dragRailFill) dragRailFill.style.transition = "";
      if (introDoorBg) introDoorBg.style.transition = "";
    }, 400);
  }

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

  function onPointerDown(ev) {
    if (revealed || revealing || checkpointReached) return;
    dragging = true;
    startY = ev.clientY;
    startValue = value;
    cableText.style.transition = "";
    dragHandle.style.transition = "";
    if (dragHandleRingFill) dragHandleRingFill.style.transition = "";
    if (dragRailFill) dragRailFill.style.transition = "";
    if (introDoorBg) introDoorBg.style.transition = "";
    if (dragHint) dragHint.style.opacity = 0;
    if (scrambleStop) scrambleStop();
    if (dragHandle.setPointerCapture) dragHandle.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!dragging) return;
    var railTravel = Math.max(railTrack.clientHeight - dragHandle.offsetHeight, 0);
    var deltaValue = railTravel > 0 ? ((ev.clientY - startY) / railTravel) * 100 : 0;
    applyValue(startValue + deltaValue);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    if (revealed || revealing || checkpointReached) return;
    snapBack();
  }

  dragHandle.addEventListener("pointerdown", onPointerDown);
  dragHandle.addEventListener("pointermove", onPointerMove);
  dragHandle.addEventListener("pointerup", onPointerUp);
  dragHandle.addEventListener("pointercancel", onPointerUp);

  if (lightSwitch) {
    lightSwitch.addEventListener("click", function () {
      if (!revealed && !revealing) triggerReveal();
    });
  }

  if (skipIntro) {
    skipIntro.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (!revealed && !revealing) {
        checkpointReached = true;
        applyValue(100);
        triggerReveal();
      }
    });
  }

  positionRailMark();
  window.addEventListener("resize", positionRailMark);
  applyValue(0);
  scrambleLabel("Entre");

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
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
