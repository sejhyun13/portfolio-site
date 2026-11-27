import * as THREE from './assets/three/three.module.min.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function standard(color, metalness = 0.12, roughness = 0.33) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}

function mesh(group, geometry, material, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  group.add(item);
  return item;
}

function roundedSlab(width, height, depth, radius, bevel) {
  const left = -width / 2;
  const right = width / 2;
  const bottom = -height / 2;
  const top = height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(left + radius, bottom);
  shape.lineTo(right - radius, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + radius);
  shape.lineTo(right, top - radius);
  shape.quadraticCurveTo(right, top, right - radius, top);
  shape.lineTo(left + radius, top);
  shape.quadraticCurveTo(left, top, left, top - radius);
  shape.lineTo(left, bottom + radius);
  shape.quadraticCurveTo(left, bottom, left + radius, bottom);
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8,
  }).translate(0, 0, -depth / 2);
}

function orbit(group, radius, color, tilt) {
  const ring = mesh(group, new THREE.TorusGeometry(radius, .013, 8, 96), standard(color));
  ring.rotation.set(tilt, -.22, 0);
  return ring;
}

function phone(group) {
  const device = new THREE.Group();
  device.rotation.set(-.16, -.40, -.20);
  group.add(device);

  const ivory = standard(0xfffaf1, .16);
  const ink = standard(0x343020);
  const yellow = standard(0xffbb10, .08);
  mesh(device, roundedSlab(1.89, 3.46, .26, .22, .075), ivory);
  mesh(device, roundedSlab(1.8, 3.32, .035, .20, .018), ink, 0, 0, .19);
  mesh(device, roundedSlab(1.68, 3.19, .022, .16, .015), standard(0xffe39a), 0, 0, .222);
  mesh(device, roundedSlab(.42, .075, .018, .035, .008), ink, 0, 1.43, .255);
  mesh(device, roundedSlab(1.34, .84, .055, .11, .022), ivory, 0, .64, .29);

  const dot = new THREE.SphereGeometry(.085, 20, 12);
  mesh(device, dot, yellow, -.4, .78, .34);
  mesh(device, roundedSlab(.62, .075, .025, .035, .008), ink, .045, .78, .335);
  mesh(device, roundedSlab(.9, .05, .019, .025, .007), standard(0xc0a15c), -.075, .51, .336);

  const card = roundedSlab(.58, .66, .055, .08, .018);
  mesh(device, card, yellow, -.36, -.31, .287);
  mesh(device, card, ivory, .36, -.31, .287);
  mesh(device, roundedSlab(1.30, .33, .05, .09, .015), ivory, 0, -1.06, .286);
  mesh(device, roundedSlab(.72, .045, .015, .022, .006), standard(0xbba168), -.15, -1.06, .322);

  const ring = orbit(group, 2.05, 0xdfa00d, 1.12);
  const spark = new THREE.Group();
  spark.position.set(1.26, 1.13, .55);
  spark.rotation.z = .33;
  group.add(spark);
  for (const [x, y, size] of [[0, 0, .32], [.49, .43, .13], [-.13, -.49, .11]]) {
    const point = mesh(spark, new THREE.OctahedronGeometry(size), ivory, x, y);
    point.scale.set(.64, 1.34, .84);
  }

  return (progress) => {
    const flare = Math.sin(progress * Math.PI) ** 2;
    spark.position.y = 1.13 + .29 * flare;
    spark.rotation.z = .33 + .42 * flare;
    spark.scale.setScalar(1 + .32 * flare);
    ring.rotation.x = 1.12 - .16 * flare;
  };
}

