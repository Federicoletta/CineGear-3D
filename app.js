// CineGear 3D Generator — Client-side WebAssembly App Controller
import { generateCineGearWasm, downloadSTL } from './engine_wasm.js';

let scene, camera, renderer, controls;
let currentMesh = null;
let currentWireMesh = null;
let isWireframe = false;
let isTurntable = false;
let currentMountType = "lobed";
let lastGeneratedMesh = null;
let previewDebounceTimer = null;

// Presets data embedded client-side
const PRESETS = {
  "helios_44_2_aperture": {
    "id": "helios_44_2_aperture",
    "name": "Helios 44-2 — Ghiera Diaframma",
    "description": "Micro-zigrinata per la ghiera liscia del diaframma dell'Helios 44-2",
    "params": {
      "teeth": 100,
      "mod": 0.8,
      "height": 4.5,
      "chamfer": 0.45,
      "mount_type": "ribbed",
      "d_tip": 57.20,
      "d_root": 58.16,
      "n_ribs": 160,
      "d_lip": 56.50,
      "h_lip": 0.8,
      "text": "HELIOS 44-2",
      "text_height": 3.2,
      "text_depth": 0.5,
      "text_angle": 45.0,
      "filename": "Helios 44-2 Aperture Gear 0.8MOD.stl"
    }
  },
  "mir_1b_focus": {
    "id": "mir_1b_focus",
    "name": "Mir-1B (МИР-1В) — Ghiera Messa a Fuoco",
    "description": "12 tasche sagomate sui lobi della ghiera di messa a fuoco",
    "params": {
      "teeth": 100,
      "mod": 0.8,
      "height": 10.5,
      "chamfer": 0.60,
      "mount_type": "lobed",
      "d_pocket": 59.10,
      "d_flat": 57.80,
      "n_lobes": 12,
      "d_lip": 56.00,
      "h_lip": 1.4,
      "text": "MIR-1B",
      "text_height": 3.5,
      "text_depth": 0.6,
      "text_angle": 45.0,
      "filename": "Mir-1B Focus Gear 0.8MOD.stl"
    }
  },
  "mir_1b_aperture": {
    "id": "mir_1b_aperture",
    "name": "Mir-1B (МИР-1В) — Ghiera Diaframma",
    "description": "Micro-zigrinata a 160 dentini per la ghiera del diaframma",
    "params": {
      "teeth": 100,
      "mod": 0.8,
      "height": 6.0,
      "chamfer": 0.50,
      "mount_type": "ribbed",
      "d_tip": 56.50,
      "d_root": 57.36,
      "n_ribs": 160,
      "d_lip": 55.60,
      "h_lip": 1.0,
      "text": "MIR-1B",
      "text_height": 3.2,
      "text_depth": 0.5,
      "text_angle": 45.0,
      "filename": "Mir-1B Aperture Gear 0.8MOD.stl"
    }
  },
  "generic_smooth": {
    "id": "generic_smooth",
    "name": "Obiettivo Generico — Interno Liscio Cilindrico",
    "description": "Per barilotti lisci o anelli gommati / cilindrici",
    "params": {
      "teeth": 100,
      "mod": 0.8,
      "height": 10.0,
      "chamfer": 0.50,
      "mount_type": "smooth",
      "d_inner": 62.00,
      "d_lip": 60.00,
      "h_lip": 1.2,
      "text": "LENS 50mm",
      "text_height": 3.5,
      "text_depth": 0.5,
      "text_angle": 45.0,
      "filename": "Custom Lens Focus Gear 0.8MOD.stl"
    }
  },
  "generic_ribbed": {
    "id": "generic_ribbed",
    "name": "Obiettivo Generico — Micro-Zigrinato",
    "description": "Per ghiere in metallo o plastica con zigrinature fini",
    "params": {
      "teeth": 100,
      "mod": 0.8,
      "height": 8.0,
      "chamfer": 0.50,
      "mount_type": "ribbed",
      "d_tip": 60.00,
      "d_root": 60.80,
      "n_ribs": 160,
      "d_lip": 58.50,
      "h_lip": 1.0,
      "text": "CINE GEAR",
      "text_height": 3.5,
      "text_depth": 0.5,
      "text_angle": 45.0,
      "filename": "Generic Ribbed Gear 0.8MOD.stl"
    }
  },
  "generic_lobed": {
    "id": "generic_lobed",
    "name": "Obiettivo Generico — Tasche a Lobi Vintage",
    "description": "Per ghiere vintage a settori concavi / lobi",
    "params": {
      "teeth": 100,
      "mod": 0.8,
      "height": 10.0,
      "chamfer": 0.50,
      "mount_type": "lobed",
      "d_pocket": 63.00,
      "d_flat": 61.50,
      "n_lobes": 10,
      "d_lip": 59.50,
      "h_lip": 1.2,
      "text": "VINTAGE LENS",
      "text_height": 3.5,
      "text_depth": 0.5,
      "text_angle": 45.0,
      "filename": "Generic Lobed Gear 0.8MOD.stl"
    }
  }
};

