import * as THREE from './assets/three/three.module.min.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const textureLoader = new THREE.TextureLoader();

function standard(color, metalness = 0.14, roughness = 0.32, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
}

function mesh(group, geometry, material, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  group.add(item);
  return item;
}

function roundedShape(width, height, radius) {
  const left = -width / 2;
  const right = width / 2;
  const bottom = -height / 2;
  const top = height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(left + r, bottom);
  shape.lineTo(right - r, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + r);
  shape.lineTo(right, top - r);
  shape.quadraticCurveTo(right, top, right - r, top);
  shape.lineTo(left + r, top);
  shape.quadraticCurveTo(left, top, left, top - r);
  shape.lineTo(left, bottom + r);
  shape.quadraticCurveTo(left, bottom, left + r, bottom);
  return shape;
}

function roundedSlab(width, height, depth, radius, bevel) {
  return new THREE.ExtrudeGeometry(roundedShape(width, height, radius), {
    depth,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 10,
  }).translate(0, 0, -depth / 2);
}

// 둥근 모서리 평면에 0..1 정규화 UV를 입혀 실제 서비스 스크린샷을 선명하게 매핑합니다.
function roundedPlane(width, height, radius) {
  const geometry = new THREE.ShapeGeometry(roundedShape(width, height, radius), 12);
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + width / 2) / width;
    uv[i * 2 + 1] = (pos.getY(i) + height / 2) / height;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function screenMaterial(url, planeWidth, planeHeight, {
  renderer,
  fallbackColor = 0x182032,
  alignY = 0.5, // 1 = 상단 정렬(긴 모바일 카드), 0.5 = 중앙 정렬
  onReady,
} = {}) {
  const mat = new THREE.MeshBasicMaterial({ color: fallbackColor, toneMapped: false });
  textureLoader.load(
    url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      if (renderer) {
        tex.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
      }
      const img = tex.image;
      if (img?.width && img?.height) {
        const imgAspect = img.width / img.height;
        const planeAspect = planeWidth / planeHeight;
        if (imgAspect > planeAspect) {
          const repeatX = planeAspect / imgAspect;
          tex.repeat.set(repeatX, 1);
          tex.offset.set((1 - repeatX) * 0.5, 0);
        } else {
          const repeatY = imgAspect / planeAspect;
          tex.repeat.set(1, repeatY);
          tex.offset.set(0, (1 - repeatY) * alignY);
        }
      }
      tex.needsUpdate = true;
      mat.map = tex;
      mat.color.setHex(0xffffff);
      mat.needsUpdate = true;
      onReady?.();
    },
    undefined,
    () => {
      onReady?.();
    }
  );
  return mat;
}

function orbit(group, radius, color, tilt, rotY = -0.22) {
  const ring = mesh(group, new THREE.TorusGeometry(radius, 0.015, 10, 108), standard(color, 0.25, 0.28));
  ring.rotation.set(tilt, rotY, 0);
  return ring;
}

function attachPointerTilt(viewport, maxX = 0.12, maxY = 0.18) {
  const state = { targetX: 0, targetY: 0, x: 0, y: 0, hover: 0, targetHover: 0 };
  viewport.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const rect = viewport.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    state.targetY = nx * maxY;
    state.targetX = ny * maxX;
    state.targetHover = 1;
  });
  viewport.addEventListener('pointerleave', () => {
    state.targetX = 0;
    state.targetY = 0;
    state.targetHover = 0;
  });
  return state;
}

/* ============================================================================
 * 1. DVA (wave): 3D 실시간 음성 파형 + 다중 레이어 관제 콘솔 스테이지
 * ============================================================================ */
