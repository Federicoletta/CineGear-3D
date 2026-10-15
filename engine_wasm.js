// CineGear 3D Generator — 100% Client-Side WebAssembly CAD Engine
// Powered by Manifold3D (WASM) & Three.js

let wasmInstance = null;
let defaultFont = null;

export async function initWasmEngine() {
  if (wasmInstance) return wasmInstance;
  const manifoldModule = (await import('./wasm/manifold.js')).default;
  wasmInstance = await manifoldModule({
    locateFile: () => './wasm/manifold.wasm'
  });
  wasmInstance.setup();
  return wasmInstance;
}

export async function loadDefaultFont() {
  if (defaultFont) return defaultFont;
  const resp = await fetch('./font.json');
  const json = await resp.json();
  defaultFont = new THREE.Font(json);
  return defaultFont;
}

// 1. INVOLUTE GEAR PROFILE (0.8 MOD)
export function createGearProfile(Z = 100, m = 0.8, alpha_deg = 20.0) {
  const alpha = (alpha_deg * Math.PI) / 180.0;
  const Rp = (m * Z) / 2.0;
  const Ro = Rp + 1.0 * m;
  const Rr = Rp - 1.25 * m;
  const Rb = Rp * Math.cos(alpha);

  const pitch_angle = (2.0 * Math.PI) / Z;
  const half_tooth_angle = (Math.PI * m / 2.0) / (2.0 * Rp);
  const inv_alpha = Math.tan(alpha) - alpha;

  const n_flank = 8;
  const r_vals = [];
  for (let i = 0; i < n_flank; i++) {
    r_vals.push(Rr + (Ro - Rr) * (i / (n_flank - 1)));
  }

  const theta_flank = [];
  for (const r of r_vals) {
    const ar = (r < Rb) ? 0.0 : Math.acos(Rb / r);
    const inv_ar = Math.tan(ar) - ar;
    const th = half_tooth_angle + inv_alpha - inv_ar;
    theta_flank.push(th);
  }

  const pts = [];
  for (let i = 0; i < Z; i++) {
    const mid_angle = i * pitch_angle;
    // Ascending flank
    for (let j = 0; j < n_flank; j++) {
      const a = mid_angle - theta_flank[j];
      pts.push([r_vals[j] * Math.cos(a), r_vals[j] * Math.sin(a)]);
    }
    // Descending flank
    for (let j = n_flank - 1; j >= 0; j--) {
      const a = mid_angle + theta_flank[j];
      pts.push([r_vals[j] * Math.cos(a), r_vals[j] * Math.sin(a)]);
    }
    // Root arc
    const next_mid = (i + 1) * pitch_angle;
    const root_start = mid_angle + theta_flank[0];
    const root_end = next_mid - theta_flank[0];
    const root_thetas = [
      root_start + (root_end - root_start) * (1 / 3),
      root_start + (root_end - root_start) * (2 / 3)
    ];
    for (const a of root_thetas) {
      pts.push([Rr * Math.cos(a), Rr * Math.sin(a)]);
    }
  }
  return pts;
}

// 2. CHAMFERED GEAR BODY
export function makeChamferedGearBody(wasm, Z = 100, m = 0.8, H = 10.0, ch = 0.5) {
  const gear_pts = createGearProfile(Z, m);
  const cs = new wasm.CrossSection([gear_pts]);
  const gear_solid = wasm.Manifold.extrude(cs, H);

  const Ro = (m * Z) / 2.0 + 1.0 * m;
  const ch_clamped = Math.min(ch, H * 0.25);
  const env_pts = [
    [0.0, 0.0],
    [Ro - ch_clamped, 0.0],
    [Ro, ch_clamped],
    [Ro, H - ch_clamped],
    [Ro - ch_clamped, H],
    [0.0, H]
  ];
  const env_cs = new wasm.CrossSection([env_pts]);
  const envelope = wasm.Manifold.revolve(env_cs, 120);

  return gear_solid.intersect(envelope);
}