function layers(group) {
  const frames = new THREE.Group();
  frames.rotation.set(-.24, -.38, -.16);
  group.add(frames);

  const plate = roundedSlab(2.81, 1.94, .125, .18, .048);
  const dark = standard(0x261745, .35);
  const violet = standard(0x8054e4, .19);
  const light = standard(0xe1c2ff, .12);
  const back = mesh(frames, plate, dark, -.53, -.54, -.58);
  const middle = mesh(frames, plate, violet, -.25, -.25, -.28);
  mesh(frames, plate, dark, .08, .08, .08);
  mesh(frames, roundedSlab(2.57, 1.68, .045, .12, .019), standard(0x382465), .08, .08, .187);

  // 프레임 앞면의 분할 마스크를 얕은 입체 도형으로 표현합니다.
  const mask = new THREE.Shape();
  mask.moveTo(-.68, -.26);
  mask.bezierCurveTo(-.82, .04, -.51, .12, -.44, .28);
  mask.bezierCurveTo(-.29, .74, .16, .65, .32, .35);
  mask.bezierCurveTo(.47, .13, .67, .04, .72, -.19);
  mask.bezierCurveTo(.72, -.50, .35, -.57, .01, -.47);
  mask.bezierCurveTo(-.28, -.39, -.55, -.51, -.68, -.26);
  const cutout = mesh(frames, new THREE.ExtrudeGeometry(mask, {
    depth: .08, bevelThickness: .028, bevelSize: .028, bevelSegments: 3, curveSegments: 12,
  }), light, .08, .07, .23);

  const horizontal = roundedSlab(.24, .032, .025, .015, .008);
  const vertical = roundedSlab(.032, .24, .025, .015, .008);
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      mesh(frames, horizontal, light, .08 + x * .86, .08 + y * .63, .24);
      mesh(frames, vertical, light, .08 + x * .97, .08 + y * .52, .24);
    }
  }

  orbit(group, 2.10, 0xb382ff, .81);
  mesh(group, new THREE.SphereGeometry(.085, 20, 12), light, 1.67, .96, .62);
  mesh(group, new THREE.SphereGeometry(.065, 20, 12), light, -1.77, -.66, -.36);

  return (progress) => {
    // 뒤쪽 프레임과 앞쪽 마스크를 반대 방향으로 벌려 분할 과정을 강조합니다.
    const spread = Math.sin(progress * Math.PI);
    back.position.set(-.53 - .57 * spread, -.54 - .38 * spread, -.58 - .52 * spread);
    middle.position.set(-.25 - .26 * spread, -.25 - .19 * spread, -.28 - .24 * spread);
    cutout.position.z = .23 + .34 * spread;
  };
}

function wave(group) {
  const sound = new THREE.Group();
  sound.rotation.set(-.12, -.34, -.24);
  group.add(sound);

  const white = standard(0xf7f9ff, .14, .24);
  const sky = standard(0x86b8ff, .26, .27);
  const blue = standard(0x5e89f8, .22);
  const block = roundedSlab(3.48, 2.47, .12, .26, .052);
  mesh(sound, block, blue, -.16, -.14, -.37);
  mesh(sound, roundedSlab(3.47, 2.46, .055, .25, .038), standard(0x2d52e8, .16), 0, 0, -.18);

  const heights = [.38, .74, 1.3, 1.87, 1.26, .71, .36];
  const bars = heights.map((height, index) =>
    mesh(sound, new THREE.CapsuleGeometry(.132, height - .264, 8, 20),
      index % 2 ? white : sky, (index - 3) * .43, 0, .12)
  );

  orbit(group, 2.13, 0xc0cdff, 1.03);
  mesh(group, new THREE.SphereGeometry(.12, 24, 16), white, 1.82, .79, .37);
  mesh(group, new THREE.OctahedronGeometry(.21), sky, -1.87, -.59, -.18);

  return (progress) => {
    const envelope = Math.sin(progress * Math.PI) ** 2;
    bars.forEach((bar, index) => {
      bar.scale.y = 1 + .4 * envelope * Math.sin(progress * Math.PI * 5 - index * .9);
    });
  };
}