// DOM Elements
const container = document.getElementById("canvasContainer");
const presetSelect = document.getElementById("presetSelect");
const presetDesc = document.getElementById("presetDesc");
const mountTabs = document.querySelectorAll(".tab-btn");
const mountLobed = document.getElementById("mountLobedFields");
const mountRibbed = document.getElementById("mountRibbedFields");
const mountSmooth = document.getElementById("mountSmoothFields");
const enableText = document.getElementById("enableText");
const textFieldsGroup = document.getElementById("textFieldsGroup");

const selectDiameter = document.getElementById("select_diameter");
const pitchDiameter = document.getElementById("pitch_diameter");
const gearTeeth = document.getElementById("gear_teeth");
const outerDiameterCalc = document.getElementById("outer_diameter_calc");

const selectWall = document.getElementById("select_wall");
const wallThickness = document.getElementById("wall_thickness");

const selectHeight = document.getElementById("select_height");
const gearHeight = document.getElementById("gear_height");

const selectChamfer = document.getElementById("select_chamfer");
const gearChamfer = document.getElementById("gear_chamfer");

const selectDepth = document.getElementById("select_depth");
const textDepth = document.getElementById("text_depth");

const selectLobes = document.getElementById("select_lobes");
const nLobes = document.getElementById("n_lobes");

const selectRibs = document.getElementById("select_ribs");
const nRibs = document.getElementById("n_ribs");

const selectLipThickness = document.getElementById("select_lip_thickness");

const btnPreview = document.getElementById("btnPreview");
const btnExport = document.getElementById("btnExport");
const loaderOverlay = document.getElementById("loaderOverlay");
const loaderText = document.getElementById("loaderText");

const hudWatertight = document.getElementById("hudWatertight");
const hudWall = document.getElementById("hudWall");
const hudFaces = document.getElementById("hudFaces");
const hudDims = document.getElementById("hudDims");
const hudTime = document.getElementById("hudTime");

const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastDesc = document.getElementById("toastDesc");
const btnOpenDesktop = document.getElementById("btnOpenDesktop");

// --- 1. THREE.JS INITIALIZATION ---
function initThree() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
  camera.position.set(90, 80, 110);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0, 5);
  controls.maxDistance = 400;
  controls.minDistance = 20;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(70, 100, 80);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.0001;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x7fb5ff, 0.7);
  fillLight.position.set(-80, 40, -60);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.5);
  rimLight.position.set(0, -60, -90);
  scene.add(rimLight);

  const plateGeo = new THREE.CylinderGeometry(55, 55, 1.5, 64);
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x121722,
    roughness: 0.8,
    metalness: 0.1
  });
  const buildPlate = new THREE.Mesh(plateGeo, plateMat);
  buildPlate.position.set(0, 0, -0.75);
  buildPlate.rotation.x = Math.PI / 2;
  buildPlate.receiveShadow = true;
  scene.add(buildPlate);

  const gridHelper = new THREE.PolarGridHelper(52, 8, 8, 64, 0x2b3345, 0x1c222e);
  gridHelper.rotation.x = Math.PI / 2;
  gridHelper.position.set(0, 0, 0.05);
  scene.add(gridHelper);

  window.addEventListener("resize", onWindowResize);
  animate();
}

function onWindowResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  requestAnimationFrame(animate);
  if (isTurntable && currentMesh) {
    currentMesh.rotation.z += 0.008;
    if (currentWireMesh) currentWireMesh.rotation.z += 0.008;
  }
  controls.update();
  renderer.render(scene, camera);
}

// --- HELPER: EFFECTIVE LENS DIAMETER & WALL THICKNESS ---
function getEffectiveLensDiameter() {
  if (currentMountType === "lobed") {
    return parseFloat(document.getElementById("d_pocket").value) || 59.10;
  } else if (currentMountType === "ribbed") {
    return parseFloat(document.getElementById("d_root").value) || 58.16;
  } else {
    return parseFloat(document.getElementById("d_inner").value) || 58.00;
  }
}

function updateWallThicknessHUD() {
  const z = parseInt(gearTeeth.value) || 100;
  const d_pitch = z * 0.8;
  const d_root_gear = d_pitch - 2.0;
  const d_lens = getEffectiveLensDiameter();
  const t_wall = (d_root_gear - d_lens) / 2.0;

  wallThickness.value = Math.max(0.0, t_wall).toFixed(1);
  if (outerDiameterCalc) {
    outerDiameterCalc.value = `${(d_pitch + 1.6).toFixed(1)} mm`;
  }

  if (hudWall) {
    if (t_wall >= 3.0) {
      hudWall.textContent = `${t_wall.toFixed(1)} mm (Ottimo)`;
      hudWall.className = "hud-val highlight-green";
    } else if (t_wall >= 2.0) {
      hudWall.textContent = `${t_wall.toFixed(1)} mm (Buono)`;
      hudWall.className = "hud-val highlight-green";
    } else if (t_wall >= 1.4) {
      hudWall.textContent = `${t_wall.toFixed(1)} mm (Minimo)`;
      hudWall.className = "hud-val highlight-yellow";
    } else {
      hudWall.textContent = `${t_wall.toFixed(1)} mm (Troppo sottile!)`;
      hudWall.className = "hud-val highlight-red";
    }
  }

  return t_wall;
}

// --- 2. DISPLAY WASM MESH IN SCENE ---
function displayWasmMesh(mesh, calcTime) {
  lastGeneratedMesh = mesh;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.vertProperties, mesh.numProp));
  geometry.setIndex(new THREE.BufferAttribute(mesh.triVerts, 1));
  geometry.computeVertexNormals();

  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
  }
  if (currentWireMesh) {
    scene.remove(currentWireMesh);
    currentWireMesh.geometry.dispose();
  }

  const material = new THREE.MeshStandardMaterial({
    color: 0x3d4858,
    roughness: 0.32,
    metalness: 0.22,
    flatShading: false
  });

  currentMesh = new THREE.Mesh(geometry, material);
  currentMesh.castShadow = true;
  currentMesh.receiveShadow = true;
  scene.add(currentMesh);

  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    wireframe: true,
    transparent: true,
    opacity: 0.25
  });
  currentWireMesh = new THREE.Mesh(geometry, wireMat);
  currentWireMesh.visible = isWireframe;
  scene.add(currentWireMesh);

  hudWatertight.textContent = "100% Watertight (Manifold WASM)";
  hudWatertight.className = "hud-val highlight-green";
  hudFaces.textContent = Number(mesh.numTri).toLocaleString();
  hudTime.textContent = `${calcTime} s`;

  const teeth = parseInt(gearTeeth.value) || 100;
  const h = parseFloat(gearHeight.value) || 10.5;
  const d_ext = (teeth * 0.8 + 1.6).toFixed(1);
  hudDims.textContent = `Ø ${d_ext} × ${h} mm`;

  updateWallThicknessHUD();
}