function wave(group, viewport, ctx) {
  const rig = new THREE.Group();
  rig.rotation.set(0.11, -0.22, 0.025);
  group.add(rig);

  const navyShell = standard(0x131d3b, 0.24, 0.30);
  const navyTrim = standard(0x4c79f2, 0.22, 0.26);
  const white = standard(0xf7faff, 0.12, 0.22);
  const sky = standard(0x8ec5ff, 0.22, 0.24);

  function addWindowPanel(parent, {
    width, height, depth, radius, url, x, y, z, rotY = 0, rotX = 0, showChrome = true,
  }) {
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.rotation.set(rotX, rotY, 0);
    parent.add(holder);

    const chromeH = showChrome ? 0.11 : 0;
    const totalH = height + chromeH;
    // 외곽 3D 베젤 슬랩
    mesh(holder, roundedSlab(width + 0.09, totalH + 0.09, depth, radius + 0.02, 0.022), navyShell);
    // 뒤쪽 림 하이라이트
    mesh(holder, roundedSlab(width + 0.12, totalH + 0.12, 0.014, radius + 0.025, 0.008), navyTrim, 0, 0, -depth * 0.48);

    // 실제 운영 콘솔 스크린 텍스처
    const screenMat = ctx.screen(url, width, height, { fallbackColor: 0x1b274b });
    mesh(holder, roundedPlane(width, height, radius), screenMat, 0, -chromeH * 0.45, depth / 2 + 0.026);

    if (showChrome) {
      const dotY = totalH / 2 - chromeH * 0.48;
      const dotX = -width / 2 + 0.11;
      const dotGeo = new THREE.SphereGeometry(0.025, 12, 8);
      mesh(holder, dotGeo, standard(0xff5f56, 0.1, 0.3), dotX, dotY, depth / 2 + 0.025);
      mesh(holder, dotGeo, standard(0xffbd2e, 0.1, 0.3), dotX + 0.08, dotY, depth / 2 + 0.025);
      mesh(holder, dotGeo, standard(0x27c93f, 0.1, 0.3), dotX + 0.16, dotY, depth / 2 + 0.025);
    }
    return holder;
  }

  // 상단 우측 보조 패널: AI 응대 성능 통계
  const statsPanel = addWindowPanel(rig, {
    width: 2.08, height: 1.17, depth: 0.075, radius: 0.08,
    url: './assets/dva-screen-stats.jpg',
    x: 0.72, y: 0.96, z: -0.58, rotY: 0.09, showChrome: true,
  });

  // 중앙 히어로 콘솔: DVA 운영 콘솔 메인
  addWindowPanel(rig, {
    width: 3.16, height: 1.78, depth: 0.10, radius: 0.10,
    url: './assets/dva-screen-home.jpg',
    x: -0.14, y: 0.06, z: 0.10, rotY: 0, showChrome: true,
  });

  // 우측 하단 보조 패널: 실시간 주문 접수 목록
  const ordersPanel = addWindowPanel(rig, {
    width: 1.92, height: 1.08, depth: 0.075, radius: 0.08,
    url: './assets/dva-screen-orders.jpg',
    x: 0.84, y: -0.96, z: 0.56, rotY: -0.11, showChrome: true,
  });

  // 좌측 하단 시그니처 3D 음성 파형 독 (기존 wave 아이덴티티 계승)
  const waveDock = new THREE.Group();
  waveDock.position.set(-1.18, -0.96, 0.78);
  waveDock.rotation.set(-0.06, 0.16, -0.05);
  rig.add(waveDock);

  mesh(waveDock, roundedSlab(1.86, 0.90, 0.12, 0.22, 0.036), standard(0x254de2, 0.18, 0.26));
  mesh(waveDock, roundedSlab(1.72, 0.76, 0.04, 0.17, 0.018), standard(0x1935a8, 0.14, 0.30), 0, 0, 0.065);

  const heights = [0.22, 0.42, 0.62, 0.76, 0.56, 0.38, 0.22];
  const bars = heights.map((h, i) =>
    mesh(
      waveDock,
      new THREE.CapsuleGeometry(0.068, Math.max(0.04, h - 0.136), 8, 18),
      i % 2 ? white : sky,
      (i - 3) * 0.225,
      0,
      0.13
    )
  );

  // 궤도 링 + 떠다니는 3D 오브젝트
  const ring = orbit(group, 2.38, 0xa8c6ff, 1.08, -0.24);
  const orb = mesh(group, new THREE.SphereGeometry(0.11, 22, 14), white, 2.04, 1.24, 0.44);
  const crystal = mesh(group, new THREE.OctahedronGeometry(0.18), sky, -2.14, 0.86, -0.20);

  const pointer = attachPointerTilt(viewport, 0.11, 0.17);

  function update(progress, elapsedMs = 0) {
    const t = elapsedMs / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;

    rig.rotation.x = 0.11 + Math.sin(t * 0.65) * 0.025 + pointer.x;
    rig.rotation.y = -0.22 + Math.sin(t * 0.48) * 0.05 + pointer.y;
    rig.position.y = Math.sin(t * 0.9) * 0.055;

    statsPanel.position.y = 0.96 + Math.sin(t * 1.1 + 0.8) * 0.045;
    ordersPanel.position.y = -0.96 + Math.sin(t * 1.05 + 2.2) * 0.045;
    waveDock.position.y = -0.96 + Math.sin(t * 1.25) * 0.04;

    bars.forEach((bar, i) => {
      const waveAmp = 0.78 + 0.42 * Math.sin(t * 3.4 - i * 0.82);
      bar.scale.y = Math.max(0.35, waveAmp);
    });

    ring.rotation.z = t * 0.12;
    orb.position.y = 1.24 + Math.sin(t * 1.3) * 0.08;
    crystal.rotation.set(t * 0.45, t * 0.65, 0);
  }

  update.continuous = true;
  return update;
}