// 3. INTERNAL BORES
export function makeSmoothCore(wasm, H, d_inner, d_lip, h_lip) {
  const R_inner = d_inner / 2.0;
  const R_lip = d_lip > 0 ? d_lip / 2.0 : R_inner;
  const eff_h_lip = (d_lip > 0 && h_lip > 0) ? Math.min(h_lip, H - 0.5) : 0.0;

  let pts;
  if (eff_h_lip > 0 && R_lip < R_inner) {
    pts = [
      [0.0, -2.0],
      [R_inner, -2.0],
      [R_inner, H - eff_h_lip],
      [R_lip, H - eff_h_lip],
      [R_lip, H + 2.0],
      [0.0, H + 2.0]
    ];
  } else {
    pts = [
      [0.0, -2.0],
      [R_inner, -2.0],
      [R_inner, H + 2.0],
      [0.0, H + 2.0]
    ];
  }

  const ch_in = 0.8;
  const cone_pts = [
    [0.0, -1.0],
    [R_inner + ch_in, -1.0],
    [R_inner - 0.2, ch_in],
    [0.0, ch_in]
  ];

  const bore_solid = wasm.Manifold.revolve(new wasm.CrossSection([pts]), 120);
  const cone_solid = wasm.Manifold.revolve(new wasm.CrossSection([cone_pts]), 120);
  return bore_solid.add(cone_solid);
}

export function makeRibbedCore(wasm, H, d_tip, d_root, n_ribs, d_lip, h_lip) {
  const R_tip = d_tip / 2.0;
  const R_root = d_root / 2.0;
  const R_lip = d_lip > 0 ? d_lip / 2.0 : R_tip;
  const eff_h_lip = (d_lip > 0 && h_lip > 0) ? Math.min(h_lip, H - 0.5) : 0.0;

  const pts = [];
  const d_theta = (2.0 * Math.PI) / n_ribs;
  for (let i = 0; i < n_ribs; i++) {
    const th0 = i * d_theta;
    const th_mid = th0 + 0.5 * d_theta;
    pts.push([R_root * Math.cos(th0), R_root * Math.sin(th0)]);
    pts.push([R_tip * Math.cos(th_mid), R_tip * Math.sin(th_mid)]);
  }

  const cs_ribs = new wasm.CrossSection([pts]);
  const ribs_h = eff_h_lip > 0 ? (H - eff_h_lip) : H;
  const ribs_solid = wasm.Manifold.extrude(cs_ribs, ribs_h + 1.0).translate([0, 0, -1.0]);

  const bore_pts = [[0.0, -2.0], [R_lip, -2.0], [R_lip, H + 2.0], [0.0, H + 2.0]];
  const bore_solid = wasm.Manifold.revolve(new wasm.CrossSection([bore_pts]), 120);

  const cone_pts = [[0.0, -1.0], [R_root + 0.8, -1.0], [R_root - 0.5, 0.8], [0.0, 0.8]];
  const cone_solid = wasm.Manifold.revolve(new wasm.CrossSection([cone_pts]), 120);

  return ribs_solid.add(bore_solid).add(cone_solid);
}

export function makeLobedCore(wasm, H, d_pocket, d_flat, n_lobes, d_lip, h_lip) {
  const R_pocket = d_pocket / 2.0;
  const R_flat = d_flat / 2.0;
  const R_lip = d_lip > 0 ? d_lip / 2.0 : R_flat;
  const eff_h_lip = (d_lip > 0 && h_lip > 0) ? Math.min(h_lip, H - 0.5) : 0.0;

  const pts_pocket = [];
  const n_pts_per_lobe = 16;
  for (let i = 0; i < n_lobes; i++) {
    const a_center = i * (2.0 * Math.PI / n_lobes);
    for (let j = 0; j < n_pts_per_lobe; j++) {
      const deg_rel = -15.0 + (30.0 * j) / n_pts_per_lobe;
      const d = Math.abs(deg_rel);
      let r;
      if (d <= 8.5) r = R_pocket;
      else if (d >= 11.5) r = R_flat;
      else {
        const t = (d - 8.5) / 3.0;
        r = R_pocket * (1.0 - t) + R_flat * t;
      }
      const th = a_center + (deg_rel * Math.PI) / 180.0;
      pts_pocket.push([r * Math.cos(th), r * Math.sin(th)]);
    }
  }

  const cs_pocket = new wasm.CrossSection([pts_pocket]);
  const pocket_h = eff_h_lip > 0 ? (H - eff_h_lip) : H;
  const pocket_solid = wasm.Manifold.extrude(cs_pocket, pocket_h + 1.0).translate([0, 0, -1.0]);

  const bore_pts = [[0.0, -2.0], [R_lip, -2.0], [R_lip, H + 2.0], [0.0, H + 2.0]];
  const bore_solid = wasm.Manifold.revolve(new wasm.CrossSection([bore_pts]), 120);

  const cone_pts = [[0.0, -1.0], [R_pocket + 0.8, -1.0], [R_pocket - 0.5, 0.8], [0.0, 0.8]];
  const cone_solid = wasm.Manifold.revolve(new wasm.CrossSection([cone_pts]), 120);

  return pocket_solid.add(bore_solid).add(cone_solid);
}