// --- 3. GATHER PARAMETERS FROM FORM ---
function collectParams() {
  const teeth = parseInt(gearTeeth.value) || 100;
  const h = parseFloat(gearHeight.value) || 10.5;
  const ch = parseFloat(gearChamfer.value) || 0.6;
  const hasText = enableText.checked;
  const textStr = hasText ? document.getElementById("engrave_text").value.trim() : "";

  const params = {
    teeth: teeth,
    mod: 0.8,
    height: h,
    chamfer: ch,
    mount_type: currentMountType,
    text: textStr,
    text_height: parseFloat(document.getElementById("text_height").value) || 3.5,
    text_depth: parseFloat(textDepth.value) || 0.6,
    text_angle: 45.0
  };

  if (currentMountType === "lobed") {
    params.n_lobes = parseInt(nLobes.value) || 12;
    params.d_pocket = parseFloat(document.getElementById("d_pocket").value) || 59.10;
    params.d_flat = parseFloat(document.getElementById("d_flat").value) || 57.80;
    params.d_lip = parseFloat(document.getElementById("d_lip_lobed").value) || 56.00;
    params.h_lip = parseFloat(document.getElementById("h_lip_lobed").value) || 1.40;
  } else if (currentMountType === "ribbed") {
    params.n_ribs = parseInt(nRibs.value) || 160;
    params.d_tip = parseFloat(document.getElementById("d_tip").value) || 57.20;
    params.d_root = parseFloat(document.getElementById("d_root").value) || 58.16;
    params.d_lip = parseFloat(document.getElementById("d_lip_ribbed").value) || 56.50;
    params.h_lip = parseFloat(document.getElementById("h_lip_ribbed").value) || 0.80;
  } else { // smooth
    params.d_inner = parseFloat(document.getElementById("d_inner").value) || 58.00;
    params.d_lip = parseFloat(document.getElementById("d_lip_smooth").value) || 56.00;
    params.h_lip = parseFloat(document.getElementById("h_lip_smooth").value) || 1.20;
  }

  return params;
}

function debouncedPreview(delay = 350) {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    runPreview();
  }, delay);
}

// --- 4. RUN WASM PREVIEW & DOWNLOAD ---
async function runPreview() {
  loaderOverlay.classList.remove("hidden");
  loaderText.textContent = "Calcolo WASM Manifold 3D in corso...";

  try {
    const params = collectParams();
    const result = await generateCineGearWasm(params);
    displayWasmMesh(result.mesh, result.calcTime);
  } catch (err) {
    console.error(err);
    alert("Errore calcolo 3D WebAssembly: " + err.message);
  } finally {
    loaderOverlay.classList.add("hidden");
  }
}

function triggerDownloadSTL() {
  if (!lastGeneratedMesh) {
    alert("Generazione del modello in corso, attendi un secondo...");
    return;
  }
  const filename = document.getElementById("export_filename").value.trim() || "CineGear_0.8MOD.stl";
  const res = downloadSTL(lastGeneratedMesh, filename);

  toastTitle.textContent = "File STL Scaricato!";
  toastDesc.textContent = `${res.filename} (${res.size_kb} KB)`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 6000);
}

// Helper to match or set 'custom' in a select
function syncSelectToValue(selectEl, value) {
  if (!selectEl) return;
  let matched = false;
  const numVal = parseFloat(value);
  for (let i = 0; i < selectEl.options.length; i++) {
    const optVal = parseFloat(selectEl.options[i].value);
    if (!isNaN(optVal) && Math.abs(optVal - numVal) < 0.05) {
      selectEl.selectedIndex = i;
      matched = true;
      break;
    }
  }
  if (!matched) {
    selectEl.value = "custom";
  }
}

function setLipHeight(val) {
  const h_num = parseFloat(val);
  if (currentMountType === "lobed") {
    document.getElementById("h_lip_lobed").value = h_num.toFixed(2);
  } else if (currentMountType === "ribbed") {
    document.getElementById("h_lip_ribbed").value = h_num.toFixed(2);
  } else {
    document.getElementById("h_lip_smooth").value = h_num.toFixed(2);
  }
  syncSelectToValue(selectLipThickness, h_num);
}

