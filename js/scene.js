/* ============================================
   THREE.JS 3D SCENE MODULE
   ============================================ */

const Scene3D = (() => {
  let scene, camera, renderer, clock;
  let composer; // post-processing placeholder
  let animationMixins = [];
  let groups = {};
  let particles = [];
  let isRunning = false;
  let mouseX = 0, mouseY = 0;
  let targetCamX = 0, targetCamY = 0;
  let heartMode = 'theme';
  let heartCustomColor = 0xff6b9d;

  // --- INIT ---
  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    detectDevice();

    clock = new THREE.Clock();
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a0a2e, 0.015);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 12);

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !IS_MOBILE,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.2 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    // Build scene
    createLights();
    createSky();
    createMoon();
    createStars();
    createFloatingIsland();
    createClouds();
    createFloatingHearts();
    createFireflies();
    createLanterns();
    createFlowers();
    createButterflies();
    createBigHeart();
    createSparkles();
    createRisingHearts();
    createGlowRings();

    // Events
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Pause rendering when tab is hidden (saves battery on phones)
    document.addEventListener('visibilitychange', onVisibilityChange);

    isRunning = true;
    animate();
  }

  // --- DEVICE DETECTION ---
  let IS_MOBILE = false;
  function detectDevice() {
    IS_MOBILE = window.innerWidth < 768 ||
      /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
  }

  function onVisibilityChange() {
    isRunning = !document.hidden;
    if (isRunning) animate();
  }

  // --- LIGHTS ---
  function createLights() {
    // Ambient - warm romantic purple
    const ambient = new THREE.AmbientLight(0x7755aa, 0.5);
    scene.add(ambient);

    // Moonlight
    const moonLight = new THREE.DirectionalLight(0xcc88ff, 0.9);
    moonLight.position.set(10, 20, -5);
    scene.add(moonLight);
    groups.moonLight = moonLight;

    // Point light for warmth - glowing pink
    const warmLight = new THREE.PointLight(0xff6b9d, 1.2, 35);
    warmLight.position.set(0, 2, 5);
    scene.add(warmLight);
    groups.warmLight = warmLight;

    // Secondary romantic light from below
    const glowLight = new THREE.PointLight(0xff4488, 0.6, 20);
    glowLight.position.set(0, -1, 0);
    scene.add(glowLight);
    groups.glowLight = glowLight;

    // Hemisphere light - dreamy purple to deep blue
    const hemi = new THREE.HemisphereLight(0x8866cc, 0x2a0a3e, 0.5);
    scene.add(hemi);
  }

  // --- SKY ---
  function createSky() {
    const skyGeo = new THREE.SphereGeometry(100, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTopColor: { value: new THREE.Color(0x0a0520) },
        uBottomColor: { value: new THREE.Color(0x1a0a3e) },
        uOffset: { value: 5 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform float uOffset;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + uOffset).y;
          gl_FragColor = vec4(mix(uBottomColor, uTopColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
    groups.sky = sky;
  }

  // --- MOON ---
  function createMoon() {
    const moonGroup = new THREE.Group();

    // Moon sphere
    const moonGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff3f0 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moon);

    // Moon glow - soft pink
    const glowTex = makeGlowTexture('rgb(255,170,200)');
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    glowSprite.scale.set(8, 8, 1);
    moonGroup.add(glowSprite);

    moonGroup.position.set(15, 18, -30);
    scene.add(moonGroup);
    groups.moon = moonGroup;
  }

  // --- STARS ---
  function createStars() {
    const starCount = IS_MOBILE ? 300 : 800;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Distribute in a dome
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = 50 + Math.random() * 40;
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.cos(phi) + 5;
      positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = Math.random() * 2 + 0.5;

      // Star colors: white to blue
      const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.3, 0.7 + Math.random() * 0.3);
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uTime;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          vOpacity = 0.5 + 0.5 * sin(uTime * 2.0 + position.x * 10.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    groups.stars = stars;
  }

  // --- FLOATING ISLAND ---
  function createFloatingIsland() {
    const islandGroup = new THREE.Group();

    // Main island body (rounded cone shape)
    const islandGeo = new THREE.CylinderGeometry(4, 1.5, 3, 32, 8);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
      metalness: 0.1
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.y = -1.5;
    islandGroup.add(island);

    // Grass top
    const grassGeo = new THREE.CylinderGeometry(4.1, 4, 0.3, 32);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.8
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = 0;
    islandGroup.add(grass);

    // Small tree trunk
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.set(1, 1, 0);
    islandGroup.add(trunk);

    // Tree foliage
    const foliageGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3a7d2e });
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.set(1, 2, 0);
    islandGroup.add(foliage);

    // Small house (heart-shaped concept)
    const houseGeo = new THREE.BoxGeometry(1.2, 1, 1);
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xc44569 });
    const house = new THREE.Mesh(houseGeo, houseMat);
    house.position.set(-1, 0.8, 0);
    islandGroup.add(house);

    // House roof
    const roofGeo = new THREE.ConeGeometry(0.9, 0.6, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xff6b9d });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(-1, 1.6, 0);
    roof.rotation.y = Math.PI / 4;
    islandGroup.add(roof);

    // Couple figures (simple)
    const boyGeo = new THREE.CapsuleGeometry(0.15, 0.5, 4, 8);
    const boyMat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
    const boyFigure = new THREE.Mesh(boyGeo, boyMat);
    boyFigure.position.set(-0.2, 0.65, 0.5);
    islandGroup.add(boyFigure);

    const girlGeo = new THREE.CapsuleGeometry(0.15, 0.5, 4, 8);
    const girlMat = new THREE.MeshStandardMaterial({ color: 0xff6b9d });
    const girlFigure = new THREE.Mesh(girlGeo, girlMat);
    girlFigure.position.set(0.2, 0.65, 0.5);
    islandGroup.add(girlFigure);

    // Heart between them
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;
    heartShape.moveTo(x, y + 0.15);
    heartShape.bezierCurveTo(x, y + 0.15, x - 0.05, y, x - 0.15, y);
    heartShape.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.175, x - 0.3, y + 0.175);
    heartShape.bezierCurveTo(x - 0.3, y + 0.35, x - 0.1, y + 0.55, x, y + 0.7);
    heartShape.bezierCurveTo(x + 0.1, y + 0.55, x + 0.3, y + 0.35, x + 0.3, y + 0.175);
    heartShape.bezierCurveTo(x + 0.3, y + 0.175, x + 0.3, y, x + 0.15, y);
    heartShape.bezierCurveTo(x + 0.1, y, x, y + 0.15, x, y + 0.15);

    const heartExtrudeSettings = { depth: 0.05, bevelEnabled: false };
    const heartGeo = new THREE.ExtrudeGeometry(heartShape, heartExtrudeSettings);
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xff1744,
      emissiveIntensity: 0.5
    });
    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.scale.set(0.8, 0.8, 0.8);
    heart.position.set(0, 0.9, 0.5);
    heart.rotation.z = Math.PI;
    islandGroup.add(heart);

    islandGroup.position.y = -2;
    scene.add(islandGroup);
    groups.island = islandGroup;
  }

  // --- CLOUDS ---
  function createClouds() {
    const cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x8888aa,
      transparent: true,
      opacity: 0.3,
      roughness: 1
    });

    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numPuffs; j++) {
        const puffGeo = new THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 8);
        const puff = new THREE.Mesh(puffGeo, cloudMat.clone());
        puff.position.set(j * 1.2, Math.random() * 0.5, Math.random() * 0.5);
        puff.scale.y = 0.5;
        cloud.add(puff);
      }
      cloud.position.set(
        (Math.random() - 0.5) * 80,
        8 + Math.random() * 12,
        (Math.random() - 0.5) * 60 - 10
      );
      cloud.userData.speed = 0.01 + Math.random() * 0.02;
      cloudGroup.add(cloud);
    }
    scene.add(cloudGroup);
    groups.clouds = cloudGroup;
  }

  // --- FLOATING HEARTS ---
  function createFloatingHearts() {
    const heartGroup = new THREE.Group();
    const heartColors = [0xff6b9d, 0xff4488, 0xff88bb, 0xffccdd, 0xff5599, 0xffaacc];
    const heartCount = IS_MOBILE ? 18 : 40;

    for (let i = 0; i < heartCount; i++) {
      const heartShape = new THREE.Shape();
      const s = 0.06 + Math.random() * 0.12;
      heartShape.moveTo(0, s);
      heartShape.bezierCurveTo(0, s, -s * 0.5, 0, -s, 0);
      heartShape.bezierCurveTo(-s * 1.5, 0, -s * 1.5, s * 1.75, -s * 1.5, s * 1.75);
      heartShape.bezierCurveTo(-s * 1.5, s * 3.5, -s, s * 5.5, 0, s * 7);
      heartShape.bezierCurveTo(s, s * 5.5, s * 1.5, s * 3.5, s * 1.5, s * 1.75);
      heartShape.bezierCurveTo(s * 1.5, s * 1.75, s * 1.5, 0, s, 0);
      heartShape.bezierCurveTo(s * 0.5, 0, 0, s, 0, s);

      const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 });
      const color = heartColors[Math.floor(Math.random() * heartColors.length)];
      const heartMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.85
      });
      const heart = new THREE.Mesh(heartGeo, heartMat);
      heart.position.set(
        (Math.random() - 0.5) * 24,
        Math.random() * 16,
        (Math.random() - 0.5) * 24
      );
      heart.rotation.z = Math.PI;
      heart.rotation.y = Math.random() * Math.PI;
      heart.userData = {
        floatSpeed: 0.5 + Math.random() * 1,
        floatAmp: 0.5 + Math.random() * 1.2,
        rotSpeed: (Math.random() - 0.5) * 0.5,
        baseY: heart.position.y
      };
      heartGroup.add(heart);
    }
    scene.add(heartGroup);
    groups.hearts = heartGroup;
  }

  // --- FIREFLIES ---
  function createFireflies() {
    const count = IS_MOBILE ? 30 : 60;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25;
      sizes[i] = Math.random() * 3 + 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        varying float vOpacity;
        uniform float uTime;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (100.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          vOpacity = 0.3 + 0.7 * sin(uTime * 3.0 + position.x * 5.0 + position.z * 5.0);
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d) * vOpacity;
          gl_FragColor = vec4(1.0, 0.95, 0.4, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const fireflies = new THREE.Points(geo, mat);
    scene.add(fireflies);
    groups.fireflies = fireflies;
  }

  // --- LANTERNS ---
  function createLanterns() {
    const lanternGroup = new THREE.Group();
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffaa44,
      emissive: 0xff6600,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < 8; i++) {
      const lantern = new THREE.Group();

      // Lantern body
      const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8);
      const body = new THREE.Mesh(bodyGeo, lanternMat.clone());
      lantern.add(body);

      // Light inside
      const lightGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.y = -0.1;
      lantern.add(light);

      lantern.position.set(
        (Math.random() - 0.5) * 30,
        3 + Math.random() * 10,
        (Math.random() - 0.5) * 30
      );
      lantern.userData = {
        floatSpeed: 0.3 + Math.random() * 0.5,
        baseY: lantern.position.y
      };
      lanternGroup.add(lantern);
    }
    scene.add(lanternGroup);
    groups.lanterns = lanternGroup;
  }

  // --- FLOWERS ---
  function createFlowers() {
    const flowerGroup = new THREE.Group();
    const petalColors = [0xff6b9d, 0xff88aa, 0xffaacc, 0xffffff, 0xffccdd];

    for (let i = 0; i < 15; i++) {
      const flower = new THREE.Group();

      // Stem
      const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.25;
      flower.add(stem);

      // Petals
      const petalColor = petalColors[Math.floor(Math.random() * petalColors.length)];
      for (let j = 0; j < 5; j++) {
        const petalGeo = new THREE.SphereGeometry(0.08, 8, 4);
        const petalMat = new THREE.MeshStandardMaterial({ color: petalColor });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.scale.set(1, 0.3, 0.5);
        const angle = (j / 5) * Math.PI * 2;
        petal.position.set(Math.cos(angle) * 0.12, 0.5, Math.sin(angle) * 0.12);
        petal.rotation.z = angle;
        flower.add(petal);
      }

      // Center
      const centerGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const centerMat = new THREE.MeshStandardMaterial({ color: 0xffdd00 });
      const center = new THREE.Mesh(centerGeo, centerMat);
      center.position.y = 0.5;
      flower.add(center);

      flower.position.set(
        (Math.random() - 0.5) * 8,
        -0.5,
        (Math.random() - 0.5) * 8
      );
      flower.scale.setScalar(0.5 + Math.random() * 0.5);
      flowerGroup.add(flower);
    }
    scene.add(flowerGroup);
    groups.flowers = flowerGroup;
  }

  // --- BUTTERFLIES ---
  function createButterflies() {
    const butterflyGroup = new THREE.Group();
    const colors = [0xff6b9d, 0x7c4dff, 0x00bcd4, 0xffd700, 0xff5722];

    for (let i = 0; i < 10; i++) {
      const butterfly = new THREE.Group();

      // Wings
      const wingGeo = new THREE.PlaneGeometry(0.3, 0.2);
      const wingMat = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.x = -0.15;
      butterfly.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat.clone());
      rightWing.position.x = 0.15;
      butterfly.add(rightWing);

      butterfly.position.set(
        (Math.random() - 0.5) * 20,
        2 + Math.random() * 8,
        (Math.random() - 0.5) * 20
      );
      butterfly.userData = {
        leftWing,
        rightWing,
        flapSpeed: 5 + Math.random() * 5,
        moveSpeed: 0.5 + Math.random(),
        angle: Math.random() * Math.PI * 2,
        baseY: butterfly.position.y
      };
      butterflyGroup.add(butterfly);
    }
    scene.add(butterflyGroup);
    groups.butterflies = butterflyGroup;
  }

  // --- GLOW TEXTURE HELPER (simulates bloom) ---
  function makeGlowTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, color);
    grad.addColorStop(0.4, color.replace(')', ',0.6)').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  // --- BIG GLOWING HEART (centerpiece - premium 3D backdrop) ---
  function createBigHeart() {
    const group = new THREE.Group();

    // Heart shape (larger base scale)
    const s = 1.6;
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, s);
    heartShape.bezierCurveTo(0, s, -s * 0.5, 0, -s, 0);
    heartShape.bezierCurveTo(-s * 1.5, 0, -s * 1.5, s * 1.75, -s * 1.5, s * 1.75);
    heartShape.bezierCurveTo(-s * 1.5, s * 3.5, -s, s * 5.5, 0, s * 7);
    heartShape.bezierCurveTo(s, s * 5.5, s * 1.5, s * 3.5, s * 1.5, s * 1.75);
    heartShape.bezierCurveTo(s * 1.5, s * 1.75, s * 1.5, 0, s, 0);
    heartShape.bezierCurveTo(s * 0.5, 0, 0, s, 0, s);

    // Main heart body - glossy glass-like pink
    const bodyGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 1.2,
      bevelEnabled: true,
      bevelThickness: 0.25,
      bevelSize: 0.25,
      bevelSegments: 6
    });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff6b9d,
      emissive: 0xff2266,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
      roughness: 0.15,
      metalness: 0.4
    });
    const heart = new THREE.Mesh(bodyGeo, bodyMat);
    heart.rotation.z = Math.PI;
    heart.position.y = -3.2;
    group.add(heart);

    // Inner core heart (brighter, pulsing)
    const innerGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.35,
      bevelSize: 0.35,
      bevelSegments: 6
    });
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xff66aa, transparent: true, opacity: 0.9 });
    const innerHeart = new THREE.Mesh(innerGeo, innerMat);
    innerHeart.scale.setScalar(0.6);
    innerHeart.rotation.z = Math.PI;
    innerHeart.position.y = -2.6;
    group.add(innerHeart);

    // Wireframe overlay for premium look (skip on mobile for performance)
    if (!IS_MOBILE) {
      const wireGeo = new THREE.ExtrudeGeometry(heartShape, {
        depth: 1.2,
        bevelEnabled: true,
        bevelThickness: 0.25,
        bevelSize: 0.25,
        bevelSegments: 4
      });
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xff99cc,
        wireframe: true,
        transparent: true,
        opacity: 0.25
      });
      const wireHeart = new THREE.Mesh(wireGeo, wireMat);
      wireHeart.rotation.z = Math.PI;
      wireHeart.position.y = -3.2;
      group.add(wireHeart);
    }

    // Outer glow sprite (big & soft)
    const glowTex = makeGlowTexture('rgb(255,90,150)');
    const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    glowSprite.scale.set(14, 14, 1);
    glowSprite.position.y = 1;
    group.add(glowSprite);

    // Second wider glow
    const glowTex2 = makeGlowTexture('rgb(255,150,200)');
    const glowSprite2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex2,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    glowSprite2.scale.set(22, 22, 1);
    glowSprite2.position.y = 1;
    group.add(glowSprite2);

    // Heart halo ring
    const ringGeo = new THREE.TorusGeometry(4.8, 0.05, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff66aa, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 1;
    group.add(ring);

    // Rotating sparkle orbit rings
    for (let i = 0; i < 3; i++) {
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(5.5 + i * 1.2, 0.02, 6, 90),
        new THREE.MeshBasicMaterial({ color: 0xff88cc, transparent: true, opacity: 0.35 })
      );
      orbit.rotation.x = Math.PI / 2;
      orbit.rotation.z = 0.2 + i * 0.5;
      orbit.position.y = 1;
      group.add(orbit);
      group.userData['orbit' + i] = orbit;
    }

    // Heart-shaped orbiting mini hearts
    for (let i = 0; i < 6; i++) {
      const miniShape = new THREE.Shape();
      const ms = 0.22;
      miniShape.moveTo(0, ms);
      miniShape.bezierCurveTo(0, ms, -ms * 0.5, 0, -ms, 0);
      miniShape.bezierCurveTo(-ms * 1.5, 0, -ms * 1.5, ms * 1.75, -ms * 1.5, ms * 1.75);
      miniShape.bezierCurveTo(-ms * 1.5, ms * 3.5, -ms, ms * 5.5, 0, ms * 7);
      miniShape.bezierCurveTo(ms, ms * 5.5, ms * 1.5, ms * 3.5, ms * 1.5, ms * 1.75);
      miniShape.bezierCurveTo(ms * 1.5, ms * 1.75, ms * 1.5, 0, ms, 0);
      miniShape.bezierCurveTo(ms * 0.5, 0, 0, ms, 0, ms);

      const miniGeo = new THREE.ExtrudeGeometry(miniShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
      const miniMat = new THREE.MeshStandardMaterial({
        color: 0xffaacc,
        emissive: 0xff4488,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.95
      });
      const mini = new THREE.Mesh(miniGeo, miniMat);
      mini.rotation.z = Math.PI;
      const angle = (i / 6) * Math.PI * 2;
      mini.userData = { angle, radius: 7.2, speed: 0.25 + i * 0.03, baseY: 1 };
      mini.position.set(Math.cos(angle) * mini.userData.radius, 1, Math.sin(angle) * mini.userData.radius);
      group.add(mini);
    }

    // Place heart as a big backdrop element
    group.position.set(0, 6, -16);
    group.scale.setScalar(2.0);
    group.userData.baseY = group.position.y;
    scene.add(group);
    groups.bigHeart = group;
  }

  // --- GOLDEN SPARKLES (premium dust) ---
  function createSparkles() {
    const count = IS_MOBILE ? 100 : 250;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 20 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      sizes[i] = Math.random() * 2 + 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffddaa) } },
      vertexShader: `
        attribute float size;
        varying float vOpacity;
        uniform float uTime;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (150.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          float twinkle = 0.5 + 0.5 * sin(uTime * 2.0 + position.x * 3.0 + position.y * 4.0);
          vOpacity = twinkle;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vOpacity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = pow(smoothstep(0.5, 0.0, d), 1.5) * vOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const sparkles = new THREE.Points(geo, mat);
    scene.add(sparkles);
    groups.sparkles = sparkles;
  }

  // --- RISING HEARTS (embers that float up) ---
  function createRisingHearts() {
    const count = IS_MOBILE ? 18 : 40;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = Math.random() * 18 - 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
      sizes[i] = Math.random() * 2.5 + 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xff6b9d) } },
      vertexShader: `
        attribute float size;
        varying float vOpacity;
        uniform float uTime;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
          vOpacity = 0.6 + 0.4 * sin(uTime * 3.0 + position.x * 2.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vOpacity;
        void main() {
          // Simple heart shape in point
          vec2 p = (gl_PointCoord - 0.5) * 2.0;
          float heart = p.x * p.x + p.y * p.y - 1.0;
          heart = heart * heart * heart - p.x * p.x * p.y * p.y * p.y;
          float alpha = smoothstep(0.0, 0.1, -heart) * vOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const rising = new THREE.Points(geo, mat);
    rising.userData.type = 'risingHearts';
    scene.add(rising);
    groups.risingHearts = rising;
  }

  // --- GLOW RINGS around island (magical aura) ---
  function createGlowRings() {
    const ringGroup = new THREE.Group();
    const glowTex = makeGlowTexture('rgb(255,120,180)');

    for (let i = 0; i < 3; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.35 - i * 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const ringGeo = new THREE.RingGeometry(4.2 + i * 0.8, 4.8 + i * 0.8, 48);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.15;
      ring.userData.rotSpeed = 0.1 + i * 0.08;
      ringGroup.add(ring);
    }

    ringGroup.position.y = -2;
    scene.add(ringGroup);
    groups.glowRings = ringGroup;
  }

  // --- SNOW (particle system) ---
  function createSnowEffect() {
    if (groups.snow) return;
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.7
    });
    const snow = new THREE.Points(geo, mat);
    snow.userData.type = 'snow';
    scene.add(snow);
    groups.snow = snow;
  }

  function removeSnowEffect() {
    if (groups.snow) {
      scene.remove(groups.snow);
      groups.snow.geometry.dispose();
      groups.snow.material.dispose();
      groups.snow = null;
    }
  }

  // --- RAIN ---
  function createRainEffect() {
    if (groups.rain) return;
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x88aacc,
      size: 0.05,
      transparent: true,
      opacity: 0.5
    });
    const rain = new THREE.Points(geo, mat);
    rain.userData.type = 'rain';
    scene.add(rain);
    groups.rain = rain;
  }

  function removeRainEffect() {
    if (groups.rain) {
      scene.remove(groups.rain);
      groups.rain.geometry.dispose();
      groups.rain.material.dispose();
      groups.rain = null;
    }
  }

  // --- CHERRY BLOSSOM ---
  function createCherryEffect() {
    if (groups.cherry) return;
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffb7c5,
      size: 0.15,
      transparent: true,
      opacity: 0.8
    });
    const cherry = new THREE.Points(geo, mat);
    cherry.userData.type = 'cherry';
    scene.add(cherry);
    groups.cherry = cherry;
  }

  function removeCherryEffect() {
    if (groups.cherry) {
      scene.remove(groups.cherry);
      groups.cherry.geometry.dispose();
      groups.cherry.material.dispose();
      groups.cherry = null;
    }
  }

  // --- AURORA ---
  function createAuroraEffect() {
    if (groups.aurora) return;
    const auroraGeo = new THREE.PlaneGeometry(60, 15, 30, 10);
    const auroraMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float wave1 = sin(vUv.x * 3.0 + uTime * 0.5) * 0.5 + 0.5;
          float wave2 = sin(vUv.x * 5.0 - uTime * 0.3 + 1.0) * 0.5 + 0.5;
          vec3 color1 = vec3(0.2, 0.8, 0.5);
          vec3 color2 = vec3(0.3, 0.2, 0.9);
          vec3 color = mix(color1, color2, wave1);
          float alpha = wave1 * wave2 * 0.3 * (1.0 - vUv.y);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const aurora = new THREE.Mesh(auroraGeo, auroraMat);
    aurora.position.set(0, 20, -40);
    aurora.rotation.x = -0.3;
    scene.add(aurora);
    groups.aurora = aurora;
  }

  function removeAuroraEffect() {
    if (groups.aurora) {
      scene.remove(groups.aurora);
      groups.aurora.geometry.dispose();
      groups.aurora.material.dispose();
      groups.aurora = null;
    }
  }

  // --- EFFECTS TOGGLE ---
  function applyEffects(effects) {
    // Toggle individual effects
    if (effects.snow) createSnowEffect(); else removeSnowEffect();
    if (effects.rain) createRainEffect(); else removeRainEffect();
    if (effects.cherry) createCherryEffect(); else removeCherryEffect();
    if (effects.aurora) createAuroraEffect(); else removeAuroraEffect();

    // Toggle groups visibility
    if (groups.stars) groups.stars.visible = effects.stars !== false;
    if (groups.hearts) groups.hearts.visible = effects.particles !== false;
    if (groups.fireflies) groups.fireflies.visible = effects.fireflies !== false;
    if (groups.butterflies) groups.butterflies.visible = effects.butterflies === true;
    if (groups.lanterns) groups.lanterns.visible = effects.lanterns === true;
    if (groups.clouds) groups.clouds.visible = effects.clouds !== false;
    if (groups.flowers) groups.flowers.visible = effects.flowers === true;
    if (groups.moon) groups.moon.visible = effects.moon !== false;

    // Premium love elements - tied to particles & bloom toggles
    const premiumOn = effects.particles !== false;
    if (groups.bigHeart) groups.bigHeart.visible = premiumOn;
    if (groups.sparkles) groups.sparkles.visible = premiumOn;
    if (groups.risingHearts) groups.risingHearts.visible = premiumOn;
    if (groups.glowRings) groups.glowRings.visible = effects.bloom !== false && premiumOn;

    // Update sky color
    if (groups.sky && groups.sky.material.uniforms) {
      const skyColors = {
        night: { top: 0x0a0520, bottom: 0x1a0a3e },
        sunset: { top: 0x1a0520, bottom: 0xff6b3a },
        starry: { top: 0x050520, bottom: 0x0a0a3e },
        aurora: { top: 0x0a2020, bottom: 0x0a1a3e }
      };
      const sky = skyColors[effects.sky] || skyColors.night;
      groups.sky.material.uniforms.uTopColor.value.setHex(sky.top);
      groups.sky.material.uniforms.uBottomColor.value.setHex(sky.bottom);
    }

    // Update particle color
    if (effects.particleColor) {
      const c = new THREE.Color(effects.particleColor);
      if (groups.hearts) {
        groups.hearts.children.forEach(h => {
          h.material.color.copy(c);
          h.material.emissive.copy(c);
        });
      }
    }

    // Heart color mode (theme / rainbow / custom)
    if (effects.heartMode) {
      heartMode = effects.heartMode;
    }
    if (effects.heartCustomColor) {
      heartCustomColor = new THREE.Color(effects.heartCustomColor).getHex();
    }
    if (heartMode === 'custom') {
      setHeartColor(new THREE.Color(heartCustomColor));
    } else if (heartMode === 'theme') {
      const theme = Storage.loveThemes.find(t => t.id === (Storage.getData('loveTheme') || 'rose')) || Storage.loveThemes[0];
      if (theme && theme.heartColor) setHeartColor(new THREE.Color(theme.heartColor));
    }
  }

  // Set the big heart + related colors to a single color
  function setHeartColor(c) {
    if (groups.bigHeart) {
      groups.bigHeart.children.forEach(child => {
        if (child.material && child.material.isMeshStandardMaterial) {
          child.material.color.copy(c);
          child.material.emissive.copy(c);
          child.material.emissiveIntensity = 0.9;
        }
        if (child.material && child.material.isMeshBasicMaterial && !child.material.wireframe && child.material.opacity > 0.5) {
          child.material.color.copy(c);
        }
      });
    }
    if (groups.warmLight) groups.warmLight.color.copy(c);
    if (groups.glowLight) groups.glowLight.color.copy(c);
  }

  // Cycle the heart through rainbow colors (called each frame)
  function updateHeartColor(time) {
    if (heartMode === 'rainbow') {
      const h = (time * 0.08) % 1;
      const c = new THREE.Color().setHSL(h, 1, 0.6);
      setHeartColor(c);
    } else if (heartMode === 'custom') {
      setHeartColor(new THREE.Color(heartCustomColor));
    }
  }

  // --- APPLY LOVE THEME (change background & colors) ---
  function applyLoveTheme(theme) {
    if (!theme) return;

    // Sky colors
    if (groups.sky && groups.sky.material.uniforms) {
      if (theme.skyTop) groups.sky.material.uniforms.uTopColor.value.set(theme.skyTop);
      if (theme.skyBottom) groups.sky.material.uniforms.uBottomColor.value.set(theme.skyBottom);
    }

    // Fog color matching sky
    if (scene.fog) {
      scene.fog.color.set(theme.skyTop || 0x1a0a2e);
    }

    // Big heart color
    if (groups.bigHeart && theme.heartColor) {
      const hc = new THREE.Color(theme.heartColor);
      groups.bigHeart.children.forEach(child => {
        if (child.material && child.material.isMeshStandardMaterial) {
          child.material.color.copy(hc);
          child.material.emissive.copy(hc);
        }
      });
    }

    // Particle / heart colors
    if (theme.particleColor) {
      const pc = new THREE.Color(theme.particleColor);
      if (groups.hearts) {
        groups.hearts.children.forEach(h => {
          if (h.material && h.material.isMeshStandardMaterial) {
            h.material.color.copy(pc);
            h.material.emissive.copy(pc);
          }
        });
      }
      if (groups.risingHearts && groups.risingHearts.material.uniforms) {
        groups.risingHearts.material.uniforms.uColor.value.copy(pc);
      }
      if (groups.sparkles && groups.sparkles.material.uniforms) {
        groups.sparkles.material.uniforms.uColor.value.set(theme.heartColor || pc);
      }
    }

    // Lighting
    if (groups.warmLight) {
      groups.warmLight.color.set(theme.heartColor || 0xff6b9d);
    }
    if (groups.glowLight) {
      groups.glowLight.color.set(theme.heartColor || 0xff4488);
    }
    if (groups.moonLight) {
      const ml = new THREE.Color(theme.heartColor || 0xcc88ff);
      groups.moonLight.color.copy(ml);
    }

    // Island heart color
    if (groups.island) {
      groups.island.children.forEach(child => {
        if (child.material && child.material.isMeshStandardMaterial && child.material.emissive) {
          const em = child.material.emissive;
          if (em.r > 0.5 && em.g < 0.4 && em.b < 0.4) {
            child.material.color.set(theme.heartColor || 0xff1744);
            child.material.emissive.set(theme.heartColor || 0xff1744);
          }
        }
      });
    }
  }

  // --- ANIMATION ---
  function animate() {
    if (!isRunning) return;
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();
    const delta = clock.getDelta();
    const speed = getAnimSpeed();

    // Sky shader
    if (groups.sky && groups.sky.material.uniforms) {
      groups.sky.material.uniforms.uTime.value = time;
    }

    // Stars twinkle
    if (groups.stars && groups.stars.material.uniforms) {
      groups.stars.material.uniforms.uTime.value = time;
    }

    // Fireflies
    if (groups.fireflies && groups.fireflies.material.uniforms) {
      groups.fireflies.material.uniforms.uTime.value = time;
      // Gentle movement
      const pos = groups.fireflies.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += Math.sin(time + i) * 0.002;
        pos[i + 1] += Math.cos(time * 0.5 + i) * 0.001;
        pos[i + 2] += Math.sin(time * 0.7 + i) * 0.002;
      }
      groups.fireflies.geometry.attributes.position.needsUpdate = true;
    }

    // Floating island bob
    if (groups.island) {
      groups.island.position.y = -2 + Math.sin(time * 0.5) * 0.3;
      groups.island.rotation.y = Math.sin(time * 0.1) * 0.05;
    }

    // Floating hearts
    if (groups.hearts) {
      groups.hearts.children.forEach(h => {
        const d = h.userData;
        h.position.y = d.baseY + Math.sin(time * d.floatSpeed) * d.floatAmp;
        h.rotation.y += d.rotSpeed * 0.01;
      });
    }

    // Clouds drift
    if (groups.clouds) {
      groups.clouds.children.forEach(c => {
        c.position.x += c.userData.speed * speed;
        if (c.position.x > 45) c.position.x = -45;
      });
    }

    // Lanterns float
    if (groups.lanterns) {
      groups.lanterns.children.forEach(l => {
        l.position.y = l.userData.baseY + Math.sin(time * l.userData.floatSpeed) * 0.5;
      });
    }

    // Butterflies
    if (groups.butterflies) {
      groups.butterflies.children.forEach(b => {
        const d = b.userData;
        d.angle += d.moveSpeed * 0.01 * speed;
        b.position.x += Math.sin(d.angle) * 0.03;
        b.position.z += Math.cos(d.angle) * 0.03;
        b.position.y = d.baseY + Math.sin(time * 2) * 0.3;
        b.rotation.y = d.angle;
        // Wing flap
        if (d.leftWing) {
          d.leftWing.rotation.y = Math.sin(time * d.flapSpeed) * 0.5;
          d.rightWing.rotation.y = -Math.sin(time * d.flapSpeed) * 0.5;
        }
      });
    }

    // Snow fall
    if (groups.snow && groups.snow.userData.type === 'snow') {
      const pos = groups.snow.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= 0.02 * speed;
        pos[i] += Math.sin(time + i) * 0.005;
        if (pos[i + 1] < -1) pos[i + 1] = 25;
      }
      groups.snow.geometry.attributes.position.needsUpdate = true;
    }

    // Rain fall
    if (groups.rain && groups.rain.userData.type === 'rain') {
      const pos = groups.rain.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= 0.15 * speed;
        if (pos[i + 1] < -1) pos[i + 1] = 25;
      }
      groups.rain.geometry.attributes.position.needsUpdate = true;
    }

    // Cherry blossom drift
    if (groups.cherry && groups.cherry.userData.type === 'cherry') {
      const pos = groups.cherry.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= 0.01 * speed;
        pos[i] += Math.sin(time * 0.5 + i) * 0.008;
        pos[i + 2] += Math.cos(time * 0.3 + i) * 0.005;
        if (pos[i + 1] < -1) pos[i + 1] = 20;
      }
      groups.cherry.geometry.attributes.position.needsUpdate = true;
    }

    // Aurora shader
    if (groups.aurora && groups.aurora.material.uniforms) {
      groups.aurora.material.uniforms.uTime.value = time;
    }

    // Camera movement
    const camMode = Storage.getData('effects').camera || 'auto';
    if (camMode === 'auto') {
      targetCamX = mouseX * 2;
      targetCamY = 3 + mouseY * 1;
    } else if (camMode === 'slow') {
      targetCamX = mouseX * 0.5;
      targetCamY = 3 + mouseY * 0.3;
    } else {
      targetCamX = 0;
      targetCamY = 3;
    }
    camera.position.x += (targetCamX - camera.position.x) * 0.02;
    camera.position.y += (targetCamY - camera.position.y) * 0.02;
    camera.lookAt(0, 1, 0);

    // Warm light pulse
    if (groups.warmLight) {
      groups.warmLight.intensity = 0.8 + Math.sin(time) * 0.3;
    }
    if (groups.glowLight) {
      groups.glowLight.intensity = 0.4 + Math.sin(time * 0.8) * 0.25;
    }

    // Big heart float & pulse + 3D rotation
    if (groups.bigHeart) {
      groups.bigHeart.position.y = groups.bigHeart.userData.baseY + Math.sin(time * 0.6) * 0.5;
      const pulse = 1 + Math.sin(time * 1.5) * 0.05;
      groups.bigHeart.scale.setScalar(2.0 * pulse);
      // Slow 3D rotation so the heart clearly looks 3D
      groups.bigHeart.rotation.y = Math.sin(time * 0.25) * 0.35;
      groups.bigHeart.rotation.x = Math.sin(time * 0.2) * 0.08;
      // Orbit rings rotate
      for (let i = 0; i < 3; i++) {
        const orbit = groups.bigHeart.userData['orbit' + i];
        if (orbit) {
          orbit.rotation.z = (0.2 + i * 0.5) + time * (i === 0 ? 0.35 : i === 1 ? -0.25 : 0.18);
        }
      }
      // Mini hearts orbit around the big heart
      groups.bigHeart.children.forEach(child => {
        if (child.userData && child.userData.angle !== undefined) {
          const d = child.userData;
          d.angle += d.speed * 0.01;
          child.position.x = Math.cos(d.angle) * d.radius;
          child.position.z = Math.sin(d.angle) * d.radius;
          child.position.y = d.baseY + Math.sin(time * 2 + d.angle) * 0.5;
        }
      });
    }

    // Heart color mode (rainbow cycle / custom)
    if (heartMode !== 'theme') {
      updateHeartColor(time);
    }

    // Sparkles shader
    if (groups.sparkles && groups.sparkles.material.uniforms) {
      groups.sparkles.material.uniforms.uTime.value = time;
      // Gentle drift
      const pos = groups.sparkles.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] += Math.sin(time * 0.3 + i) * 0.003;
        pos[i + 1] += Math.cos(time * 0.2 + i) * 0.002;
      }
      groups.sparkles.geometry.attributes.position.needsUpdate = true;
    }

    // Rising hearts - float upward
    if (groups.risingHearts && groups.risingHearts.material.uniforms) {
      groups.risingHearts.material.uniforms.uTime.value = time;
      const pos = groups.risingHearts.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] += 0.015 * speed;
        pos[i] += Math.sin(time + i) * 0.004;
        if (pos[i + 1] > 18) pos[i + 1] = -2;
      }
      groups.risingHearts.geometry.attributes.position.needsUpdate = true;
    }

    // Glow rings rotation
    if (groups.glowRings) {
      groups.glowRings.children.forEach(ring => {
        ring.rotation.z += ring.userData.rotSpeed * 0.01;
      });
    }

    renderer.render(scene, camera);
  }

  function getAnimSpeed() {
    const speed = Storage.getData('effects').animSpeed || 'normal';
    return speed === 'slow' ? 0.5 : speed === 'fast' ? 2 : 1;
  }

  // --- EVENTS ---
  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onMouseMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
    }
  }

  function destroy() {
    isRunning = false;
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    if (renderer) {
      renderer.dispose();
    }
  }

  return {
    init, destroy, applyEffects, applyLoveTheme,
    get scene() { return scene; },
    get camera() { return camera; },
    get renderer() { return renderer; }
  };
})();