// 4. CIRCULAR TEXT CUTTER
export function buildCircularTextCutter(wasm, font, text, R_text = 33.8, target_h = 3.5, depth = 0.5, Z_top = 10.0, center_angle_deg = 45.0) {
  if (!text || !text.trim() || !font) return null;
  text = text.trim();

  const charShapes = [];
  const charWidths = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === ' ') {
      charShapes.push(null);
      charWidths.push(target_h * 0.4);
      continue;
    }
    const shapes = font.generateShapes(c, target_h);
    charShapes.push(shapes);
    // Measure bbox
    let minX = Infinity, maxX = -Infinity;
    for (const sh of shapes) {
      const pts = sh.getPoints();
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      }
    }
    const cw = (maxX > minX) ? (maxX - minX) : target_h * 0.5;
    charWidths.push(cw);
  }

  const spacing = target_h * 0.18;
  const total_arc_len = charWidths.reduce((a, b) => a + b, 0) + (text.length - 1) * spacing;
  const total_angle = total_arc_len / Math.max(R_text, 1.0);

  const center_ang = (center_angle_deg * Math.PI) / 180.0;
  const start_angle = center_ang + total_angle / 2.0;
  let curr_angle = start_angle;

  let combinedCutters = null;

  for (let i = 0; i < text.length; i++) {
    const w = charWidths[i];
    const half_ang = (w / 2.0) / R_text;
    const ang = curr_angle - half_ang;
    const shapes = charShapes[i];

    if (shapes && shapes.length > 0) {
      const charContours = [];
      for (const sh of shapes) {
        const outer = sh.getPoints(10).map(p => [p.x - w / 2.0, p.y - target_h / 2.0]);
        charContours.push(outer);
        if (sh.holes && sh.holes.length > 0) {
          for (const hole of sh.holes) {
            const holePts = hole.getPoints(8).map(p => [p.x - w / 2.0, p.y - target_h / 2.0]);
            charContours.push(holePts);
          }
        }
      }

      if (charContours.length > 0) {
        const cs = new wasm.CrossSection(charContours, wasm.fillrule.EvenOdd);
        let charSolid = wasm.Manifold.extrude(cs, depth + 0.3);

        // Rotate to tangent angle and translate to circle arc position
        const rotDeg = ((ang - Math.PI / 2.0) * 180.0) / Math.PI;
        const tx = R_text * Math.cos(ang);
        const ty = R_text * Math.sin(ang);
        const tz = Z_top - depth;

        charSolid = charSolid.rotate([0, 0, rotDeg]).translate([tx, ty, tz]);

        if (!combinedCutters) {
          combinedCutters = charSolid;
        } else {
          combinedCutters = combinedCutters.add(charSolid);
        }
      }
    }
    curr_angle -= (w + spacing) / R_text;
  }

  return combinedCutters;
}

