(function () {
  'use strict';

  var cfg = window.IX_LANDING || {};

  function toHexInt(hex) {
    if (typeof hex === 'number') return hex;
    if (typeof hex !== 'string') return null;
    var s = hex.trim();
    if (s[0] === '#') s = s.slice(1);
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return parseInt(s, 16);
  }

  function initThemeToggle(options) {
    options = options || {};
    var btnId = options.buttonId || 'themeToggle';
    var keys = Array.isArray(options.storageKeys) ? options.storageKeys : ['cq-theme', 'cq_theme'];
    var html = document.documentElement;
    var btn = document.getElementById(btnId);
    if (!btn) return { onChange: function () {} };

    function getSavedTheme() {
      for (var i = 0; i < keys.length; i++) {
        try {
          var v = localStorage.getItem(keys[i]);
          if (v === 'dark' || v === 'light') return v;
        } catch (e) {}
      }
      return null;
    }

    function setTheme(next) {
      if (next === 'dark') {
        html.setAttribute('data-theme', 'dark');
        btn.textContent = '☀️';
      } else {
        html.removeAttribute('data-theme');
        btn.textContent = '🌙';
      }
      for (var i = 0; i < keys.length; i++) {
        try { localStorage.setItem(keys[i], next); } catch (e) {}
      }
      try {
        window.dispatchEvent(new CustomEvent('ix-theme-changed', { detail: { theme: next } }));
      } catch (e) {}
    }

    var saved = getSavedTheme();
    if (saved === 'dark') setTheme('dark');
    else if (saved === 'light') setTheme('light');

    btn.addEventListener('click', function () {
      var isDark = html.getAttribute('data-theme') === 'dark';
      setTheme(isDark ? 'light' : 'dark');
    });

    return {
      onChange: function (handler) {
        window.addEventListener('ix-theme-changed', function (e) {
          handler(e && e.detail ? e.detail.theme : null);
        });
      },
      setTheme: setTheme
    };
  }

  function initFlipCards(selector) {
    selector = selector || '.ix-rule-card';
    document.querySelectorAll(selector).forEach(function (card) {
      card.addEventListener('click', function () {
        card.classList.toggle('flipped');
      });
    });
  }

  function initStatsCounter(selector) {
    selector = selector || '.ix-stat-val[data-count]';
    if (typeof IntersectionObserver === 'undefined') return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var targetCount = parseInt(el.dataset.count, 10);
        if (isNaN(targetCount) || el.dataset.animated) return;
        el.dataset.animated = 'true';
        var current = 0;
        var step = Math.max(1, Math.floor(targetCount / 50));
        var interval = setInterval(function () {
          current += step;
          if (current >= targetCount) {
            el.textContent = targetCount;
            clearInterval(interval);
          } else {
            el.textContent = current;
          }
        }, 20);
      });
    }, { threshold: 0.5 });

    document.querySelectorAll(selector).forEach(function (el) { obs.observe(el); });
  }

  function initAdminChip() {
    try {
      var chipName = document.getElementById('admin-chip-name');
      var chipLink = document.getElementById('admin-chip-link');
      if (!chipName || !chipLink) return;
      var token = sessionStorage.getItem('admin_token') || '';
      var name = sessionStorage.getItem('admin_username') || 'الأدمن';
      chipName.textContent = name;
      chipLink.href = token ? './dashboard.html' : './auth-admin.html';
    } catch (e) {}
  }

  function initHero3D(options) {
    options = options || {};
    var wrap = document.getElementById(options.containerId || 'hero3d');
    var loaderEl = document.getElementById(options.loaderId || 'model-loader');
    if (!wrap || typeof THREE === 'undefined') return { applyThemeLighting: function () {} };

    var bounceHex = toHexInt(options.bounceHex);
    if (bounceHex == null) bounceHex = 0xf04e23;

    var boardArtworkSrc = options.boardArtworkSrc || './img/arduino-board/arduino-uno-board-artwork.png';
    var fallbackGlbSrc = options.fallbackGlbSrc || './img/arduino-board/arduino-uno-r3.glb';

    /* ── Canvas & renderer ───────────────────────────────── */
    var cvs = document.createElement('canvas');
    cvs.style.opacity = '0';
    cvs.style.transition = 'opacity .8s ease';
    wrap.appendChild(cvs);

    var W = wrap.clientWidth || 460, H = wrap.clientHeight || 380;
    var renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;

    /* ── Scene & camera ─────────────────────────────────── */
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(44, W / H, 0.1, 100);
    camera.position.set(0, 5.8, 5.4);
    camera.lookAt(0, 0, 0);

    /* ── Lighting ───────────────────────────────────────── */
    var ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);
    var key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 9, 6);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xddeeff, 0.50);
    fill.position.set(-5, 3, 3);
    scene.add(fill);
    var bounce = new THREE.DirectionalLight(bounceHex, 0.16);
    bounce.position.set(0, -5, -3);
    scene.add(bounce);
    var rim = new THREE.DirectionalLight(0xffffff, 0.30);
    rim.position.set(0, -2, -8);
    scene.add(rim);

    function applyThemeLighting() {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        ambient.intensity = 0.45;
        key.intensity = 1.8;
        fill.intensity = 0.25;
        bounce.intensity = 0.55;
        rim.intensity = 0.65;
        disc.material.opacity = 0.0;
      } else {
        ambient.intensity = 0.85;
        key.intensity = 1.4;
        fill.intensity = 0.50;
        bounce.intensity = 0.16;
        rim.intensity = 0.30;
        disc.material.opacity = 0.07;
      }
    }

    /* ── Board group ────────────────────────────────────── */
    var grp = new THREE.Group();
    scene.add(grp);

    /* ── LED point lights (animated) ────────────────────── */
    var onLight = new THREE.PointLight(0x00ee44, 2.2, 1.4); onLight.position.set(-1.52, 0.20, 0.88); grp.add(onLight);
    var txLight = new THREE.PointLight(0xffcc00, 0.0, 0.8); txLight.position.set(-1.32, 0.20, 0.88); grp.add(txLight);
    var rxLight = new THREE.PointLight(0xffcc00, 0.0, 0.8); rxLight.position.set(-1.12, 0.20, 0.88); grp.add(rxLight);
    var lLight = new THREE.PointLight(0xff8800, 1.6, 1.2); lLight.position.set(0.46, 0.20, 0.88); grp.add(lLight);

    /* ── Shadow disc ────────────────────────────────────── */
    var disc = new THREE.Mesh(
      new THREE.CircleGeometry(3.0, 48),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.07 })
    );
    disc.rotation.x = -Math.PI / 2; disc.position.y = -0.28; grp.add(disc);

    /* ── Load GLB model ─────────────────────────────────── */
    var gltfLoader = new THREE.GLTFLoader();
    var glbSrc = (typeof window !== 'undefined' && window.ARDUINO_GLB)
      ? window.ARDUINO_GLB
      : fallbackGlbSrc;

    var unoRev3Palette = {
      pcb: 0x003f9f,
      pcbEdge: 0x003478,
      header: 0x17191a,
      chip: 0x242424,
      gold: 0xd7a51f,
      metal: 0xc8cdd1,
      darkMetal: 0x4f5356,
      portDark: 0x222426,
      white: 0xf7f7f2,
      red: bounceHex
    };

    function applyUnoRev3Colors(model) {
      var pcbBlue = new THREE.Color(0.10, 0.23, 0.54);
      var padGold = new THREE.Color(0.83, 0.73, 0.29);
      var bodyBlack = new THREE.Color(0.12, 0.12, 0.12);
      var chipBlack = new THREE.Color(0.10, 0.10, 0.10);
      var metalGray = new THREE.Color(0.50, 0.50, 0.52);
      var lightMetal = new THREE.Color(0.92, 0.92, 0.90);
      var brightMetal = new THREE.Color(1.00, 1.00, 1.00);
      var buttonMetal = new THREE.Color(0.59, 0.64, 0.85);

      function closeTo(a, b, tolerance) {
        return Math.abs(a.r - b.r) < tolerance &&
          Math.abs(a.g - b.g) < tolerance &&
          Math.abs(a.b - b.b) < tolerance;
      }

      function recolorMaterial(source) {
        var mat = source.clone();
        var name = (mat.name || '').toLowerCase();
        var color = mat.color || new THREE.Color(0xffffff);
        var meshMatch = name.match(/^mesh_(\d+)$/);
        var meshIndex = meshMatch ? parseInt(meshMatch[1], 10) : -1;
        var isNearlyWhite = color.r > 0.78 && color.g > 0.78 && color.b > 0.74;
        var isUsbOrJackMetal = (meshIndex >= 6 && meshIndex <= 34);
        var isHeaderBody = (meshIndex >= 77 && meshIndex <= 103);
        var isHeaderPin = (meshIndex >= 104 && meshIndex <= 121);
        var isGoldDetail = (meshIndex >= 35 && meshIndex <= 76) ||
          meshIndex === 122 || meshIndex === 123 ||
          meshIndex === 126 || meshIndex === 127 ||
          (meshIndex >= 143 && meshIndex <= 150);
        var isSilverCan = meshIndex === 124 || meshIndex === 125 ||
          meshIndex === 128 || meshIndex === 129;
        var isChipBody = (meshIndex >= 130 && meshIndex <= 142) ||
          meshIndex === 151 || meshIndex === 152 ||
          meshIndex === 153 || meshIndex === 154 ||
          name.indexOf('micro chip') > -1 ||
          name.indexOf('transistor') > -1 ||
          name.indexOf('lm1117') > -1;

        if (meshIndex === 3 || name.indexOf('pcb') > -1) {
          mat.color.setHex(unoRev3Palette.pcb);
          mat.roughness = 0.58;
          mat.metalness = 0.04;
        } else if (isHeaderBody) {
          mat.color.setHex(unoRev3Palette.header);
          mat.roughness = 0.56;
          mat.metalness = 0.06;
        } else if (isHeaderPin || isGoldDetail) {
          mat.color.setHex(unoRev3Palette.gold);
          mat.roughness = 0.20;
          mat.metalness = 0.88;
        } else if (isUsbOrJackMetal || isSilverCan) {
          mat.color.setHex(unoRev3Palette.metal);
          mat.roughness = 0.26;
          mat.metalness = 0.82;
        } else if (name.indexOf('button') > -1) {
          mat.color.setHex(unoRev3Palette.portDark);
          mat.roughness = 0.42;
          mat.metalness = 0.35;
        } else if (isChipBody) {
          mat.color.setHex(unoRev3Palette.chip);
          mat.roughness = 0.46;
          mat.metalness = 0.10;
        } else if (closeTo(color, padGold, 0.08)) {
          mat.color.setHex(unoRev3Palette.gold);
          mat.roughness = 0.20;
          mat.metalness = 0.88;
        } else if (isNearlyWhite || closeTo(color, metalGray, 0.08) || closeTo(color, lightMetal, 0.16) || closeTo(color, brightMetal, 0.08) || closeTo(color, buttonMetal, 0.08)) {
          mat.color.setHex(unoRev3Palette.metal);
          mat.roughness = 0.26;
          mat.metalness = 0.82;
        } else if (closeTo(color, chipBlack, 0.04)) {
          mat.color.setHex(unoRev3Palette.chip);
          mat.roughness = 0.46;
          mat.metalness = 0.10;
        } else if (closeTo(color, bodyBlack, 0.04)) {
          mat.color.setHex(unoRev3Palette.header);
          mat.roughness = 0.56;
          mat.metalness = 0.06;
        } else if (closeTo(color, pcbBlue, 0.04)) {
          mat.color.setHex(unoRev3Palette.pcbEdge);
          mat.roughness = 0.54;
          mat.metalness = 0.04;
        } else {
          mat.color.setHex(unoRev3Palette.darkMetal);
          mat.roughness = 0.35;
          mat.metalness = 0.45;
        }

        mat.needsUpdate = true;
        return mat;
      }

      model.traverse(function (obj) {
        if (!obj.isMesh || !obj.material) return;
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(recolorMaterial)
          : recolorMaterial(obj.material);
      });
    }

    function addArduinoBoardDetails(model, center, size) {
      var pcbBounds = {
        width: 4.5687,
        depth: 3.5531,
        x: 0.2157,
        y: -0.185,
        z: 0
      };

      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        var pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = pixels.data;
        var whitePrintMask = new Uint8Array(canvas.width * canvas.height);
        for (var i = 0; i < data.length; i += 4) {
          var pixel = i / 4;
          var px = pixel % canvas.width;
          var py = Math.floor(pixel / canvas.width);
          var r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          var isOutside = a < 20 || (r < 8 && g < 8 && b < 8);
          var isCrystalCan = px > 125 && px < 315 && py > 135 && py < 205 && r > 105 && g > 95 && b > 75;
          var isWhitePrint = r > 170 && g > 170 && b > 165;
          var isGoldCopper = r > 115 && g > 78 && b < 80;
          var isDarkTrace = r < 75 && g < 110 && b < 135;
          var isBoardBlue = b > 105 && g > 55 && r < 70;

          if (isOutside) {
            data[i + 3] = 0;
          } else if (isCrystalCan) {
            data[i] = 180; data[i + 1] = 187; data[i + 2] = 193; data[i + 3] = 238;
          } else if (isWhitePrint) {
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 250; data[i + 3] = 255;
            whitePrintMask[pixel] = 1;
          } else if (isGoldCopper) {
            data[i] = 222; data[i + 1] = 168; data[i + 2] = 25; data[i + 3] = 230;
          } else if (isDarkTrace) {
            data[i] = 0; data[i + 1] = 38; data[i + 2] = 80; data[i + 3] = 120;
          } else if (isBoardBlue) {
            data[i] = 0; data[i + 1] = 105; data[i + 2] = 218; data[i + 3] = 78;
          } else {
            data[i + 3] = 65;
          }
        }
        for (var p = 0; p < whitePrintMask.length; p++) {
          if (!whitePrintMask[p]) continue;
          var x = p % canvas.width;
          var y = Math.floor(p / canvas.width);
          for (var oy = -1; oy <= 1; oy++) {
            for (var ox = -1; ox <= 1; ox++) {
              if (ox === 0 && oy === 0) continue;
              var nx = x + ox;
              var ny = y + oy;
              if (nx < 0 || nx >= canvas.width || ny < 0 || ny >= canvas.height) continue;
              var ni = (ny * canvas.width + nx) * 4;
              if (data[ni + 3] === 0 || whitePrintMask[ny * canvas.width + nx]) continue;
              if (data[ni] > 210 && data[ni + 1] > 150 && data[ni + 2] < 90) continue;
              data[ni] = Math.max(data[ni], 235);
              data[ni + 1] = Math.max(data[ni + 1], 242);
              data[ni + 2] = Math.max(data[ni + 2], 245);
              data[ni + 3] = Math.max(data[ni + 3], 175);
            }
          }
        }
        ctx.putImageData(pixels, 0, 0);
        var texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
        var details = new THREE.Mesh(
          new THREE.PlaneGeometry(pcbBounds.width, pcbBounds.depth),
          new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
          })
        );
        details.rotation.x = -Math.PI / 2;
        details.position.set(pcbBounds.x, pcbBounds.y, pcbBounds.z);
        details.renderOrder = 5;
        model.add(details);
      };
      img.src = boardArtworkSrc;
    }

    function hideLoaderShowCanvas() {
      if (loaderEl) {
        loaderEl.style.opacity = '0';
        setTimeout(function () { loaderEl.style.display = 'none'; }, 500);
      }
      cvs.style.opacity = '1';
    }

    gltfLoader.load(
      glbSrc,
      function (gltf) {
        var model = gltf.scene;
        var box = new THREE.Box3().setFromObject(model);
        var center = box.getCenter(new THREE.Vector3());
        var size = box.getSize(new THREE.Vector3());
        model.position.sub(center);
        model.scale.setScalar(5.0 / Math.max(size.x, size.y, size.z));
        var box2 = new THREE.Box3().setFromObject(model);
        var c2 = box2.getCenter(new THREE.Vector3());
        model.position.sub(c2);
        model.position.y += 0.10;

        applyUnoRev3Colors(model);
        addArduinoBoardDetails(model, center, size);
        grp.add(model);
        hideLoaderShowCanvas();
      },
      function () {},
      function () {
        /* fallback board */
        var pcbMat = new THREE.MeshStandardMaterial({ color: unoRev3Palette.pcb, roughness: 0.48, metalness: 0.08 });
        var chipMat = new THREE.MeshStandardMaterial({ color: unoRev3Palette.chip, roughness: 0.46, metalness: 0.10 });
        function B(w, h, d, mat, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); grp.add(m); }
        B(3.8, 0.10, 2.9, pcbMat, 0, 0, 0);
        B(1.82, 0.085, 0.66, chipMat, 0.06, 0.092, 0.06);
        hideLoaderShowCanvas();
      }
    );

    /* ── Pose ───────────────────────────────────────────── */
    grp.rotation.x = 0.22;

    /* ── Mouse interaction ──────────────────────────────── */
    var mx = 0, my = 0, hovering = false, autoY = 0, crx = 0.22, cry = 0;
    wrap.addEventListener('mousemove', function (e) {
      var r = wrap.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      my = ((e.clientY - r.top) / r.height) * 2 - 1;
      hovering = true;
    });
    wrap.addEventListener('mouseleave', function () { hovering = false; });
    wrap.addEventListener('touchmove', function (e) {
      if (e.touches.length !== 1) return;
      var r = wrap.getBoundingClientRect();
      mx = ((e.touches[0].clientX - r.left) / r.width) * 2 - 1;
      my = ((e.touches[0].clientY - r.top) / r.height) * 2 - 1;
      hovering = true;
    }, { passive: true });
    wrap.addEventListener('touchend', function () { hovering = false; });

    /* ── Animate ────────────────────────────────────────── */
    var t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.01;
      if (!hovering) {
        autoY += 0.005;
        crx += (0.22 - crx) * 0.06;
        cry += (autoY - cry) * 0.06;
      } else {
        crx += ((0.22 - my * 0.22) - crx) * 0.08;
        cry += ((autoY + mx * 0.42) - cry) * 0.08;
      }
      grp.rotation.x = crx;
      grp.rotation.y = cry;
      grp.position.y = 0.10 + Math.sin(t * 0.6) * 0.08;

      onLight.intensity = 1.8 + Math.sin(t * 1.4) * 0.6;
      var txOn = Math.sin(t * 14.0) > 0.5; txLight.intensity = txOn ? 1.4 : 0;
      var rxOn = Math.sin(t * 10.5 + 1.8) > 0.6; rxLight.intensity = rxOn ? 1.2 : 0;
      lLight.intensity = 0.8 + Math.sin(t * 2.2) * 1.0;

      renderer.render(scene, camera);
    }
    animate();

    /* ── Resize ─────────────────────────────────────────── */
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        var nW = wrap.clientWidth, nH = wrap.clientHeight;
        if (!nW || !nH) return;
        camera.aspect = nW / nH;
        camera.updateProjectionMatrix();
        renderer.setSize(nW, nH);
      }).observe(wrap);
    }

    applyThemeLighting();
    return { applyThemeLighting: applyThemeLighting };
  }

  /* ── Boot ─────────────────────────────────────────────── */
  var theme = initThemeToggle({
    buttonId: cfg.themeButtonId || 'themeToggle',
    storageKeys: cfg.themeStorageKeys || ['cq-theme', 'cq_theme']
  });
  initFlipCards(cfg.flipCardSelector || '.ix-rule-card');
  initStatsCounter(cfg.statsSelector || '.ix-stat-val[data-count]');
  if (cfg.isAdminChip) initAdminChip();

  var hero = initHero3D({
    containerId: cfg.heroContainerId || 'hero3d',
    loaderId: cfg.heroLoaderId || 'model-loader',
    bounceHex: cfg.bounceHex,
    fallbackGlbSrc: cfg.fallbackGlbSrc,
    boardArtworkSrc: cfg.boardArtworkSrc
  });

  theme.onChange(function () {
    try { hero.applyThemeLighting(); } catch (e) {}
  });
})();