function getCurrentLipHeight() {
  if (currentMountType === "lobed") {
    return parseFloat(document.getElementById("h_lip_lobed").value) || 1.40;
  } else if (currentMountType === "ribbed") {
    return parseFloat(document.getElementById("h_lip_ribbed").value) || 0.80;
  } else {
    return parseFloat(document.getElementById("h_lip_smooth").value) || 1.20;
  }
}

// --- 5. UI EVENT LISTENERS ---
function setupUI() {
  // 1. DIAMETER / TEETH CONTROLS
  selectDiameter.addEventListener("change", (e) => {
    if (e.target.value !== "custom") {
      const d = parseFloat(e.target.value);
      pitchDiameter.value = d.toFixed(1);
      const z = Math.round(d / 0.8);
      gearTeeth.value = z;
      updateWallThicknessHUD();
      selectWall.value = "auto";
      runPreview();
    } else {
      pitchDiameter.focus();
    }
  });

  pitchDiameter.addEventListener("input", (e) => {
    const d = parseFloat(e.target.value);
    if (!isNaN(d) && d > 20) {
      const z = Math.round(d / 0.8);
      gearTeeth.value = z;
      syncSelectToValue(selectDiameter, d);
      updateWallThicknessHUD();
      selectWall.value = "custom";
      debouncedPreview();
    }
  });

  gearTeeth.addEventListener("input", (e) => {
    const z = parseInt(e.target.value);
    if (!isNaN(z) && z > 20) {
      const d = z * 0.8;
      pitchDiameter.value = d.toFixed(1);
      syncSelectToValue(selectDiameter, d);
      updateWallThicknessHUD();
      selectWall.value = "custom";
      debouncedPreview();
    }
  });

  // 2. WALL THICKNESS CONTROLS
  selectWall.addEventListener("change", (e) => {
    if (e.target.value === "auto") {
      updateWallThicknessHUD();
      return;
    }
    if (e.target.value !== "custom") {
      const t_target = parseFloat(e.target.value);
      const d_lens = getEffectiveLensDiameter();
      const target_d_pitch = d_lens + 2.0 * t_target + 2.0;
      const z = Math.round(target_d_pitch / 0.8);
      const exact_d_pitch = z * 0.8;

      gearTeeth.value = z;
      pitchDiameter.value = exact_d_pitch.toFixed(1);
      syncSelectToValue(selectDiameter, exact_d_pitch);
      updateWallThicknessHUD();
      runPreview();
    } else {
      wallThickness.focus();
    }
  });

  wallThickness.addEventListener("input", (e) => {
    const t = parseFloat(e.target.value);
    if (!isNaN(t) && t > 1.0) {
      const d_lens = getEffectiveLensDiameter();
      const target_d_pitch = d_lens + 2.0 * t + 2.0;
      const z = Math.round(target_d_pitch / 0.8);
      const exact_d_pitch = z * 0.8;

      gearTeeth.value = z;
      pitchDiameter.value = exact_d_pitch.toFixed(1);
      syncSelectToValue(selectDiameter, exact_d_pitch);
      syncSelectToValue(selectWall, t);
      updateWallThicknessHUD();
      debouncedPreview();
    }
  });

  // 3. LIP THICKNESS
  selectLipThickness.addEventListener("change", (e) => {
    if (e.target.value !== "custom") {
      setLipHeight(e.target.value);
      runPreview();
    }
  });

  ["h_lip_lobed", "h_lip_ribbed", "h_lip_smooth"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", (e) => {
        syncSelectToValue(selectLipThickness, e.target.value);
        debouncedPreview();
      });
    }
  });

  // 4. HEIGHT CONTROLS
  selectHeight.addEventListener("change", (e) => {
    if (e.target.value !== "custom") {
      gearHeight.value = parseFloat(e.target.value).toFixed(2);
      runPreview();
    } else {
      gearHeight.focus();
    }
  });

  gearHeight.addEventListener("input", (e) => {
    const h = parseFloat(e.target.value);
    syncSelectToValue(selectHeight, h);
    debouncedPreview();
  });

  // 5. CHAMFER CONTROLS
  selectChamfer.addEventListener("change", (e) => {
    if (e.target.value !== "custom") {
      gearChamfer.value = parseFloat(e.target.value).toFixed(2);
      runPreview();
    } else {
      gearChamfer.focus();
    }
  });

  gearChamfer.addEventListener("input", (e) => {
    const ch = parseFloat(e.target.value);
    syncSelectToValue(selectChamfer, ch);
    debouncedPreview();
  });

  // 6. DEPTH CONTROLS
  selectDepth.addEventListener("change", (e) => {
    if (e.target.value !== "custom") {
      textDepth.value = parseFloat(e.target.value).toFixed(2);
      runPreview();
    } else {
      textDepth.focus();
    }
  });

  textDepth.addEventListener("input", (e) => {
    const d = parseFloat(e.target.value);
    syncSelectToValue(selectDepth, d);
    debouncedPreview();
  });

  // 7. LOBES CONTROLS
  selectLobes.addEventListener("change", (e) => {
    if (e.target.value !== "custom") {
      nLobes.value = parseInt(e.target.value);
      runPreview();
    } else {
      nLobes.focus();
    }
  });

  nLobes.addEventListener("input", (e) => {
    syncSelectToValue(selectLobes, e.target.value);
    debouncedPreview();
  });

  // 8. RIBS CONTROLS
  selectRibs.addEventListener("change", (e) => {
    if (e.target.value !== "custom") {
      nRibs.value = parseInt(e.target.value);
      runPreview();
    } else {
      nRibs.focus();
    }
  });

  nRibs.addEventListener("input", (e) => {
    syncSelectToValue(selectRibs, e.target.value);
    debouncedPreview();
  });

  // Mount tabs
  mountTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      mountTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentMountType = tab.getAttribute("data-type");

      mountLobed.classList.add("hidden");
      mountRibbed.classList.add("hidden");
      mountSmooth.classList.add("hidden");

      if (currentMountType === "lobed") mountLobed.classList.remove("hidden");
      else if (currentMountType === "ribbed") mountRibbed.classList.remove("hidden");
      else mountSmooth.classList.remove("hidden");

      syncSelectToValue(selectLipThickness, getCurrentLipHeight());
      updateWallThicknessHUD();
      runPreview();
    });
  });

  // Text toggle & input
  enableText.addEventListener("change", () => {
    textFieldsGroup.style.opacity = enableText.checked ? "1" : "0.35";
    textFieldsGroup.style.pointerEvents = enableText.checked ? "auto" : "none";
    runPreview();
  });

  document.getElementById("engrave_text").addEventListener("input", () => {
    debouncedPreview(500);
  });

  // Caliper inputs auto preview & wall recalculation
  ["d_pocket", "d_flat", "d_lip_lobed", "d_tip", "d_root", "d_lip_ribbed", "d_inner", "d_lip_smooth"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        updateWallThicknessHUD();
        debouncedPreview(450);
      });
    }
  });

  // Action buttons
  btnPreview.addEventListener("click", runPreview);
  btnExport.addEventListener("click", triggerDownloadSTL);

  // Preset selector
  presetSelect.addEventListener("change", (e) => {
    const pId = e.target.value;
    if (!pId || !PRESETS[pId]) return;
    applyPreset(PRESETS[pId]);
  });

  // Camera presets
  document.getElementById("btnViewIso").addEventListener("click", () => {
    setCameraView(90, 80, 110, 0, 0, 5);
  });
  document.getElementById("btnViewTop").addEventListener("click", () => {
    setCameraView(0, 0, 150, 0, 0, 5);
  });
  document.getElementById("btnViewSide").addEventListener("click", () => {
    setCameraView(150, 0, 5, 0, 0, 5);
  });
  document.getElementById("btnViewCut").addEventListener("click", () => {
    setCameraView(0, 0, -150, 0, 0, 5);
  });

  document.getElementById("btnToggleTurntable").addEventListener("click", (e) => {
    isTurntable = !isTurntable;
    e.target.classList.toggle("active", isTurntable);
  });

  document.getElementById("btnToggleWire").addEventListener("click", (e) => {
    isWireframe = !isWireframe;
    e.target.classList.toggle("active", isWireframe);
    if (currentWireMesh) currentWireMesh.visible = isWireframe;
  });
}

