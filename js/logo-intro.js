// Abertura: o logo da Casa Di Lorenzo (casa + "L" + "o", um traço contínuo)
// nasce de peças soltas que giram no espaço 3D e se encaixam na forma final.
// Roda a cada carregamento da página; ao terminar (ou ao pular) o overlay some em fade e
// dispara "logointro:done" para o hero começar a sua própria cena.
(function () {
  var root = document.documentElement;
  var overlay = document.getElementById("logoIntro");
  var canvas = document.getElementById("logoIntroCanvas");
  var textEl = document.getElementById("logoIntroText");
  var skipBtn = document.getElementById("logoIntroSkip");

  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    root.classList.remove("logo-intro-lock");
    if (overlay) overlay.classList.add("is-leaving");
    window.dispatchEvent(new Event("logointro:done"));
    window.setTimeout(function () {
      stop();
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      root.classList.remove("has-logo-intro");
    }, 1000);
  }
  var stop = function () {};

  if (!root.classList.contains("has-logo-intro") || !overlay || !canvas || !window.THREE) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    root.classList.remove("has-logo-intro", "logo-intro-lock");
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) {
    // Sem WebGL: nada de abertura, o hero começa na hora.
    overlay.parentNode.removeChild(overlay);
    root.classList.remove("has-logo-intro", "logo-intro-lock");
    return;
  }
  if (skipBtn) skipBtn.addEventListener("click", finish);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") finish(); });

  /* ---------- LOGO: coordenadas lidas do arquivo do cliente (px) ---------- */
  var CX = 380, CY = 1079, S = 1 / 26;
  function P(x, y) { return new THREE.Vector3((x - CX) * S, -(y - CY) * S, 0); }
  var paths = [
    [P(338, 1133), P(338, 1071), P(378, 1026), P(418, 1068)], // casa
    [P(378, 1046), P(378, 1133), P(423, 1133)]                // L
  ];
  var circle = { c: P(403, 1096), r: 12 * S };                // o "o"

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  var scene = new THREE.Scene();
  var cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  var group = new THREE.Group();
  scene.add(group);

  // ambiente quente para o metal ter o que refletir
  (function () {
    var pm = new THREE.PMREMGenerator(renderer);
    var env = new THREE.Scene();
    var m = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "varying vec3 p;void main(){vec3 d=normalize(p);float h=d.y*.5+.5;vec3 c=mix(vec3(.12,.09,.06),vec3(.75,.6,.42),h);c+=vec3(1.,.8,.5)*pow(max(dot(d,normalize(vec3(.7,.5,.4))),0.),12.)*2.5;gl_FragColor=vec4(c,1.);}"
    });
    env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
    scene.environment = pm.fromScene(env, 0.02).texture;
    pm.dispose();
  })();
  var key = new THREE.DirectionalLight(0xffe0b0, 2.2);
  key.position.set(4, 3, 5);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0xfff0d8, 0.35));
  var sweep = new THREE.PointLight(0xfff3d6, 0, 8, 1.6);
  scene.add(sweep);

  var mat = new THREE.MeshStandardMaterial({ color: 0xe6d6b4, metalness: 0.85, roughness: 0.28, envMapIntensity: 1.1 });
  var R = 0.032;
  var pieces = [];
  var UP = new THREE.Vector3(0, 1, 0);

  function addPiece(geo, pos, quat) {
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    group.add(mesh);
    pieces.push({ mesh: mesh, fp: pos.clone(), fq: quat.clone() });
  }

  paths.forEach(function (path) {
    for (var i = 0; i < path.length - 1; i++) {
      var a = path[i], b = path[i + 1];
      var dir = b.clone().sub(a), len = dir.length();
      var n = Math.max(2, Math.round(len / 0.55));
      var q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
      for (var k = 0; k < n; k++) {
        var l0 = len * k / n, l1 = len * (k + 1) / n;
        var mid = a.clone().add(dir.clone().normalize().multiplyScalar((l0 + l1) / 2));
        addPiece(new THREE.CylinderGeometry(R, R, l1 - l0, 14, 1), mid, q.clone());
      }
    }
    path.forEach(function (p) { addPiece(new THREE.SphereGeometry(R, 16, 12), p.clone(), new THREE.Quaternion()); });
  });
  var Z = new THREE.Vector3(0, 0, 1);
  for (var k = 0; k < 4; k++) {
    addPiece(
      new THREE.TorusGeometry(circle.r, R * 0.95, 10, 18, Math.PI / 2 * 0.98),
      circle.c.clone(),
      new THREE.Quaternion().setFromAxisAngle(Z, k * Math.PI / 2)
    );
    var ang = k * Math.PI / 2;
    addPiece(
      new THREE.SphereGeometry(R * 0.95, 12, 10),
      circle.c.clone().add(new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0).multiplyScalar(circle.r)),
      new THREE.Quaternion()
    );
  }

  // estado inicial aleatório, mas determinístico
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  var T0 = 0.4;
  pieces.forEach(function (p) {
    var r = 3.5 + rnd() * 4.5, th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
    p.sp = new THREE.Vector3(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.7, r * Math.cos(ph) * 0.8 - 1);
    p.q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28));
    p.ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    p.w = (1.2 + rnd() * 2.2) * (rnd() < 0.5 ? -1 : 1);
    p.orb = (rnd() - 0.5) * 1.4;
    p.delay = T0 + rnd() * 1.3;
    p.dur = 1.9 + rnd() * 0.7;
  });
  var TEND = Math.max.apply(null, pieces.map(function (p) { return p.delay + p.dur; })); // ~4,3 s
  var T_LEAVE = TEND + 2.4;
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  var tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), yAx = new THREE.Vector3(0, 1, 0);
  var mx = 0, my = 0, tx = 0, ty = 0;

  function update(t) {
    pieces.forEach(function (p) {
      var u = Math.min(1, Math.max(0, (t - p.delay) / p.dur));
      var e = ease(u);
      var drift = tmpV.copy(p.sp).applyAxisAngle(yAx, t * 0.25 * (p.orb > 0 ? 1 : -1));
      drift.y += Math.sin(t * 1.3 + p.w) * 0.25;
      var pos = drift.clone().lerp(p.fp, e);
      pos.applyAxisAngle(yAx, (1 - e) * p.orb * 2.0);
      p.mesh.position.copy(pos);
      tmpQ.setFromAxisAngle(p.ax, t * p.w);
      var spin = p.q0.clone().premultiply(tmpQ);
      spin.premultiply(new THREE.Quaternion().setFromAxisAngle(p.ax, (1 - e) * p.w * 2.5));
      p.mesh.quaternion.copy(spin.slerp(p.fq, easeOut(u)));
      p.mesh.scale.setScalar(0.001 + Math.min(1, t / 0.5));
    });
    var st = (t - TEND - 0.1) / 1.6;
    if (st > 0 && st < 1) {
      sweep.position.set(-3 + st * 6, 0.5 - st * 0.8, 1.4);
      sweep.intensity = 6 * Math.sin(st * Math.PI);
    } else {
      sweep.intensity = 0;
    }
    var done = Math.max(0, Math.min(1, (t - TEND) / 1));
    group.rotation.y = mx * 0.28 * done + Math.sin(t * 0.6) * 0.05 * done;
    group.rotation.x = -my * 0.14 * done;
    group.position.y = Math.sin(t * 0.9) * 0.03 * done;
    if (textEl) textEl.classList.toggle("is-on", t > TEND - 0.6);
  }

  function onMove(e) {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    var f = cam.fov * Math.PI / 180;
    var dH = 8.0 / 2 / Math.tan(f / 2);
    var dW = 7.4 / 2 / Math.tan(f / 2) / cam.aspect;
    cam.position.set(0, 0, Math.max(dH, dW) + 0.5);
    cam.lookAt(0, 0, 0);
    scene.position.y = w < h ? 1.3 : 1.1;
    cam.updateProjectionMatrix();
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("resize", resize);
  resize();

  var raf = 0, start = performance.now();
  function frame(now) {
    mx += (tx - mx) * 0.06;
    my += (ty - my) * 0.06;
    var t = (now - start) / 1000;
    update(t);
    renderer.render(scene, cam);
    if (t >= T_LEAVE) finish();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  stop = function () {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("resize", resize);
    pieces.forEach(function (p) { p.mesh.geometry.dispose(); });
    mat.dispose();
    renderer.dispose();
  };
})();