// 5. MASTER GENERATOR
export async function generateCineGearWasm(params) {
  const wasm = await initWasmEngine();
  const font = await loadDefaultFont();

  const Z = parseInt(params.teeth) || 100;
  const m = parseFloat(params.mod) || 0.8;
  const H = parseFloat(params.height) || 10.0;
  const ch = parseFloat(params.chamfer) || 0.5;
  const mount_type = params.mount_type || 'smooth';

  const t0 = performance.now();

  const gear_body = makeChamferedGearBody(wasm, Z, m, H, ch);

  const d_lip = parseFloat(params.d_lip) || 0.0;
  const h_lip = parseFloat(params.h_lip) || 0.0;

  let core, effective_inner_r;

  if (mount_type === 'ribbed') {
    const d_tip = parseFloat(params.d_tip) || 57.0;
    const d_root = parseFloat(params.d_root) || 58.0;
    const n_ribs = parseInt(params.n_ribs) || 160;
    core = makeRibbedCore(wasm, H, d_tip, d_root, n_ribs, d_lip, h_lip);
    effective_inner_r = d_root / 2.0;
  } else if (mount_type === 'lobed') {
    const d_pocket = parseFloat(params.d_pocket) || 59.0;
    const d_flat = parseFloat(params.d_flat) || 57.5;
    const n_lobes = parseInt(params.n_lobes) || 12;
    core = makeLobedCore(wasm, H, d_pocket, d_flat, n_lobes, d_lip, h_lip);
    effective_inner_r = d_pocket / 2.0;
  } else {
    const d_inner = parseFloat(params.d_inner) || 56.0;
    core = makeSmoothCore(wasm, H, d_inner, d_lip, h_lip);
    effective_inner_r = d_inner / 2.0;
  }

  let finalGear = gear_body.subtract(core);

  // Text Engraving
  const text = (params.text || '').trim();
  if (text) {
    const target_h = parseFloat(params.text_height) || 3.5;
    const depth = parseFloat(params.text_depth) || 0.5;
    const Rp = (m * Z) / 2.0;
    const Rr = Rp - 1.25 * m;
    const R_text = params.text_radius ? parseFloat(params.text_radius) : (effective_inner_r + Rr) / 2.0;
    const center_angle = parseFloat(params.text_angle) || 45.0;

    const cutter = buildCircularTextCutter(wasm, font, text, R_text, target_h, depth, H, center_angle);
    if (cutter) {
      finalGear = finalGear.subtract(cutter);
    }
  }

  const calcTime = ((performance.now() - t0) / 1000.0).toFixed(3);
  const mesh = finalGear.getMesh();

  return {
    manifold: finalGear,
    mesh: mesh,
    calcTime: calcTime
  };
}

// 6. BINARY STL SERIALIZER
export function meshToBinarySTL(mesh) {
  const numTri = mesh.numTri;
  const buffer = new ArrayBuffer(84 + numTri * 50);
  const view = new DataView(buffer);

  for (let i = 0; i < 80; i++) view.setUint8(i, 32);
  view.setUint32(80, numTri, true);

  const vp = mesh.vertProperties;
  const tv = mesh.triVerts;
  const numProp = mesh.numProp;

  let offset = 84;
  for (let i = 0; i < numTri; i++) {
    const i0 = tv[i * 3] * numProp;
    const i1 = tv[i * 3 + 1] * numProp;
    const i2 = tv[i * 3 + 2] * numProp;

    const ax = vp[i0], ay = vp[i0 + 1], az = vp[i0 + 2];
    const bx = vp[i1], by = vp[i1 + 1], bz = vp[i1 + 2];
    const cx = vp[i2], cy = vp[i2 + 1], cz = vp[i2 + 2];

    const v1x = bx - ax, v1y = by - ay, v1z = bz - az;
    const v2x = cx - ax, v2y = cy - ay, v2z = cz - az;
    let nx = v1y * v2z - v1z * v2y;
    let ny = v1z * v2x - v1x * v2z;
    let nz = v1x * v2y - v1y * v2x;
    const len = Math.hypot(nx, ny, nz);
    if (len > 0) { nx /= len; ny /= len; nz /= len; }

    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    view.setFloat32(offset, ax, true); offset += 4;
    view.setFloat32(offset, ay, true); offset += 4;
    view.setFloat32(offset, az, true); offset += 4;

    view.setFloat32(offset, bx, true); offset += 4;
    view.setFloat32(offset, by, true); offset += 4;
    view.setFloat32(offset, bz, true); offset += 4;

    view.setFloat32(offset, cx, true); offset += 4;
    view.setFloat32(offset, cy, true); offset += 4;
    view.setFloat32(offset, cz, true); offset += 4;

    view.setUint16(offset, 0, true); offset += 2;
  }
  return buffer;
}

export function downloadSTL(mesh, filename = "CineGear_0.8MOD.stl") {
  if (!filename.toLowerCase().endsWith(".stl")) {
    filename += ".stl";
  }
  const buffer = meshToBinarySTL(mesh);
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return {
    filename: filename,
    size_kb: (buffer.byteLength / 1024).toFixed(1)
  };
}