function network(group, viewport) {
  const rig = new THREE.Group();
  rig.rotation.set(0.32, -0.34, 0.04);
  group.add(rig);

  // 바닥 기준 그리드 링으로 3D 공간 깊이를 분명하게 드러냅니다.
  const floorRing1 = new THREE.Mesh(
    new THREE.TorusGeometry(2.05, 0.008, 8, 96),
    standard(0xcbd5e1, 0.05, 0.6)
  );
  floorRing1.rotation.x = Math.PI / 2;
  floorRing1.position.y = -1.08;
  rig.add(floorRing1);

  const floorRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.007, 8, 72),
    standard(0xdbe3ef, 0.05, 0.6)
  );
  floorRing2.rotation.x = Math.PI / 2;
  floorRing2.position.y = -1.08;
  rig.add(floorRing2);

  // 중앙 허브: 사람 통제 · 기준(CLAUDE.md)
  const hubPos = new THREE.Vector3(0, 0.08, 0);
  const hubGroup = new THREE.Group();
  hubGroup.position.copy(hubPos);
  rig.add(hubGroup);

  mesh(hubGroup, new THREE.OctahedronGeometry(0.42, 0), standard(0x2450db, 0.25, 0.22));
  const hubHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.022, 12, 72),
    standard(0xe0a419, 0.42, 0.24)
  );
  hubHalo.rotation.set(1.15, 0.35, 0);
  hubGroup.add(hubHalo);

  const hubHalo2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.76, 0.014, 10, 72),
    standard(0x6366f1, 0.2, 0.3)
  );
  hubHalo2.rotation.set(-0.9, 0.55, 0.2);
  hubGroup.add(hubHalo2);

  // 4개 위성 노드를 3차원 깊이감 있게 배치합니다.
  const nodeSpecs = [
    { key: 'claude', pos: new THREE.Vector3(-1.72, 0.72, 0.52), color: 0xd97757, accent: 0xf4b299, shape: 'box' },
    { key: 'codex', pos: new THREE.Vector3(1.68, 0.78, -0.45), color: 0x1e293b, accent: 0x64748b, shape: 'prism' },
    { key: 'mcp', pos: new THREE.Vector3(-1.42, -0.74, -0.62), color: 0x7c3aed, accent: 0xc4b5fd, shape: 'cluster' },
    { key: 'verify', pos: new THREE.Vector3(1.52, -0.68, 0.68), color: 0x0f766e, accent: 0x5eead4, shape: 'stack' },
  ];

  const nodeMeshes = {};
  const anchors = { hub: hubPos.clone().add(new THREE.Vector3(0, 0.78, 0)) };

  for (const spec of nodeSpecs) {
    const holder = new THREE.Group();
    holder.position.copy(spec.pos);
    rig.add(holder);

    // 받침 링
    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.015, 10, 48),
      standard(spec.accent, 0.18, 0.32)
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -0.26;
    holder.add(baseRing);

    if (spec.shape === 'box') {
      mesh(holder, roundedSlab(0.56, 0.44, 0.18, 0.08, 0.03), standard(spec.color, 0.18, 0.28));
      mesh(holder, roundedSlab(0.36, 0.07, 0.06, 0.02, 0.01), standard(0xffffff, 0.08, 0.25), -0.04, 0.07, 0.11);
      mesh(holder, roundedSlab(0.24, 0.06, 0.06, 0.02, 0.01), standard(spec.accent, 0.08, 0.25), -0.1, -0.06, 0.11);
    } else if (spec.shape === 'prism') {
      mesh(holder, new THREE.CylinderGeometry(0.29, 0.29, 0.42, 6), standard(spec.color, 0.28, 0.25));
      mesh(holder, new THREE.CylinderGeometry(0.16, 0.16, 0.46, 6), standard(0x93c5fd, 0.22, 0.22));
    } else if (spec.shape === 'cluster') {
      mesh(holder, new THREE.SphereGeometry(0.22, 22, 16), standard(spec.color, 0.2, 0.26));
      mesh(holder, new THREE.SphereGeometry(0.12, 18, 12), standard(spec.accent, 0.16, 0.26), 0.25, 0.14, 0.08);
      mesh(holder, new THREE.SphereGeometry(0.11, 18, 12), standard(spec.accent, 0.16, 0.26), -0.22, -0.12, 0.12);
    } else {
      mesh(holder, roundedSlab(0.54, 0.11, 0.42, 0.04, 0.018), standard(spec.color, 0.2, 0.28), 0, -0.14, 0);
      mesh(holder, roundedSlab(0.48, 0.11, 0.36, 0.04, 0.018), standard(0x14b8a6, 0.2, 0.26), 0, 0.02, 0);
      mesh(holder, roundedSlab(0.42, 0.11, 0.30, 0.04, 0.018), standard(spec.accent, 0.18, 0.24), 0, 0.18, 0);
    }

    // 수직 투영선 (바닥과의 거리감)
    const dropHeight = spec.pos.y - (-1.08);
    if (dropHeight > 0.1) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, dropHeight, 6),
        standard(0xcbd5e1, 0.05, 0.5)
      );
      stem.position.set(spec.pos.x, -1.08 + dropHeight / 2, spec.pos.z);
      rig.add(stem);
      const foot = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 16),
        standard(spec.accent, 0.1, 0.4)
      );
      foot.rotation.x = -Math.PI / 2;
      foot.position.set(spec.pos.x, -1.075, spec.pos.z);
      rig.add(foot);
    }

    nodeMeshes[spec.key] = holder;
    anchors[spec.key] = spec.pos.clone().add(new THREE.Vector3(0, spec.pos.y > 0 ? 0.46 : -0.44, 0));
  }

  // 허브 ↔ 위성 + 위성 간 순환 3D 곡선 튜브 및 데이터 패킷
  const byKey = Object.fromEntries(nodeSpecs.map((s) => [s.key, s]));
  const linkDefs = [
    { from: hubPos, to: byKey.claude.pos, bend: new THREE.Vector3(-0.15, 0.36, 0.24), color: 0x3b66f5, speed: 0.24, offset: 0.0 },
    { from: hubPos, to: byKey.codex.pos, bend: new THREE.Vector3(0.18, 0.34, -0.22), color: 0x475569, speed: 0.22, offset: 0.25 },
    { from: hubPos, to: byKey.mcp.pos, bend: new THREE.Vector3(-0.22, -0.18, -0.34), color: 0x8b5cf6, speed: 0.21, offset: 0.5 },
    { from: hubPos, to: byKey.verify.pos, bend: new THREE.Vector3(0.22, -0.16, 0.32), color: 0x0d9488, speed: 0.25, offset: 0.75 },
    // 순환 협업 경로 (Claude -> Verify -> Codex -> MCP -> Claude)
    { from: byKey.claude.pos, to: byKey.verify.pos, bend: new THREE.Vector3(-0.08, -0.10, 0.72), color: 0x94a3b8, speed: 0.16, offset: 0.15, outer: true },
    { from: byKey.verify.pos, to: byKey.codex.pos, bend: new THREE.Vector3(0.55, 0.04, 0.14), color: 0x94a3b8, speed: 0.16, offset: 0.45, outer: true },
    { from: byKey.codex.pos, to: byKey.mcp.pos, bend: new THREE.Vector3(0.10, 0.02, -0.72), color: 0x94a3b8, speed: 0.16, offset: 0.7, outer: true },
    { from: byKey.mcp.pos, to: byKey.claude.pos, bend: new THREE.Vector3(-0.55, 0.04, -0.05), color: 0x94a3b8, speed: 0.16, offset: 0.9, outer: true },
  ];

  const packets = [];
  for (const link of linkDefs) {
    const mid = link.from.clone().add(link.to).multiplyScalar(0.5).add(link.bend);
    const curve = new THREE.CatmullRomCurve3([link.from, mid, link.to]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 36, link.outer ? 0.015 : 0.024, 8, false),
      standard(link.color, 0.18, 0.35)
    );
    rig.add(tube);

    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(link.outer ? 0.055 : 0.072, 16, 12),
      new THREE.MeshStandardMaterial({
        color: link.outer ? 0x2450db : link.color,
        emissive: link.outer ? 0x2450db : link.color,
        emissiveIntensity: 0.45,
        roughness: 0.2,
      })
    );
    rig.add(pulse);
    packets.push({ curve, pulse, speed: link.speed, offset: link.offset });
  }

  // 마우스 기울기 인터랙션
  let targetTiltX = 0;
  let targetTiltY = 0;
  let tiltX = 0;
  let tiltY = 0;
  viewport.addEventListener('pointermove', (event) => {
    const rect = viewport.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    targetTiltY = nx * 0.22;
    targetTiltX = ny * 0.14;
  });
  viewport.addEventListener('pointerleave', () => {
    targetTiltX = 0;
    targetTiltY = 0;
  });

  const labelEls = [...viewport.querySelectorAll('[data-net-node]')];
  const worldVec = new THREE.Vector3();

  function update(progress, elapsedMs = 0, camera) {
    const t = elapsedMs / 1000;
    tiltX += (targetTiltX - tiltX) * 0.08;
    tiltY += (targetTiltY - tiltY) * 0.08;

    rig.rotation.x = 0.32 + Math.sin(t * 0.55) * 0.04 + tiltX;
    rig.rotation.y = -0.34 + Math.sin(t * 0.42) * 0.12 + tiltY;
    hubGroup.rotation.y = t * 0.45;
    hubHalo.rotation.z = t * 0.65;
    hubHalo2.rotation.z = -t * 0.48;

    nodeSpecs.forEach((spec, idx) => {
      const h = nodeMeshes[spec.key];
      h.position.y = spec.pos.y + Math.sin(t * 1.15 + idx * 1.5) * 0.065;
      h.rotation.y = Math.sin(t * 0.7 + idx) * 0.22;
    });

    for (const item of packets) {
      const u = (item.offset + t * item.speed) % 1;
      item.curve.getPointAt(u, item.pulse.position);
    }

    if (camera && labelEls.length) {
      group.updateWorldMatrix(true, true);
      for (const el of labelEls) {
        const key = el.dataset.netNode;
        const anchor = anchors[key];
        if (!anchor) continue;
        worldVec.copy(anchor).applyMatrix4(rig.matrixWorld).project(camera);
        const xPct = Math.max(14, Math.min(86, (worldVec.x * 0.5 + 0.5) * 100));
        const yPct = Math.max(12, Math.min(88, (-worldVec.y * 0.5 + 0.5) * 100));
        el.style.left = `${xPct.toFixed(2)}%`;
        el.style.top = `${yPct.toFixed(2)}%`;
      }
    }
  }

  update.continuous = true;
  return update;
}

