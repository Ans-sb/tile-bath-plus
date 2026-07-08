(() => {
  const REFERENCE_ROOM_PRESET = "reference-room";
  const REFERENCE_ROOM_DEFAULTS = {
    width: "4.2",
    depth: "5.4",
    height: "2.65",
    grout: "3"
  };

  const originalRenderPlannerScene = typeof renderPlannerScene === "function" ? renderPlannerScene : null;

  function getPlannerPresetValue() {
    return document.querySelector("#plannerRoomPreset")?.value || REFERENCE_ROOM_PRESET;
  }

  function applyReferenceRoomDefaults() {
    const preset = getPlannerPresetValue();
    if (preset !== REFERENCE_ROOM_PRESET) return;
    const width = document.querySelector("#plannerWidth");
    const depth = document.querySelector("#plannerDepth");
    const height = document.querySelector("#plannerHeight");
    const grout = document.querySelector("#plannerGrout");
    if (width && !width.dataset.referenceRoomTouched) width.value = REFERENCE_ROOM_DEFAULTS.width;
    if (depth && !depth.dataset.referenceRoomTouched) depth.value = REFERENCE_ROOM_DEFAULTS.depth;
    if (height && !height.dataset.referenceRoomTouched) height.value = REFERENCE_ROOM_DEFAULTS.height;
    if (grout && !grout.dataset.referenceRoomTouched) grout.value = REFERENCE_ROOM_DEFAULTS.grout;
  }

  ["#plannerWidth", "#plannerDepth", "#plannerHeight", "#plannerGrout"].forEach((selector) => {
    document.querySelector(selector)?.addEventListener("input", (event) => {
      event.currentTarget.dataset.referenceRoomTouched = "true";
    });
  });

  document.querySelector("#plannerRoomPreset")?.addEventListener("change", () => {
    applyReferenceRoomDefaults();
    if (typeof setText === "function") {
      setText("#plannerStatus", getPlannerPresetValue() === REFERENCE_ROOM_PRESET
        ? "업로드 사진 공간을 3D 모델로 표시합니다."
        : "기본 빈 공간을 3D로 표시합니다.");
    }
    if (typeof renderPlannerWorkspace === "function") renderPlannerWorkspace();
  });

  if (originalRenderPlannerScene) {
    renderPlannerScene = async function renderReferenceAwarePlannerScene() {
      if (getPlannerPresetValue() !== REFERENCE_ROOM_PRESET) {
        return originalRenderPlannerScene();
      }
      return renderReferenceRoomScene();
    };
  }

  const originalRenderPlannerWorkspace = typeof renderPlannerWorkspace === "function" ? renderPlannerWorkspace : null;
  if (originalRenderPlannerWorkspace) {
    renderPlannerWorkspace = function renderReferenceAwarePlannerWorkspace() {
      applyReferenceRoomDefaults();
      originalRenderPlannerWorkspace();
      const meta = document.querySelector("#plannerSceneMeta");
      if (meta && getPlannerPresetValue() === REFERENCE_ROOM_PRESET) {
        const floorTile = typeof getPlannerSelectedTile === "function" ? getPlannerSelectedTile("floor") : null;
        const wallTile = typeof getPlannerSelectedTile === "function" ? getPlannerSelectedTile("wall") : null;
        meta.textContent = `업로드 사진 공간 / ${floorTile?.name || "바닥 타일 없음"} / ${wallTile?.name || "벽 타일 없음"}`;
      }
    };
  }

  async function renderReferenceRoomScene() {
    const mount = document.querySelector("#plannerCanvasMount");
    if (!mount || currentPageId !== "plannerPage") return;

    const THREE = await loadPlannerThree();
    const config = readPlannerConfig();
    const floorTile = typeof getPlannerSelectedTile === "function" ? getPlannerSelectedTile("floor") : null;
    const wallTile = typeof getPlannerSelectedTile === "function" ? getPlannerSelectedTile("wall") : null;
    disposePlannerScene();

    const width = Math.max(mount.clientWidth || 900, 320);
    const height = Math.max(mount.clientHeight || 560, 320);
    mount.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdfe7db);
    scene.fog = new THREE.Fog(0xdfe7db, 6.8, 11.5);

    const camera = new THREE.PerspectiveCamera(39, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    plannerThreeState.renderer = renderer;
    plannerThreeState.scene = scene;
    plannerThreeState.camera = camera;
    plannerThreeState.angle = 0.08;
    plannerThreeState.elevation = 0.28;
    plannerThreeState.zoom = 0.74;

    scene.add(new THREE.HemisphereLight(0xf4fff4, 0x6a6257, 0.78));
    const windowLight = new THREE.DirectionalLight(0xffffff, 2.15);
    windowLight.position.set(2.1, 3.15, 1.45);
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.set(2048, 2048);
    windowLight.shadow.camera.near = 0.4;
    windowLight.shadow.camera.far = 14;
    windowLight.shadow.camera.left = -5;
    windowLight.shadow.camera.right = 5;
    windowLight.shadow.camera.top = 5;
    windowLight.shadow.camera.bottom = -5;
    scene.add(windowLight);
    const fillLight = new THREE.DirectionalLight(0xcce8dc, 0.3);
    fillLight.position.set(-3.8, 2.5, 4.5);
    scene.add(fillLight);
    const ceilingLight = new THREE.PointLight(0xe7fff0, 0.85, 7.5, 1.9);
    ceilingLight.position.set(-0.7, hFromConfig(config) - 0.18, -0.25);
    scene.add(ceilingLight);

    const selectedFloorTexture = typeof createPlannerTileTexture === "function" && floorTile
      ? await createPlannerTileTexture(THREE, floorTile, config.grout, "floor", config)
      : null;
    const selectedWallTexture = typeof createPlannerTileTexture === "function" && wallTile
      ? await createPlannerTileTexture(THREE, wallTile, config.grout, "wall", config)
      : null;

    buildReferenceRoom(THREE, scene, config, {
      floorTexture: selectedFloorTexture,
      wallTexture: selectedWallTexture,
      floorTile,
      wallTile
    });
    attachPlannerPointerControls(renderer.domElement);

    const animate = () => {
      plannerThreeState.animationId = requestAnimationFrame(animate);
      updatePlannerCamera(camera, config);
      renderer.render(scene, camera);
    };
    animate();
    if (typeof setText === "function") setText("#plannerStatus", "업로드 사진 공간 3D 모델이 준비되었습니다.");
  }

  function buildReferenceRoom(THREE, scene, config, selectedTiles = {}) {
    const w = Math.max(config.width, 3.4);
    const d = Math.max(config.depth, 4.4);
    const h = Math.max(config.height, 2.45);
    const backZ = -d / 2;
    const frontZ = d / 2;
    const leftX = -w / 2;
    const rightX = w / 2;

    const floorTexture = selectedTiles.floorTexture || createReferenceFloorTexture(THREE);
    if (!selectedTiles.floorTexture) floorTexture.repeat.set(w / 1.15, d / 1.15);
    const floorBumpTexture = createReferenceFloorBumpTexture(THREE);
    floorBumpTexture.repeat.copy(floorTexture.repeat);
    const wallTexture = selectedTiles.wallTexture || null;
    const wallPaintTexture = createPaintTexture(THREE, "#c5dbc8", "#acc5ad", 0.17);
    const floorMat = new THREE.MeshPhysicalMaterial({
      map: floorTexture,
      bumpMap: floorBumpTexture,
      bumpScale: 0.018,
      roughness: 0.36,
      metalness: 0.02,
      clearcoat: 0.2,
      clearcoatRoughness: 0.55,
      reflectivity: 0.28,
      side: THREE.DoubleSide
    });
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTexture || wallPaintTexture,
      bumpMap: createFineBumpTexture(THREE, 0.22),
      bumpScale: wallTexture ? 0.006 : 0.012,
      roughness: wallTexture ? 0.58 : 0.72,
      side: THREE.DoubleSide
    });
    const lowerWallMat = new THREE.MeshStandardMaterial({
      map: wallTexture || createPaintTexture(THREE, "#2f934a", "#1e743b", 0.24),
      roughness: wallTexture ? 0.56 : 0.58
    });
    const trimMat = new THREE.MeshStandardMaterial({
      map: createPaintTexture(THREE, "#2f6842", "#1f5134", 0.18),
      roughness: 0.5
    });
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf4fff1,
      map: createCeilingTexture(THREE),
      bumpMap: createFineBumpTexture(THREE, 0.36),
      bumpScale: 0.02,
      emissive: 0xb7c9b5,
      emissiveIntensity: 0.28,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    addPlane(THREE, scene, [0, h / 2, backZ - 0.005], [w, h], wallMat, [0, 0, 0]);
    addPlane(THREE, scene, [leftX + 0.005, h / 2, 0], [d, h], wallMat, [0, Math.PI / 2, 0]);
    addPlane(THREE, scene, [rightX - 0.005, h / 2, -0.2], [d * 0.9, h], wallMat, [0, -Math.PI / 2, 0]);
    addPlane(THREE, scene, [0, h + 0.002, 0], [w, d], ceilingMat, [Math.PI / 2, 0, 0]);

    addBoxToScene(THREE, scene, [0, 0.035, backZ + 0.025], [w, 0.07, 0.05], trimMat);
    addBoxToScene(THREE, scene, [leftX + 0.025, 0.035, 0], [0.05, 0.07, d], trimMat);
    addBoxToScene(THREE, scene, [rightX - 0.025, 0.035, -0.2], [0.05, 0.07, d * 0.9], trimMat);
    addBoxToScene(THREE, scene, [leftX + 0.035, 0.42, 0], [0.04, 0.84, d], lowerWallMat);
    addBoxToScene(THREE, scene, [0, 0.22, backZ + 0.03], [w, 0.44, 0.04], new THREE.MeshStandardMaterial({
      map: wallTexture || null,
      color: wallTexture ? 0xffffff : 0xd4e1d3,
      roughness: wallTexture ? 0.56 : 0.62
    }));

    addReferenceDoor(THREE, scene, w, d, h);
    addReferenceWindow(THREE, scene, w, d, h);
    addReferenceCabinet(THREE, scene, w, d);
    addReferenceFireExtinguisher(THREE, scene, d);
    addReferenceLeftRack(THREE, scene, w, d);
    addCeilingPanelLines(THREE, scene, w, d, h);
    addReferenceWallDetails(THREE, scene, w, d);
    addReferenceSurfaceWear(THREE, scene, w, d, h);
    addReferenceLightAndReflectionDetails(THREE, scene, w, d, h);
    addRoomEdges(THREE, scene, w, d, h);

    const openingLine = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(leftX, 0.012, frontZ), new THREE.Vector3(rightX, 0.012, frontZ)
      ]),
      new THREE.LineBasicMaterial({ color: 0x2d4d3b, transparent: true, opacity: 0.22 })
    );
    scene.add(openingLine);
  }

  function hFromConfig(config) {
    return Math.max(config.height || 2.65, 2.45);
  }

  function addReferenceDoor(THREE, scene, w, d, h) {
    const backZ = -d / 2;
    const doorX = -w * 0.26;
    const green = new THREE.MeshStandardMaterial({
      map: createPaintTexture(THREE, "#6aa94c", "#4e8d35", 0.28),
      bumpMap: createFineBumpTexture(THREE, 0.12),
      bumpScale: 0.01,
      roughness: 0.47
    });
    const darkGreen = new THREE.MeshStandardMaterial({ map: createPaintTexture(THREE, "#3f7b32", "#285f28", 0.2), roughness: 0.5 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xddeee8, roughness: 0.08, transmission: 0.32, transparent: true, opacity: 0.62 });
    const frame = new THREE.MeshStandardMaterial({ color: 0x6aa04e, roughness: 0.46 });

    addBoxToScene(THREE, scene, [doorX, 0.93, backZ + 0.035], [1.04, 1.86, 0.045], green);
    addBoxToScene(THREE, scene, [doorX, 1.88, backZ + 0.045], [1.1, 0.06, 0.07], frame);
    addBoxToScene(THREE, scene, [doorX - 0.55, 0.98, backZ + 0.05], [0.055, 1.96, 0.075], frame);
    addBoxToScene(THREE, scene, [doorX + 0.55, 0.98, backZ + 0.05], [0.055, 1.96, 0.075], frame);
    addBoxToScene(THREE, scene, [doorX, 0.035, backZ + 0.065], [1.1, 0.07, 0.07], darkGreen);

    addBoxToScene(THREE, scene, [doorX, 2.18, backZ + 0.04], [1.08, 0.46, 0.035], glass);
    addBoxToScene(THREE, scene, [doorX, 2.42, backZ + 0.055], [1.13, 0.05, 0.065], frame);
    addBoxToScene(THREE, scene, [doorX, 1.94, backZ + 0.055], [1.13, 0.05, 0.065], frame);

    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xb7b5a8, roughness: 0.24, metalness: 0.45 })
    );
    knob.position.set(doorX + 0.38, 0.92, backZ + 0.082);
    knob.castShadow = true;
    scene.add(knob);

    addBoxToScene(THREE, scene, [doorX - 0.43, 1.18, backZ + 0.081], [0.018, 0.18, 0.015], darkGreen);
    addBoxToScene(THREE, scene, [doorX - 0.43, 0.55, backZ + 0.081], [0.018, 0.18, 0.015], darkGreen);
    addSmudgePlane(THREE, scene, [doorX + 0.08, 1.1, backZ + 0.087], [0.36, 0.42], 0x2d5a2b, 0.12);
    addSmudgePlane(THREE, scene, [doorX - 0.18, 0.62, backZ + 0.087], [0.28, 0.26], 0x1e4a24, 0.1);
  }

  function addReferenceWindow(THREE, scene, w, d, h) {
    const backZ = -d / 2;
    const windowX = w * 0.3;
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xe7e8df, roughness: 0.38 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xcde6eb, roughness: 0.03, transmission: 0.42, transparent: true, opacity: 0.7 });

    addBoxToScene(THREE, scene, [windowX, 1.86, backZ + 0.038], [1.3, 0.72, 0.035], glassMat);
    addBoxToScene(THREE, scene, [windowX, 2.23, backZ + 0.057], [1.38, 0.055, 0.07], frameMat);
    addBoxToScene(THREE, scene, [windowX, 1.49, backZ + 0.057], [1.38, 0.055, 0.07], frameMat);
    addBoxToScene(THREE, scene, [windowX - 0.69, 1.86, backZ + 0.057], [0.055, 0.78, 0.07], frameMat);
    addBoxToScene(THREE, scene, [windowX + 0.69, 1.86, backZ + 0.057], [0.055, 0.78, 0.07], frameMat);
    addBoxToScene(THREE, scene, [windowX, 1.86, backZ + 0.061], [0.045, 0.7, 0.06], frameMat);
    addBoxToScene(THREE, scene, [windowX + 0.33, 1.86, backZ + 0.062], [0.02, 0.58, 0.065], frameMat);
    addBoxToScene(THREE, scene, [windowX, 1.72, backZ + 0.07], [1.2, 0.04, 0.025], frameMat);
  }

  function addReferenceCabinet(THREE, scene, w, d) {
    const backZ = -d / 2;
    const cabinetX = w * 0.31;
    const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture(THREE), roughness: 0.44 });
    const side = new THREE.MeshStandardMaterial({ map: createPaintTexture(THREE, "#665f50", "#4f493f", 0.16), roughness: 0.56 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2d2d26, roughness: 0.52 });
    const paper = new THREE.MeshStandardMaterial({ color: 0xf2f0d9, roughness: 0.64 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2396c7, roughness: 0.45 });

    addBoxToScene(THREE, scene, [cabinetX, 0.46, backZ + 0.35], [1.75, 0.92, 0.52], wood);
    addBoxToScene(THREE, scene, [cabinetX, 0.95, backZ + 0.35], [1.8, 0.09, 0.56], dark);
    addBoxToScene(THREE, scene, [cabinetX, 1.25, backZ + 0.35], [1.78, 0.52, 0.52], side);
    addBoxToScene(THREE, scene, [cabinetX - 0.45, 1.24, backZ + 0.59], [0.72, 0.42, 0.04], new THREE.MeshStandardMaterial({ color: 0x86795a, roughness: 0.57 }));
    addBoxToScene(THREE, scene, [cabinetX + 0.45, 1.24, backZ + 0.59], [0.72, 0.42, 0.04], new THREE.MeshStandardMaterial({ color: 0x9f946f, roughness: 0.57 }));
    addBoxToScene(THREE, scene, [cabinetX, 0.48, backZ + 0.63], [0.035, 0.74, 0.04], side);
    addBoxToScene(THREE, scene, [cabinetX - 0.43, 0.78, backZ + 0.66], [0.18, 0.025, 0.035], dark);
    addBoxToScene(THREE, scene, [cabinetX + 0.43, 0.78, backZ + 0.66], [0.18, 0.025, 0.035], dark);

    for (let i = 0; i < 8; i += 1) {
      addBoxToScene(THREE, scene, [cabinetX - 0.72 + i * 0.07, 1.38, backZ + 0.63], [0.045, 0.28, 0.04], i % 2 ? blue : paper);
    }
    addBoxToScene(THREE, scene, [cabinetX + 0.15, 1.18, backZ + 0.63], [0.35, 0.18, 0.05], paper);

    const displayColors = [0xf26419, 0x2f6fed, 0x00a896, 0xf2c94c, 0xd7263d];
    displayColors.forEach((color, index) => {
      addBoxToScene(THREE, scene, [cabinetX - 0.6 + index * 0.24, 1.62, backZ + 0.08], [0.16, 0.12, 0.018], new THREE.MeshStandardMaterial({ color, roughness: 0.45 }));
    });
    addSmudgePlane(THREE, scene, [cabinetX + 0.18, 0.52, backZ + 0.675], [0.62, 0.58], 0x4d341c, 0.1);
  }

  function addReferenceFireExtinguisher(THREE, scene, d) {
    const backZ = -d / 2;
    const red = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.36, metalness: 0.02 });
    const black = new THREE.MeshStandardMaterial({ color: 0x211d1a, roughness: 0.42 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8b05f, roughness: 0.24, metalness: 0.38 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.52, 32), red);
    body.position.set(0.22, 0.29, backZ + 0.32);
    body.castShadow = true;
    body.receiveShadow = true;
    scene.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 24), brass);
    neck.position.set(0.22, 0.61, backZ + 0.32);
    neck.castShadow = true;
    scene.add(neck);
    addBoxToScene(THREE, scene, [0.22, 0.66, backZ + 0.32], [0.18, 0.035, 0.035], black);
    addBoxToScene(THREE, scene, [0.22, 0.09, backZ + 0.32], [0.28, 0.08, 0.2], brass);
    addBoxToScene(THREE, scene, [0.22, 0.32, backZ + 0.405], [0.11, 0.13, 0.01], new THREE.MeshStandardMaterial({ color: 0xf4e7b7, roughness: 0.6 }));
  }

  function addReferenceLeftRack(THREE, scene, w, d) {
    const leftX = -w / 2;
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x84877e, roughness: 0.54, metalness: 0.06 });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xe8e2ca, roughness: 0.68 });
    for (let i = 0; i < 4; i += 1) {
      const z = -d / 2 + 1.05 + i * 0.22;
      addBoxToScene(THREE, scene, [leftX + 0.18, 0.38 + i * 0.13, z], [0.28, 0.03, 0.2], rackMat, [0, 0, -0.45]);
      addBoxToScene(THREE, scene, [leftX + 0.23, 0.43 + i * 0.13, z], [0.24, 0.012, 0.16], paperMat, [0, 0, -0.45]);
    }
    addBoxToScene(THREE, scene, [leftX + 0.07, 0.44, -d / 2 + 1.35], [0.04, 0.9, 0.04], rackMat);
  }

  function addReferenceWallDetails(THREE, scene, w, d) {
    const backZ = -d / 2;
    const plate = new THREE.MeshStandardMaterial({ color: 0xe5e9df, roughness: 0.42 });
    const cord = new THREE.MeshStandardMaterial({ color: 0x6b5149, roughness: 0.58 });
    addBoxToScene(THREE, scene, [-0.08, 1.12, backZ + 0.055], [0.18, 0.12, 0.018], plate);
    addBoxToScene(THREE, scene, [0.12, 1.12, backZ + 0.055], [0.18, 0.12, 0.018], plate);
    addBoxToScene(THREE, scene, [0.58, 1.34, backZ + 0.058], [0.05, 0.18, 0.02], cord);

    const flowerColors = [0xf6a0b5, 0xd94f70, 0xffd1dc, 0x94c77d];
    flowerColors.forEach((color, index) => {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.44 }));
      petal.position.set(0.84 + Math.cos(index) * 0.035, 1.67 + Math.sin(index) * 0.032, backZ + 0.07);
      petal.castShadow = true;
      scene.add(petal);
    });
    addBoxToScene(THREE, scene, [0.84, 1.52, backZ + 0.066], [0.014, 0.22, 0.012], cord);
  }

  function addReferenceSurfaceWear(THREE, scene, w, d, h) {
    const backZ = -d / 2;
    const leftX = -w / 2;
    addSmudgePlane(THREE, scene, [-0.78, 1.25, backZ + 0.064], [0.42, 0.28], 0x617a62, 0.11);
    addSmudgePlane(THREE, scene, [0.32, 0.78, backZ + 0.064], [0.24, 0.5], 0x6f7d68, 0.08);
    addSmudgePlane(THREE, scene, [leftX + 0.041, 1.72, -0.82], [0.62, 0.36], 0x5f765e, 0.1, [0, Math.PI / 2, 0]);
    addSmudgePlane(THREE, scene, [leftX + 0.042, 0.92, -1.58], [0.5, 0.22], 0x315b32, 0.12, [0, Math.PI / 2, 0]);
    addFloorScuff(THREE, scene, [-0.95, 0.014, -0.05], [0.58, 0.12], -0.25, 0.18);
    addFloorScuff(THREE, scene, [0.72, 0.014, 0.82], [0.74, 0.14], 0.18, 0.16);
    addFloorScuff(THREE, scene, [0.15, 0.014, -1.55], [0.52, 0.1], 0.65, 0.13);
    addSoftShadowPlane(THREE, scene, [-w * 0.26, 0.016, backZ + 0.42], [1.15, 0.36], 0.18);
    addSoftShadowPlane(THREE, scene, [w * 0.31, 0.016, backZ + 0.62], [1.95, 0.82], 0.2);
    addSoftShadowPlane(THREE, scene, [0.22, 0.017, backZ + 0.34], [0.42, 0.26], 0.22);
    addSoftShadowPlane(THREE, scene, [leftX + 0.2, 0.017, backZ + 1.34], [0.58, 0.74], 0.17);
    addSoftShadowPlane(THREE, scene, [0, 0.015, backZ + 0.12], [w * 0.94, 0.32], 0.13);
    addBoxToScene(THREE, scene, [0, h - 0.04, backZ + 0.05], [w * 0.98, 0.018, 0.08], new THREE.MeshStandardMaterial({ color: 0x7f8a79, roughness: 0.82, transparent: true, opacity: 0.38 }));
  }

  function addReferenceLightAndReflectionDetails(THREE, scene, w, d, h) {
    const backZ = -d / 2;
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xf4fff7, transparent: true, opacity: 0.16, side: THREE.DoubleSide });
    addPlane(THREE, scene, [w * 0.3, 1.86, backZ + 0.078], [1.42, 0.82], glowMat, [0, 0, 0]);
    addPlane(THREE, scene, [-w * 0.26, 2.18, backZ + 0.078], [1.12, 0.5], glowMat, [0, 0, 0]);
    const fluorescentMat = new THREE.MeshBasicMaterial({ color: 0xeaffee, transparent: true, opacity: 0.58, side: THREE.DoubleSide });
    addPlane(THREE, scene, [-0.55, h - 0.015, -0.18], [1.2, 0.12], fluorescentMat, [Math.PI / 2, 0, 0]);

    const reflectionMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, side: THREE.DoubleSide });
    const reflection = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.44, d * 0.42), reflectionMat);
    reflection.rotation.x = -Math.PI / 2;
    reflection.rotation.z = -0.18;
    reflection.position.set(0.78, 0.018, -0.2);
    scene.add(reflection);

    const sunPatchMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.055, side: THREE.DoubleSide });
    const sunPatch = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.36, d * 0.18), sunPatchMat);
    sunPatch.rotation.x = -Math.PI / 2;
    sunPatch.rotation.z = 0.2;
    sunPatch.position.set(0.74, 0.02, -0.85);
    scene.add(sunPatch);
  }

  function addCeilingPanelLines(THREE, scene, w, d, h) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0xb4c0b3, transparent: true, opacity: 0.32 });
    const points = [];
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.7) {
      points.push(new THREE.Vector3(x, h - 0.006, -d / 2), new THREE.Vector3(x, h - 0.006, d / 2));
    }
    for (let z = -d / 2; z <= d / 2 + 0.01; z += 0.7) {
      points.push(new THREE.Vector3(-w / 2, h - 0.006, z), new THREE.Vector3(w / 2, h - 0.006, z));
    }
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), lineMat));
  }

  function addRoomEdges(THREE, scene, w, d, h) {
    const leftX = -w / 2;
    const rightX = w / 2;
    const backZ = -d / 2;
    const frontZ = d / 2;
    const mat = new THREE.LineBasicMaterial({ color: 0x294534, transparent: true, opacity: 0.38 });
    const points = [
      new THREE.Vector3(leftX, 0, backZ), new THREE.Vector3(leftX, h, backZ),
      new THREE.Vector3(rightX, 0, backZ), new THREE.Vector3(rightX, h, backZ),
      new THREE.Vector3(leftX, h, backZ), new THREE.Vector3(rightX, h, backZ),
      new THREE.Vector3(leftX, 0, backZ), new THREE.Vector3(rightX, 0, backZ),
      new THREE.Vector3(leftX, 0, backZ), new THREE.Vector3(leftX, 0, frontZ),
      new THREE.Vector3(rightX, 0, backZ), new THREE.Vector3(rightX, 0, frontZ)
    ];
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), mat));
  }

  function addPlane(THREE, scene, position, size, material, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function addSmudgePlane(THREE, scene, position, size, color, opacity, rotation = [0, 0, 0]) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    scene.add(mesh);
    return mesh;
  }

  function addFloorScuff(THREE, scene, position, size, rotationZ, opacity) {
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotationZ;
    mesh.position.set(position[0], position[1], position[2]);
    scene.add(mesh);
    return mesh;
  }

  function addSoftShadowPlane(THREE, scene, position, size, opacity) {
    const material = new THREE.MeshBasicMaterial({ color: 0x18231c, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position[0], position[1], position[2]);
    scene.add(mesh);
    return mesh;
  }

  function addBoxToScene(THREE, scene, position, size, material, rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function createReferenceFloorTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    const colors = ["#159b8f", "#888d78"];
    const tile = 256;
    context.fillStyle = "#9b9f83";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += tile) {
      for (let x = 0; x < canvas.width; x += tile) {
        context.fillStyle = colors[((x / tile) + (y / tile)) % 2];
        context.fillRect(x, y, tile, tile);
        const grad = context.createLinearGradient(x, y, x + tile, y + tile);
        grad.addColorStop(0, "rgba(255,255,255,0.12)");
        grad.addColorStop(0.55, "rgba(255,255,255,0.01)");
        grad.addColorStop(1, "rgba(0,0,0,0.08)");
        context.fillStyle = grad;
        context.fillRect(x + 8, y + 8, tile - 16, tile - 16);
        context.strokeStyle = "rgba(35,56,45,0.18)";
        context.lineWidth = 6;
        context.strokeRect(x + 3, y + 3, tile - 6, tile - 6);
      }
    }
    for (let i = 0; i < 180; i += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const length = 16 + Math.random() * 78;
      context.strokeStyle = Math.random() > 0.48 ? "rgba(255,255,255,0.08)" : "rgba(35,46,38,0.08)";
      context.lineWidth = 1 + Math.random() * 3;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + Math.cos(i) * length, y + Math.sin(i * 1.7) * length * 0.2);
      context.stroke();
    }
    context.fillStyle = "rgba(255,255,255,0.1)";
    context.fillRect(0, 0, canvas.width, canvas.height * 0.16);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function createReferenceFloorBumpTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    context.fillStyle = "#808080";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const tile = 256;
    context.strokeStyle = "#565656";
    context.lineWidth = 7;
    for (let y = 0; y <= canvas.height; y += tile) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }
    for (let x = 0; x <= canvas.width; x += tile) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }
    for (let i = 0; i < 900; i += 1) {
      const shade = 112 + Math.random() * 38;
      context.fillStyle = `rgb(${shade},${shade},${shade})`;
      context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  }

  function createPaintTexture(THREE, base, shadow, amount) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 768;
    const context = canvas.getContext("2d");
    context.fillStyle = base;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 1800; i += 1) {
      context.fillStyle = Math.random() > 0.58
        ? `rgba(255,255,255,${Math.random() * amount * 0.35})`
        : hexToRgba(shadow, Math.random() * amount);
      context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 5, 1 + Math.random() * 5);
    }
    const vignette = context.createRadialGradient(384, 340, 100, 384, 384, 520);
    vignette.addColorStop(0, "rgba(255,255,255,0.08)");
    vignette.addColorStop(1, hexToRgba(shadow, 0.2));
    context.fillStyle = vignette;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function createFineBumpTexture(THREE, strength) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    context.fillStyle = "#808080";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 1800; i += 1) {
      const shade = 128 + (Math.random() - 0.5) * 90 * strength;
      context.fillStyle = `rgb(${shade},${shade},${shade})`;
      context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.2, 1.2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  function createWoodTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 768;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#b8843c");
    gradient.addColorStop(0.5, "#d3a45e");
    gradient.addColorStop(1, "#a97835");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 8) {
      context.strokeStyle = `rgba(82,48,18,${0.12 + Math.random() * 0.16})`;
      context.lineWidth = 1 + Math.random() * 2.2;
      context.beginPath();
      context.moveTo(0, y + Math.sin(y * 0.03) * 8);
      for (let x = 0; x <= canvas.width; x += 24) {
        context.lineTo(x, y + Math.sin(x * 0.02 + y * 0.06) * 7);
      }
      context.stroke();
    }
    for (let i = 0; i < 18; i += 1) {
      context.strokeStyle = "rgba(70,40,18,0.2)";
      context.beginPath();
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      context.ellipse(cx, cy, 18 + Math.random() * 34, 5 + Math.random() * 10, Math.random() * Math.PI, 0, Math.PI * 2);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex).replace("#", "");
    const value = Number.parseInt(clean, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function createCeilingTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 768;
    const context = canvas.getContext("2d");
    context.fillStyle = "#cbd9c7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 1400; i += 1) {
      context.fillStyle = `rgba(77, 92, 73, ${0.04 + Math.random() * 0.08})`;
      context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
    }
    context.strokeStyle = "rgba(89,103,86,0.28)";
    context.lineWidth = 3;
    for (let pos = 0; pos <= canvas.width; pos += 192) {
      context.beginPath();
      context.moveTo(pos, 0);
      context.lineTo(pos, canvas.height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, pos);
      context.lineTo(canvas.width, pos);
      context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  applyReferenceRoomDefaults();
  window.setTimeout(() => {
    if (typeof currentPageId !== "undefined" && currentPageId === "plannerPage" && typeof renderPlannerWorkspace === "function") {
      renderPlannerWorkspace();
    }
  }, 0);
})();