function setCameraView(x, y, z, tx, ty, tz) {
  camera.position.set(x, y, z);
  controls.target.set(tx, ty, tz);
  controls.update();
}

function applyPreset(p) {
  presetDesc.textContent = p.description || "";
  const params = p.params;

  gearHeight.value = params.height;
  syncSelectToValue(selectHeight, params.height);

  gearTeeth.value = params.teeth;
  const d = params.teeth * 0.8;
  pitchDiameter.value = d.toFixed(1);
  syncSelectToValue(selectDiameter, d);

  gearChamfer.value = params.chamfer || 0.6;
  syncSelectToValue(selectChamfer, params.chamfer || 0.6);

  if (params.filename) {
    document.getElementById("export_filename").value = params.filename;
  }

  // Text
  if (params.text) {
    enableText.checked = true;
    document.getElementById("engrave_text").value = params.text;
    document.getElementById("text_height").value = params.text_height || 3.5;
    textDepth.value = params.text_depth || 0.6;
    syncSelectToValue(selectDepth, params.text_depth || 0.6);
    textFieldsGroup.style.opacity = "1";
    textFieldsGroup.style.pointerEvents = "auto";
  } else {
    enableText.checked = false;
    textFieldsGroup.style.opacity = "0.35";
    textFieldsGroup.style.pointerEvents = "none";
  }

  // Mount type
  currentMountType = params.mount_type;
  mountTabs.forEach(t => {
    if (t.getAttribute("data-type") === currentMountType) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  mountLobed.classList.add("hidden");
  mountRibbed.classList.add("hidden");
  mountSmooth.classList.add("hidden");

  if (currentMountType === "lobed") {
    mountLobed.classList.remove("hidden");
    nLobes.value = params.n_lobes || 12;
    syncSelectToValue(selectLobes, params.n_lobes || 12);
    document.getElementById("d_pocket").value = params.d_pocket;
    document.getElementById("d_flat").value = params.d_flat;
    document.getElementById("d_lip_lobed").value = params.d_lip;
    document.getElementById("h_lip_lobed").value = params.h_lip;
  } else if (currentMountType === "ribbed") {
    mountRibbed.classList.remove("hidden");
    nRibs.value = params.n_ribs || 160;
    syncSelectToValue(selectRibs, params.n_ribs || 160);
    document.getElementById("d_tip").value = params.d_tip;
    document.getElementById("d_root").value = params.d_root;
    document.getElementById("d_lip_ribbed").value = params.d_lip;
    document.getElementById("h_lip_ribbed").value = params.h_lip;
  } else {
    mountSmooth.classList.remove("hidden");
    document.getElementById("d_inner").value = params.d_inner;
    document.getElementById("d_lip_smooth").value = params.d_lip;
    document.getElementById("h_lip_smooth").value = params.h_lip;
  }

  syncSelectToValue(selectLipThickness, params.h_lip);
  updateWallThicknessHUD();
  runPreview();
}

// --- 6. INIT ON PAGE LOAD ---
window.addEventListener("DOMContentLoaded", async () => {
  initThree();
  setupUI();

  // Populate presets dropdown
  presetSelect.innerHTML = "";
  Object.keys(PRESETS).forEach(key => {
    const p = PRESETS[key];
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = p.name;
    presetSelect.appendChild(opt);
  });

  // Default select Mir-1B Focus
  if (PRESETS["mir_1b_focus"]) {
    presetSelect.value = "mir_1b_focus";
    applyPreset(PRESETS["mir_1b_focus"]);
  } else {
    runPreview();
  }
});