/* ============================================================================
 * 2. MOTIF (layers): 3D 영상 프레임 레이어 스프레드 + 뷰파인더 + 핫핑크 궤도
 * ============================================================================ */
function layers(group, viewport, ctx) {
  const rig = new THREE.Group();
  rig.rotation.set(-0.14, -0.32, -0.07);
  group.add(rig);

  const darkBody = standard(0x1f192b, 0.30, 0.30);
  const pinkMetal = standard(0xff3886, 0.22, 0.24, { emissive: 0x3b061d, emissiveIntensity: 0.45 });
  const blush = standard(0xffb3d4, 0.16, 0.25);

  function addFramePlate(parent, { width, height, depth, url, shellMat, accentMat }) {
    const plate = new THREE.Group();
    parent.add(plate);
    mesh(plate, roundedSlab(width + 0.10, height + 0.10, depth, 0.18, 0.032), shellMat);
    if (accentMat) {
      mesh(plate, roundedSlab(width + 0.145, height + 0.145, 0.022, 0.20, 0.012), accentMat, 0, 0, -depth * 0.42);
    }
    const screenMat = ctx.screen(url, width, height, { fallbackColor: 0x261f33 });
    mesh(plate, roundedPlane(width, height, 0.14), screenMat, 0, 0, depth / 2 + 0.035);
    return plate;
  }

  // Layer 1 (뒤): SVOR 배경 복원 플레이트
  const back = addFramePlate(rig, {
    width: 1.38, height: 2.38, depth: 0.10,
    url: './assets/motif-screen-ready.jpg',
    shellMat: darkBody,
  });

  // Layer 2 (중간): SAM 2.1 인물 슬롯 마스크 + 3D 뷰파인더 브래킷
  const middle = addFramePlate(rig, {
    width: 1.44, height: 2.48, depth: 0.11,
    url: './assets/motif-screen-select.jpg',
    shellMat: darkBody,
    accentMat: pinkMetal,
  });

  // 3D 뷰파인더 코너 브래킷 (기존 layers 시그니처 계승)
  const brackets = new THREE.Group();
  middle.add(brackets);
  const hBar = roundedSlab(0.24, 0.034, 0.026, 0.014, 0.008);
  const vBar = roundedSlab(0.034, 0.24, 0.026, 0.014, 0.008);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const corner = new THREE.Group();
      corner.userData = { sx, sy };
      mesh(corner, hBar, blush, sx * 0.56, sy * 1.14, 0.17);
      mesh(corner, vBar, blush, sx * 0.67, sy * 1.03, 0.17);
      brackets.add(corner);
    }
  }

  // Layer 3 (앞): MOTIF 2인 챌린지 합성 프레임 + 3D 플레이 배지
  const front = addFramePlate(rig, {
    width: 1.54, height: 2.58, depth: 0.12,
    url: './assets/motif-screen-challenge.jpg',
    shellMat: standard(0x16121f, 0.34, 0.26),
    accentMat: pinkMetal,
  });

  // 우측 하단 3D 핫핑크 재생/합성 배지
  const playBadge = new THREE.Group();
  playBadge.position.set(0.66, -1.04, 0.24);
  front.add(playBadge);
  const badgeDisc = new THREE.CylinderGeometry(0.24, 0.24, 0.075, 32);
  badgeDisc.rotateX(Math.PI / 2);
  mesh(playBadge, badgeDisc, pinkMetal);
  const triShape = new THREE.Shape();
  triShape.moveTo(-0.065, -0.09);
  triShape.lineTo(0.105, 0);
  triShape.lineTo(-0.065, 0.09);
  triShape.closePath();
  mesh(
    playBadge,
    new THREE.ExtrudeGeometry(triShape, { depth: 0.03, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }),
    standard(0xffffff, 0.08, 0.2),
    0, 0, 0.04
  );

  // 핫핑크 궤도 링 + 빛나는 구체
  const ring = orbit(group, 2.38, 0xff6aa8, 0.84, -0.26);
  const orb1 = mesh(group, new THREE.SphereGeometry(0.095, 22, 14), blush, 2.02, 1.32, 0.52);
  const orb2 = mesh(group, new THREE.SphereGeometry(0.075, 20, 12), pinkMetal, -2.06, -1.16, -0.34);

  const pointer = attachPointerTilt(viewport, 0.13, 0.19);

  function update(progress, elapsedMs = 0) {
    const t = elapsedMs / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;
    pointer.hover += (pointer.targetHover - pointer.hover) * 0.08;

    // 3겹 레이어가 부드럽게 호흡하며, 호버 시 Z축·대각선으로 더 넓게 벌어집니다.
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.15);
    const spread = 0.35 * breathe + 0.55 * pointer.hover;

    back.position.set(-1.08 - 0.28 * spread, -0.22 - 0.10 * spread, -0.76 - 0.34 * spread);
    back.rotation.y = 0.10 + 0.05 * spread;

    middle.position.set(-0.04, 0.02, -0.02);

    front.position.set(1.04 + 0.24 * spread, 0.20 + 0.09 * spread, 0.72 + 0.32 * spread);
    front.rotation.y = -0.08 - 0.04 * spread;

    for (const corner of brackets.children) {
      const { sx, sy } = corner.userData;
      corner.position.set(sx * 0.06 * spread, sy * 0.06 * spread, 0.08 * spread);
    }

    rig.rotation.x = -0.14 + Math.sin(t * 0.6) * 0.03 + pointer.x;
    rig.rotation.y = -0.32 + Math.sin(t * 0.45) * 0.06 + pointer.y;
    rig.position.y = Math.sin(t * 0.85) * 0.05;

    playBadge.scale.setScalar(1 + 0.06 * Math.sin(t * 2.2));
    ring.rotation.z = -t * 0.14;
    orb1.position.y = 1.32 + Math.sin(t * 1.4) * 0.09;
    orb2.position.y = -1.16 + Math.cos(t * 1.2) * 0.08;
  }

  update.continuous = true;
  return update;
}

