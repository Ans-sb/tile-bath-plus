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
        meta.textContent = "업로드 사진 공간 / 초록문 · 수납장 · 체크 바닥";
      }
    };
  }

  async function renderReferenceRoomScene() {
    const mount = document.querySelector("#plannerCanvasMount");
    if (!mount || currentPageId !== "plannerPage") return;

    const THREE = await loadPlannerThree();
    const config = readPlannerConfig();
    disposePlannerScene();

    const width = Math.max(mount.clientWidth || 900, 320);
    const height = Math.max(mount.clientHeight || 560, 320);
    mount.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eee5);
    scene.fog = new THREE.Fog(0xe9eee5, 7.5, 13);

    const camera = new THREE.PerspectiveCamera(39, width / height, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    plannerThreeState.renderer = renderer;
    plannerThreeState.scene = scene;
    plannerThreeState.camera = camera;
    plannerThreeState.angle = plannerThreeState.angle || 0.18;
    plannerThreeState.elevation = Math.max(plannerThreeState.elevation || 0.5, 0.42);
    plannerThreeState.zoom = Math.min(plannerThreeState.zoom || 0.78, 0.92);

    scene.add(new THREE.HemisphereLight(0xf7fff3, 0x8a8376, 1.45));
    const windowLight = new THREE.DirectionalLight(0xffffff, 2.35);
    windowLight.position.set(2.6, 3.4, 2.3);
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.set(2048, 2048);
    windowLight.shadow.camera.near = 0.4;
    windowLight.shadow.camera.far = 14;
    windowLight.shadow.camera.left = -5;
    windowLight.shadow.camera.right = 5;
    windowLight.shadow.camera.top = 5;
    windowLight.shadow.camera.bottom = -5;
    scene.add(windowLight);
    const fillLight = new THREE.DirectionalLight(0xcce8dc, 0.75);
    fillLight.position.set(-3.8, 2.5, 4.5);
    scene.add(fillLight);

    buildReferenceRoom(THREE, scene, config);
    attachPlannerPointerControls(renderer.domElement);

    const animate = () => {
      plannerThreeState.animationId = requestAnimationFrame(animate);
      updatePlannerCamera(camera, config);
      renderer.render(scene, camera);
    };
    animate();
    if (typeof setText === "function") setText("#plannerStatus", "업로드 사진 공간 3D 모델이 준비되었습니다.");
  }

  function buildReferenceRoom(THREE, scene, config) {
    const w = Math.max(config.width, 3.4);
    const d = Math.max(config.depth, 4.4);
    const h = Math.max(config.height, 2.45);
    const backZ = -d / 2;
    const frontZ = d / 2;
    const leftX = -w / 2;
    const rightX = w / 2;

    const floorTexture = createReferenceFloorTexture(THREE);
    floorTexture.repeat.set(w / 1.15, d / 1.15);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.32, metalness: 0.04, side: THREE.DoubleSide });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc7dcc9, roughness: 0.62, side: THREE.DoubleSide });
    const lowerWallMat = new THREE.MeshStandardMaterial({ color: 0x3a8e46, roughness: 0.54 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x2f6842, roughness: 0.48 });
    const ceilingMat = new THREE.MeshStandardMaterial({ map: createCeilingTexture(THREE), roughness: 0.86, side: THREE.DoubleSide });

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
    addBoxToScene(THREE, scene, [0, 0.22, backZ + 0.03], [w, 0.44, 0.04], new THREE.MeshStandardMaterial({ color: 0xd4e1d3, roughness: 0.62 }));

    addReferenceDoor(THREE, scene, w, d, h);
    addReferenceWindow(THREE, scene, w, d, h);
    addReferenceCabinet(THREE, scene, w, d);
    addReferenceFireExtinguisher(THREE, scene, d);
    addReferenceLeftRack(THREE, scene, w, d);
    addCeilingPanelLines(THREE, scene, w, d, h);
    addReferenceWallDetails(THREE, scene, w, d);
    addRoomEdges(THREE, scene, w, d, h);

    const openingLine = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(leftX, 0.012, frontZ), new THREE.Vector3(rightX, 0.012, frontZ)
      ]),
      new THREE.LineBasicMaterial({ color: 0x2d4d3b, transparent: true, opacity: 0.22 })
    );
    scene.add(openingLine);
  }

  function addReferenceDoor(THREE, scene, w, d, h) {
    const backZ = -d / 2;
    const doorX = -w * 0.26;
    const green = new THREE.MeshStandardMaterial({ color: 0x63a244, roughness: 0.52 });
    const darkGreen = new THREE.MeshStandardMaterial({ color: 0x3f7b32, roughness: 0.5 });
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
    const wood = new THREE.MeshStandardMaterial({ color: 0xc79d58, roughness: 0.48 });
    const side = new THREE.MeshStandardMaterial({ color: 0x625d4e, roughness: 0.54 });
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

  function addCeilingPanelLines(THREE, scene, w, d, h) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x9fac9d, transparent: true, opacity: 0.5 });
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
    const colors = ["#23a792", "#9b9f83"];
    const tile = 256;
    context.fillStyle = "#9b9f83";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += tile) {
      for (let x = 0; x < canvas.width; x += tile) {
        context.fillStyle = colors[((x / tile) + (y / tile)) % 2];
        context.fillRect(x, y, tile, tile);
        context.fillStyle = "rgba(255,255,255,0.08)";
        context.fillRect(x + 8, y + 8, tile - 16, tile - 16);
        context.strokeStyle = "rgba(35,56,45,0.18)";
        context.lineWidth = 6;
        context.strokeRect(x + 3, y + 3, tile - 6, tile - 6);
      }
    }
    context.fillStyle = "rgba(255,255,255,0.18)";
    context.fillRect(0, 0, canvas.width, canvas.height * 0.18);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
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