const build = { phone, layers, wave, network };

export function createProjectModel(viewport) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: viewport.dataset.model === 'network',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 2.7, -2.7, .1, 50);
  camera.position.set(0, 0, 10);
  const model = new THREE.Group();
  scene.add(model);
  const animateDetails = build[viewport.dataset.model](model, viewport);
  const isContinuous = Boolean(animateDetails.continuous);

  scene.add(new THREE.HemisphereLight(0xf4f5ff, 0x6a5261, 2.05));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-3, 5, 7);
  const rim = new THREE.DirectionalLight(0xd4deff, 1.65);
  rim.position.set(4, 0, -4);
  scene.add(key, rim);

  let frame = 0;
  let started = null;

  function draw(progress, detailProgress = 1, elapsedMs = 0) {
    const eased = 1 - (1 - progress) ** 3;
    if (isContinuous) {
      model.rotation.y = 0;
      model.scale.setScalar(.92 + .08 * eased);
      model.position.y = 0;
      animateDetails(detailProgress, elapsedMs, camera);
    } else {
      model.rotation.y = (eased - 1) * Math.PI * 2;
      model.scale.setScalar(.80 + .20 * eased);
      model.position.y = -.19 * (1 - eased);
      animateDetails(detailProgress);
    }
    canvas.style.opacity = Math.min(1, .10 + progress * 4).toString();
    renderer.render(scene, camera);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    draw(1, 1, 0);
  }

  function animate(now) {
    started ??= now;
    const elapsed = now - started;
    if (isContinuous) {
      draw(Math.min(elapsed / 520, 1), 1, elapsed);
      frame = requestAnimationFrame(animate);
      return;
    }
    // 회전이 감속하는 동안 프로젝트별 모션을 겹치고, 끝나면 렌더링을 멈춥니다.
    const detailProgress = THREE.MathUtils.clamp((elapsed - 480) / 880, 0, 1);
    draw(Math.min(elapsed / 710, 1), detailProgress, elapsed);
    frame = detailProgress < 1 ? requestAnimationFrame(animate) : 0;
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = viewport;
    if (!width || !height) return;
    camera.right = 2.7 * width / height;
    camera.left = -camera.right;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!frame) draw(1);
  }

  // 컨텍스트가 끊기면 빈 캔버스 대신 HTML 아이콘을 보여 줍니다.
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    viewport.classList.remove('has-model');
    cancelAnimationFrame(frame);
    frame = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    draw(1);
    viewport.classList.add('has-model');
  });

  reducedMotion.addEventListener('change', () => {
    if (frame && reducedMotion.matches) stop();
  });
  viewport.append(canvas);
  resize();
  new ResizeObserver(resize).observe(viewport);

  return {
    enter() {
      cancelAnimationFrame(frame);
      if (renderer.getContext().isContextLost()) return;
      viewport.classList.add('has-model');
      if (reducedMotion.matches) {
        stop();
        return;
      }
      started = null;
      draw(0, 0);
      frame = requestAnimationFrame(animate);
    },
    stop() {
      if (frame) stop();
    },
  };
}