/* ============================================================================
 * 3. MODERA (phone): 3D 단일 히어로 스마트폰 + AI 스파클 + 부유 분석 카드
 * ============================================================================ */
function phone(group, viewport, ctx) {
  const rig = new THREE.Group();
  group.add(rig);

  const ivory = standard(0xfffaf1, 0.16, 0.28);
  const darkInk = standard(0x282419, 0.26, 0.32);
  const gold = standard(0xffbb10, 0.14, 0.26);

  // 중앙 단일 3D 히어로 스마트폰 (기존 phone 아이덴티티 계승)
  const device = new THREE.Group();
  device.rotation.set(-0.12, -0.26, -0.13);
  device.scale.setScalar(0.94);
  rig.add(device);

  mesh(device, roundedSlab(1.88, 3.62, 0.24, 0.24, 0.068), ivory);
  mesh(device, roundedSlab(1.78, 3.48, 0.035, 0.20, 0.018), darkInk, 0, 0, 0.175);
  const homeScreen = ctx.screen('./assets/modera-screen-home.jpg', 1.66, 3.36, { fallbackColor: 0xfff8e7 });
  mesh(device, roundedPlane(1.66, 3.36, 0.16), homeScreen, 0, 0, 0.214);
  // 상단 다이나믹 노치
  mesh(device, roundedSlab(0.40, 0.068, 0.018, 0.032, 0.008), darkInk, 0, 1.54, 0.232);

  // 주변 3D 공간에 비대칭으로 떠 있는 실제 멀티모달 분석 결과 카드 2장
  function addFloatingCard(parent, { width, height, url, x, y, z, rx, ry, rz, accentColor }) {
    const card = new THREE.Group();
    card.position.set(x, y, z);
    card.rotation.set(rx, ry, rz);
    parent.add(card);

    mesh(card, roundedSlab(width + 0.10, height + 0.10, 0.075, 0.13, 0.024), ivory);
    mesh(card, roundedSlab(width * 0.42, 0.042, 0.028, 0.02, 0.006), standard(accentColor, 0.12, 0.26), 0, height / 2 + 0.02, 0.05);
    const mat = ctx.screen(url, width, height, { fallbackColor: 0xfffdf7, alignY: 1 });
    mesh(card, roundedPlane(width, height, 0.09), mat, 0, 0, 0.064);
    return card;
  }

  // 좌상단 부유 카드: 고해상도 AI 분석 결과 (SSAFY 심화과정 커리큘럼 안내)
  const leftCard = addFloatingCard(rig, {
    width: 1.18, height: 1.50,
    url: './assets/modera-screen-analysis.jpg',
    x: -1.48, y: 0.56, z: 0.42,
    rx: 0.05, ry: 0.24, rz: 0.07,
    accentColor: 0xffbb10,
  });

  // 우하단 부유 카드: 분석·요약 문서 상세 (Claude 설치 방법 2가지)
  const rightCard = addFloatingCard(rig, {
    width: 1.16, height: 1.44,
    url: './assets/modera-screen-doc.jpg',
    x: 1.44, y: -0.60, z: 0.58,
    rx: -0.06, ry: -0.26, rz: -0.06,
    accentColor: 0xe39e0b,
  });

  // 골드 궤도 링 + 3D AI 스파클 별 클러스터 (기존 phone 시그니처 계승)
  const ring = orbit(group, 2.24, 0xd8960c, 1.24, -0.22);
  ring.position.set(0, -0.22, -0.08);
  const spark = new THREE.Group();
  spark.position.set(1.36, 1.26, 0.68);
  spark.rotation.z = 0.28;
  group.add(spark);
  const stars = [
    [0, 0, 0.29, ivory],
    [0.44, 0.36, 0.13, gold],
    [-0.14, -0.44, 0.11, ivory],
  ].map(([x, y, size, mat]) => {
    const point = mesh(spark, new THREE.OctahedronGeometry(size), mat, x, y);
    point.scale.set(0.64, 1.36, 0.84);
    return point;
  });

  const pointer = attachPointerTilt(viewport, 0.12, 0.18);

  function update(progress, elapsedMs = 0) {
    const t = elapsedMs / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;
    pointer.hover += (pointer.targetHover - pointer.hover) * 0.08;

    rig.rotation.x = pointer.x;
    rig.rotation.y = pointer.y;

    device.rotation.y = -0.26 + Math.sin(t * 0.55) * 0.07;
    device.position.y = Math.sin(t * 0.95) * 0.065;

    leftCard.position.x = -1.48 - 0.10 * pointer.hover;
    leftCard.position.y = 0.56 + Math.sin(t * 1.15 + 0.6) * 0.08;
    rightCard.position.x = 1.44 + 0.10 * pointer.hover;
    rightCard.position.y = -0.60 + Math.sin(t * 1.1 + 2.4) * 0.08;

    const flare = 0.5 + 0.5 * Math.sin(t * 2.1);
    spark.position.y = 1.26 + 0.14 * flare;
    spark.rotation.z = 0.28 + 0.24 * Math.sin(t * 1.3);
    spark.scale.setScalar(0.95 + 0.18 * flare + 0.12 * pointer.hover);
    stars.forEach((star, i) => {
      star.rotation.y = t * (0.9 + i * 0.35);
    });

    ring.rotation.x = 1.24 - 0.08 * Math.sin(t * 0.8);
    ring.rotation.z = t * 0.1;
  }

  update.continuous = true;
  return update;
}

/* ============================================================================
 * 4. AI Workflow (network): 3D 연결 노드 협업 다이어그램
 * ============================================================================ */
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

  // 중앙 허브: 설계 · 컨텍스트 통제
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
    { key: 'coding', pos: new THREE.Vector3(-1.72, 0.72, 0.52), color: 0xd97757, accent: 0xf4b299, shape: 'box' },
    { key: 'autonomous', pos: new THREE.Vector3(1.68, 0.78, -0.45), color: 0x1e293b, accent: 0x64748b, shape: 'prism' },
    { key: 'automation', pos: new THREE.Vector3(-1.42, -0.74, -0.62), color: 0x7c3aed, accent: 0xc4b5fd, shape: 'cluster' },
    { key: 'parallel', pos: new THREE.Vector3(1.52, -0.68, 0.68), color: 0x0f766e, accent: 0x5eead4, shape: 'stack' },
  ];

  const nodeMeshes = {};
  const anchors = { hub: hubPos.clone().add(new THREE.Vector3(0, 0.78, 0)) };

  for (const spec of nodeSpecs) {
    const holder = new THREE.Group();
    holder.position.copy(spec.pos);
    rig.add(holder);

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

  const byKey = Object.fromEntries(nodeSpecs.map((s) => [s.key, s]));
  const linkDefs = [
    { from: hubPos, to: byKey.coding.pos, bend: new THREE.Vector3(-0.15, 0.36, 0.24), color: 0x3b66f5, speed: 0.24, offset: 0.0 },
    { from: hubPos, to: byKey.autonomous.pos, bend: new THREE.Vector3(0.18, 0.34, -0.22), color: 0x475569, speed: 0.22, offset: 0.25 },
    { from: hubPos, to: byKey.automation.pos, bend: new THREE.Vector3(-0.22, -0.18, -0.34), color: 0x8b5cf6, speed: 0.21, offset: 0.5 },
    { from: hubPos, to: byKey.parallel.pos, bend: new THREE.Vector3(0.22, -0.16, 0.32), color: 0x0d9488, speed: 0.25, offset: 0.75 },
    { from: byKey.coding.pos, to: byKey.parallel.pos, bend: new THREE.Vector3(-0.08, -0.10, 0.72), color: 0x94a3b8, speed: 0.16, offset: 0.15, outer: true },
    { from: byKey.parallel.pos, to: byKey.autonomous.pos, bend: new THREE.Vector3(0.55, 0.04, 0.14), color: 0x94a3b8, speed: 0.16, offset: 0.45, outer: true },
    { from: byKey.autonomous.pos, to: byKey.automation.pos, bend: new THREE.Vector3(0.10, 0.02, -0.72), color: 0x94a3b8, speed: 0.16, offset: 0.7, outer: true },
    { from: byKey.automation.pos, to: byKey.coding.pos, bend: new THREE.Vector3(-0.55, 0.04, -0.05), color: 0x94a3b8, speed: 0.16, offset: 0.9, outer: true },
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

  const pointer = attachPointerTilt(viewport, 0.14, 0.22);
  const labelEls = [...viewport.querySelectorAll('[data-net-node]')];
  const worldVec = new THREE.Vector3();

  function update(progress, elapsedMs = 0, camera) {
    const t = elapsedMs / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;

    rig.rotation.x = 0.32 + Math.sin(t * 0.55) * 0.04 + pointer.x;
    rig.rotation.y = -0.34 + Math.sin(t * 0.42) * 0.12 + pointer.y;
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
        const xPct = Math.max(17, Math.min(83, (worldVec.x * 0.5 + 0.5) * 100));
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 2.7, -2.7, 0.1, 50);
  camera.position.set(0, 0, 10);
  const model = new THREE.Group();
  scene.add(model);

  let pendingTextures = 0;
  let frame = 0;
  let started = null;

  const ctx = {
    renderer,
    screen(url, w, h, opts = {}) {
      pendingTextures += 1;
      return screenMaterial(url, w, h, {
        ...opts,
        renderer,
        onReady() {
          pendingTextures = Math.max(0, pendingTextures - 1);
          if (pendingTextures === 0) {
            viewport.dataset.texturesReady = 'true';
          }
          if (!frame) draw(1, 1, 0);
        },
      });
    },
  };

  const animateDetails = build[viewport.dataset.model](model, viewport, ctx);
  if (pendingTextures === 0) viewport.dataset.texturesReady = 'true';
  const isContinuous = Boolean(animateDetails.continuous);

  scene.add(new THREE.HemisphereLight(0xf6f7ff, 0x625060, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.35);
  key.position.set(-3, 5, 7);
  const rim = new THREE.DirectionalLight(0xd4deff, 1.55);
  rim.position.set(4, 0, -4);
  scene.add(key, rim);

  function draw(progress, detailProgress = 1, elapsedMs = 0) {
    const eased = 1 - (1 - progress) ** 3;
    if (isContinuous) {
      model.rotation.y = (1 - eased) * -0.45;
      model.scale.setScalar(0.90 + 0.10 * eased);
      model.position.y = -0.14 * (1 - eased);
      animateDetails(detailProgress, elapsedMs, camera);
    } else {
      model.rotation.y = (eased - 1) * Math.PI * 2;
      model.scale.setScalar(0.80 + 0.20 * eased);
      model.position.y = -0.19 * (1 - eased);
      animateDetails(detailProgress);
    }
    canvas.style.opacity = Math.min(1, 0.10 + progress * 4).toString();
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
      draw(Math.min(elapsed / 640, 1), 1, elapsed);
      frame = requestAnimationFrame(animate);
      return;
    }
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
    if (!frame) draw(1, 1, 0);
  }

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    viewport.classList.remove('has-model');
    cancelAnimationFrame(frame);
    frame = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    draw(1, 1, 0);
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
      draw(0, 0, 0);
      frame = requestAnimationFrame(animate);
    },
    stop() {
      if (frame) stop();
    },
  };
}
