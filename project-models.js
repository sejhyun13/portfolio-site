import * as THREE from './assets/three/three.module.min.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const textureLoader = new THREE.TextureLoader();

// 광택을 없앤 매트(무광) 재질 기본값: 아노다이징 알루미늄·세라믹 질감
function matte(color, roughness = 0.92, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness,
    ...extra,
  });
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

function roundedSlab(width, height, depth, radius, bevel = 0.018) {
  return new THREE.ExtrudeGeometry(roundedShape(width, height, radius), {
    depth,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 10,
  }).translate(0, 0, -depth / 2);
}

// 4각 AI 스파클 별(매트 입체)
function starShape(outerR, innerR) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function starMesh(group, outerR, innerR, depth, material, x = 0, y = 0, z = 0) {
  const geo = new THREE.ExtrudeGeometry(starShape(outerR, innerR), {
    depth,
    bevelThickness: depth * 0.28,
    bevelSize: depth * 0.2,
    bevelSegments: 2,
  }).translate(0, 0, -depth / 2);
  return mesh(group, geo, material, x, y, z);
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
  alignY = 0.5,
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
  const ring = mesh(group, new THREE.TorusGeometry(radius, 0.014, 10, 112), matte(color, 0.94));
  ring.rotation.set(tilt, rotY, 0);
  return ring;
}

/**
 * Samsung Galaxy S Ultra 스타일 매트 3D 스마트폰 빌더
 * - 각진 직사각 모서리(작은 곡률), 플랫 측면 티타늄 레일
 * - 우측 물리 볼륨 로커 + 전원 버튼, 상단 미세 수화부 슬릿
 * - 중앙 상단 원형 펀치홀(Infinity-O) 전면 카메라
 */
function buildGalaxyPhone(parent, {
  width = 1.76,
  height = 3.52,
  depth = 0.19,
  bodyColor = 0x2b2928,
  railColor = 0x5c5751,
  bezelColor = 0x141313,
  screenUrl,
  fallbackColor = 0x1a1a1f,
  alignY = 0.5,
  ctx,
}) {
  const phone = new THREE.Group();
  parent.add(phone);

  const cornerR = 0.068; // 갤럭시 울트라 특유의 각진 실루엣
  const bodyMat = matte(bodyColor, 0.93);
  const railMat = matte(railColor, 0.88);
  const bezelMat = matte(bezelColor, 0.95);
  const holeMat = matte(0x0c0c0e, 0.96);

  // 메인 바디 + 플랫 측면 티타늄 프레임 림
  mesh(phone, roundedSlab(width, height, depth, cornerR, 0.016), bodyMat);
  mesh(phone, roundedSlab(width + 0.024, height + 0.024, depth * 0.56, cornerR + 0.006, 0.008), railMat, 0, 0, -0.008);

  // 슬림 균일 전면 베젤
  const bezelW = width - 0.055;
  const bezelH = height - 0.055;
  mesh(phone, roundedSlab(bezelW, bezelH, 0.02, cornerR * 0.72, 0.006), bezelMat, 0, 0, depth / 2 + 0.016);

  // 실제 앱 스크린 (베젤 전면 depth/2 + 0.032 보다 여유 있게 앞쪽에 배치해 Z-fighting 방지)
  const screenW = width - 0.11;
  const screenH = height - 0.12;
  const screenZ = depth / 2 + 0.044;
  const screenMat = ctx.screen(screenUrl, screenW, screenH, { fallbackColor, alignY });
  mesh(phone, roundedPlane(screenW, screenH, cornerR * 0.52), screenMat, 0, 0, screenZ);

  // 상단 미세 수화부 슬릿 (베젤 최상단)
  mesh(phone, roundedSlab(0.28, 0.016, 0.01, 0.007, 0.002), matte(0x2a292b, 0.95), 0, height / 2 - 0.042, screenZ + 0.005);

  // 갤럭시 시그니처: 중앙 상단 원형 펀치홀 카메라 (Infinity-O)
  const punchHole = new THREE.CylinderGeometry(0.036, 0.036, 0.012, 24);
  punchHole.rotateX(Math.PI / 2);
  mesh(phone, punchHole, holeMat, 0, screenH / 2 - 0.095, screenZ + 0.007);
  const lensRing = new THREE.RingGeometry(0.022, 0.032, 24);
  mesh(phone, lensRing, matte(0x3a3d46, 0.92), 0, screenH / 2 - 0.095, screenZ + 0.015);

  // 우측 측면 물리 버튼 (볼륨 로커 + 전원 키)
  const sideX = width / 2 + 0.022;
  mesh(phone, roundedSlab(0.028, 0.44, 0.048, 0.01, 0.005), railMat, sideX, height * 0.16, 0);
  mesh(phone, roundedSlab(0.028, 0.22, 0.048, 0.01, 0.005), railMat, sideX, -height * 0.01, 0);

  // 하단 USB-C 포트 + S펜/스피커 디테일 (하단 레일)
  mesh(phone, roundedSlab(0.20, 0.018, 0.045, 0.008, 0.002), holeMat, 0, -height / 2 - 0.008, 0);
  mesh(phone, roundedSlab(0.10, 0.016, 0.035, 0.006, 0.002), holeMat, -width * 0.28, -height / 2 - 0.008, 0);

  return phone;
}

function attachPointerTilt(viewport, maxX = 0.11, maxY = 0.16) {
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
 * 1. DVA (wave): 매트 3D 관제 워크스테이션 + 하드웨어 음성 파형 모듈
 * ============================================================================ */
function wave(group, viewport, ctx) {
  const rig = new THREE.Group();
  rig.rotation.set(0.10, -0.21, 0.02);
  group.add(rig);

  const chassis = matte(0x182342, 0.93);
  const chassisRim = matte(0x3a5eb8, 0.90);
  const standMat = matte(0x283866, 0.92);
  const white = matte(0xf5f8ff, 0.90);
  const sky = matte(0x88beff, 0.90);
  const mint = matte(0x4be3a0, 0.90);

  function addMonitor(parent, {
    width, height, depth, radius, url, x, y, z, rotY = 0, withStand = false, statusDot = false,
  }) {
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.rotation.set(0, rotY, 0);
    parent.add(holder);

    const chromeH = 0.115;
    const totalH = height + chromeH;

    // 매트 알루미늄 모니터 하우징 + 리세스드 베젤
    mesh(holder, roundedSlab(width + 0.11, totalH + 0.11, depth, radius + 0.02, 0.018), chassis);
    mesh(holder, roundedSlab(width + 0.14, totalH + 0.14, 0.016, radius + 0.025, 0.006), chassisRim, 0, 0, -depth * 0.45);

    // 실제 콘솔 스크린
    const screenMat = ctx.screen(url, width, height, { fallbackColor: 0x1b274b });
    mesh(holder, roundedPlane(width, height, radius), screenMat, 0, -chromeH * 0.46, depth / 2 + 0.028);

    // 상단 창 크롬 바(매트 버튼 3개 + 주소바 홈)
    const dotY = totalH / 2 - chromeH * 0.46;
    const dotX = -width / 2 + 0.10;
    const dotGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.012, 16);
    dotGeo.rotateX(Math.PI / 2);
    mesh(holder, dotGeo, matte(0xff6b63, 0.92), dotX, dotY, depth / 2 + 0.027);
    mesh(holder, dotGeo, matte(0xffc759, 0.92), dotX + 0.075, dotY, depth / 2 + 0.027);
    mesh(holder, dotGeo, matte(0x4ad682, 0.92), dotX + 0.15, dotY, depth / 2 + 0.027);
    mesh(holder, roundedSlab(width * 0.34, 0.036, 0.01, 0.016, 0.002), matte(0x283868, 0.94), 0.04, dotY, depth / 2 + 0.025);

    if (statusDot) {
      mesh(holder, roundedSlab(0.18, 0.042, 0.014, 0.02, 0.003), mint, width / 2 - 0.18, dotY, depth / 2 + 0.027);
    }

    // 메인 모니터 하단 매트 알루미늄 스탠드 넥 & 베이스
    if (withStand) {
      const standY = -totalH / 2 - 0.055;
      mesh(holder, roundedSlab(0.28, 0.36, 0.06, 0.03, 0.008), standMat, 0, standY - 0.16, -0.05);
      mesh(holder, roundedSlab(1.12, 0.048, 0.36, 0.02, 0.008), standMat, 0, standY - 0.34, -0.02);
    }
    return holder;
  }

  // 상단 우측: AI 응대 성능 통계 모니터
  const statsPanel = addMonitor(rig, {
    width: 2.02, height: 1.14, depth: 0.072, radius: 0.07,
    url: './assets/dva-screen-stats.jpg',
    x: 0.74, y: 0.98, z: -0.58, rotY: 0.09, statusDot: true,
  });

  // 중앙 히어로: DVA 운영 콘솔 메인 워크스테이션 (스탠드 포함)
  addMonitor(rig, {
    width: 3.08, height: 1.73, depth: 0.095, radius: 0.09,
    url: './assets/dva-screen-home.jpg',
    x: -0.14, y: 0.10, z: 0.08, rotY: 0, withStand: true, statusDot: true,
  });

  // 우측 하단: 실시간 주문 접수 콘솔
  const ordersPanel = addMonitor(rig, {
    width: 1.88, height: 1.06, depth: 0.072, radius: 0.07,
    url: './assets/dva-screen-orders.jpg',
    x: 0.86, y: -0.94, z: 0.56, rotY: -0.10,
  });

  // 좌측 하단: 구체화된 매트 음성 AI 프로세서 독 (9밴드 파형 + 마이크/상태 인디케이터)
  const waveDock = new THREE.Group();
  waveDock.position.set(-1.18, -0.94, 0.80);
  waveDock.rotation.set(-0.05, 0.16, -0.04);
  rig.add(waveDock);

  // 2단 매트 하우징 + 리세스드 어쿠스틱 베이
  mesh(waveDock, roundedSlab(2.04, 0.94, 0.14, 0.18, 0.024), matte(0x2144ba, 0.92));
  mesh(waveDock, roundedSlab(1.90, 0.78, 0.05, 0.13, 0.012), matte(0x162f85, 0.95), 0, 0, 0.065);
  // 좌측 마이크 캡슐 아이콘 배지
  const micDisc = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 28);
  micDisc.rotateX(Math.PI / 2);
  mesh(waveDock, micDisc, matte(0x3b66f2, 0.90), -0.68, 0, 0.105);
  mesh(waveDock, new THREE.CapsuleGeometry(0.042, 0.08, 8, 16), white, -0.68, 0.02, 0.135);
  mesh(waveDock, roundedSlab(0.024, 0.06, 0.016, 0.008, 0.002), white, -0.68, -0.065, 0.135);
  // 우상단 라이브 상태 LED 바
  mesh(waveDock, roundedSlab(0.16, 0.032, 0.014, 0.014, 0.003), mint, 0.72, 0.28, 0.105);

  // 9개 매트 3D 음성 파형 바 + 하단 베이스 틱
  const heights = [0.16, 0.30, 0.48, 0.62, 0.72, 0.56, 0.42, 0.28, 0.16];
  const bars = heights.map((h, i) => {
    const bx = -0.34 + i * 0.145;
    return mesh(
      waveDock,
      new THREE.CapsuleGeometry(0.044, Math.max(0.03, h - 0.088), 8, 16),
      i % 2 ? white : sky,
      bx,
      0,
      0.125
    );
  });

  // 매트 궤도 링 + 궤도 위 이동 신호 노드
  const ring = orbit(group, 2.38, 0x99b9ff, 1.08, -0.24);
  const signalDot = mesh(ring, new THREE.SphereGeometry(0.065, 18, 12), mint, 2.38, 0, 0);
  const orb = mesh(group, new THREE.SphereGeometry(0.095, 22, 14), white, 2.06, 1.24, 0.42);
  const crystal = mesh(group, new THREE.OctahedronGeometry(0.155), sky, -2.12, 0.88, -0.20);

  const pointer = attachPointerTilt(viewport, 0.10, 0.15);

  function update(progress, elapsedMs = 0) {
    const t = elapsedMs / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;

    rig.rotation.x = 0.10 + Math.sin(t * 0.6) * 0.02 + pointer.x;
    rig.rotation.y = -0.21 + Math.sin(t * 0.45) * 0.045 + pointer.y;
    rig.position.y = Math.sin(t * 0.85) * 0.045;

    statsPanel.position.y = 0.98 + Math.sin(t * 1.05 + 0.8) * 0.04;
    ordersPanel.position.y = -0.94 + Math.sin(t * 1.0 + 2.2) * 0.04;
    waveDock.position.y = -0.94 + Math.sin(t * 1.2) * 0.035;

    bars.forEach((bar, i) => {
      const amp = 0.75 + 0.45 * Math.sin(t * 3.4 - i * 0.72);
      bar.scale.y = Math.max(0.32, amp);
    });

    ring.rotation.z = t * 0.14;
    signalDot.position.set(Math.cos(t * 0.85) * 2.38, Math.sin(t * 0.85) * 2.38, 0);
    orb.position.y = 1.24 + Math.sin(t * 1.25) * 0.07;
    crystal.rotation.set(t * 0.4, t * 0.55, 0);
  }

  update.continuous = true;
  return update;
}

/* ============================================================================
 * 2. MOTIF (layers): 매트 갤럭시 S 울트라 3겹 영상 레이어 + 뷰파인더 + 타임라인
 * ============================================================================ */
function layers(group, viewport, ctx) {
  const rig = new THREE.Group();
  rig.rotation.set(-0.13, -0.31, -0.06);
  group.add(rig);

  const obsidian = matte(0x1f1b28, 0.94);
  const slateRail = matte(0x474157, 0.90);
  const pinkMat = matte(0xff3d88, 0.88);
  const blushMat = matte(0xffb5d4, 0.90);
  const whiteMat = matte(0xffffff, 0.90);

  function addFilmLayer(parent, { width, height, depth, url, rimColor, sprockets = false }) {
    const plate = new THREE.Group();
    parent.add(plate);
    const r = 0.075;
    mesh(plate, roundedSlab(width + 0.09, height + 0.09, depth, r, 0.015), obsidian);
    if (rimColor) {
      mesh(plate, roundedSlab(width + 0.13, height + 0.13, 0.018, r + 0.01, 0.006), matte(rimColor, 0.90), 0, 0, -depth * 0.42);
    }
    const screenMat = ctx.screen(url, width, height, { fallbackColor: 0x261f33 });
    mesh(plate, roundedPlane(width, height, r * 0.72), screenMat, 0, 0, depth / 2 + 0.026);

    // 좌측 필름 스트립 퍼포레이션(영상 프레임 레이어 디테일)
    if (sprockets) {
      const holeMat = matte(0x3a324d, 0.95);
      for (let i = -3; i <= 3; i++) {
        mesh(plate, roundedSlab(0.048, 0.09, 0.02, 0.012, 0.002), holeMat, -width / 2 - 0.01, i * 0.30, depth / 2 + 0.018);
      }
    }
    return plate;
  }

  // Layer 1 (뒤): SVOR 배경 복원 필름 플레이트 (좌측 퍼포레이션 디테일)
  const back = addFilmLayer(rig, {
    width: 1.38, height: 2.42, depth: 0.09,
    url: './assets/motif-screen-ready.jpg',
    sprockets: true,
  });

  // Layer 2 (중간): SAM 2.1 인물 슬롯 마스크 + 3D 뷰파인더 브래킷 + REC 배지
  const middle = addFilmLayer(rig, {
    width: 1.44, height: 2.52, depth: 0.10,
    url: './assets/motif-screen-select.jpg',
    rimColor: 0xff3d88,
  });

  const brackets = new THREE.Group();
  middle.add(brackets);
  const hBar = roundedSlab(0.24, 0.032, 0.024, 0.008, 0.004);
  const vBar = roundedSlab(0.032, 0.24, 0.024, 0.008, 0.004);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const corner = new THREE.Group();
      corner.userData = { sx, sy };
      mesh(corner, hBar, blushMat, sx * 0.57, sy * 1.15, 0.15);
      mesh(corner, vBar, blushMat, sx * 0.68, sy * 1.04, 0.15);
      brackets.add(corner);
    }
  }
  // 좌상단 매트 REC 인디케이터 점
  const recDot = new THREE.CylinderGeometry(0.036, 0.036, 0.016, 18);
  recDot.rotateX(Math.PI / 2);
  mesh(middle, recDot, pinkMat, -0.52, 1.06, 0.15);

  // Layer 3 (앞): 실제 삼성 갤럭시 S 울트라 (각진 프레임 + 펀치홀 + 물리 버튼 + 타임라인 스크러버)
  const front = new THREE.Group();
  rig.add(front);
  buildGalaxyPhone(front, {
    width: 1.62,
    height: 2.74,
    depth: 0.16,
    bodyColor: 0x1a1722,
    railColor: 0x4b445e,
    bezelColor: 0x110f17,
    screenUrl: './assets/motif-screen-challenge.jpg',
    fallbackColor: 0x241d31,
    ctx,
  });
  // 갤럭시 측면 핫핑크 액센트 언더글로우 림
  mesh(front, roundedSlab(1.66, 2.78, 0.016, 0.075, 0.006), pinkMat, 0, 0, -0.075);

  // 하단 플로팅 매트 타임라인 스크러버 바 + 플레이 배지
  const timeline = new THREE.Group();
  timeline.position.set(0, -1.06, 0.19);
  front.add(timeline);
  mesh(timeline, roundedSlab(1.36, 0.24, 0.04, 0.08, 0.008), matte(0x1b1726, 0.94));
  // 플레이 버튼
  const playDisc = new THREE.CylinderGeometry(0.09, 0.09, 0.032, 24);
  playDisc.rotateX(Math.PI / 2);
  mesh(timeline, playDisc, pinkMat, -0.50, 0, 0.025);
  const tri = new THREE.Shape();
  tri.moveTo(-0.026, -0.036);
  tri.lineTo(0.044, 0);
  tri.lineTo(-0.026, 0.036);
  tri.closePath();
  mesh(timeline, new THREE.ExtrudeGeometry(tri, { depth: 0.014, bevelEnabled: false }), whiteMat, -0.50, 0, 0.042);
  // 타임라인 트랙 + 움직이는 매트 플레이헤드
  mesh(timeline, roundedSlab(0.88, 0.032, 0.014, 0.014, 0.002), matte(0x453d59, 0.95), 0.12, 0, 0.024);
  const playhead = mesh(timeline, roundedSlab(0.052, 0.11, 0.026, 0.018, 0.004), blushMat, -0.10, 0, 0.034);

  // 매트 핫핑크 궤도 링 + 매트 구체
  const ring = orbit(group, 2.38, 0xf2649f, 0.84, -0.26);
  const orb1 = mesh(group, new THREE.SphereGeometry(0.085, 22, 14), blushMat, 2.02, 1.32, 0.50);
  const orb2 = mesh(group, new THREE.SphereGeometry(0.070, 20, 12), pinkMat, -2.06, -1.16, -0.32);

  const pointer = attachPointerTilt(viewport, 0.12, 0.17);

  function update(progress, elapsedMs = 0) {
    const t = elapsedMs / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;
    pointer.hover += (pointer.targetHover - pointer.hover) * 0.08;

    const breathe = 0.5 + 0.5 * Math.sin(t * 1.1);
    const spread = 0.34 * breathe + 0.52 * pointer.hover;

    back.position.set(-1.08 - 0.26 * spread, -0.22 - 0.09 * spread, -0.78 - 0.32 * spread);
    back.rotation.y = 0.10 + 0.04 * spread;

    middle.position.set(-0.04, 0.02, -0.02);

    front.position.set(1.04 + 0.22 * spread, 0.18 + 0.08 * spread, 0.72 + 0.30 * spread);
    front.rotation.y = -0.08 - 0.04 * spread;

    for (const corner of brackets.children) {
      const { sx, sy } = corner.userData;
      corner.position.set(sx * 0.055 * spread, sy * 0.055 * spread, 0.07 * spread);
    }

    // 타임라인 플레이헤드가 트랙 위를 부드럽게 왕복합니다.
    playhead.position.x = -0.26 + 0.72 * (0.5 + 0.5 * Math.sin(t * 0.9));

    rig.rotation.x = -0.13 + Math.sin(t * 0.58) * 0.025 + pointer.x;
    rig.rotation.y = -0.31 + Math.sin(t * 0.44) * 0.05 + pointer.y;
    rig.position.y = Math.sin(t * 0.85) * 0.045;

    ring.rotation.z = -t * 0.12;
    orb1.position.y = 1.32 + Math.sin(t * 1.35) * 0.08;
    orb2.position.y = -1.16 + Math.cos(t * 1.15) * 0.07;
  }

  update.continuous = true;
  return update;
}

/* ============================================================================
 * 3. MODERA (phone): 매트 갤럭시 S 울트라 히어로 폰 + 2단 분석 카드 + AI 스파클
 * ============================================================================ */
function phone(group, viewport, ctx) {
  const rig = new THREE.Group();
  group.add(rig);

  const cardFrontMat = matte(0xf5e5bc, 0.93);
  const cardBackMat = matte(0xe7d29b, 0.95);
  const goldMat = matte(0xf2a900, 0.88);
  const amberMat = matte(0xd97706, 0.90);
  const creamChip = matte(0xfff9e8, 0.94);

  // 중앙 단일 3D 삼성 갤럭시 S 울트라 (각진 티타늄 그레이 프레임 + 펀치홀 + 물리 키)
  const device = new THREE.Group();
  device.rotation.set(-0.11, -0.25, -0.12);
  device.scale.setScalar(0.95);
  rig.add(device);

  buildGalaxyPhone(device, {
    width: 1.82,
    height: 3.56,
    depth: 0.20,
    bodyColor: 0x2c2925,
    railColor: 0x6f685d,
    bezelColor: 0x171513,
    screenUrl: './assets/modera-screen-home.jpg',
    fallbackColor: 0xfff8e7,
    ctx,
  });

  // 주변 3D 공간에 2겹 종이카드 두께로 떠 있는 멀티모달 분석 결과 카드
  function addFloatingCard(parent, { width, height, url, x, y, z, rx, ry, rz, accentColor, chipSide = 1 }) {
    const card = new THREE.Group();
    card.position.set(x, y, z);
    card.rotation.set(rx, ry, rz);
    parent.add(card);

    // 뒤쪽 보조 스택 카드 (문서 정리 느낌의 2겹 깊이)
    mesh(card, roundedSlab(width + 0.08, height + 0.08, 0.036, 0.11, 0.012), cardBackMat, chipSide * -0.055, -0.055, -0.068);
    // 메인 카드 본체
    mesh(card, roundedSlab(width + 0.09, height + 0.09, 0.062, 0.11, 0.016), cardFrontMat);
    // 상단 카테고리 컬러 탭
    mesh(card, roundedSlab(width * 0.36, 0.044, 0.024, 0.02, 0.004), matte(accentColor, 0.88), -width * 0.24, height / 2 + 0.018, 0.04);
    // 실제 스크린샷 텍스처
    const mat = ctx.screen(url, width, height, { fallbackColor: 0xfffdf7, alignY: 1 });
    mesh(card, roundedPlane(width, height, 0.08), mat, 0, 0, 0.056);

    // 하단 바깥 모서리 부유 태그 알약 2개
    mesh(card, roundedSlab(0.36, 0.095, 0.028, 0.045, 0.006), creamChip, chipSide * (width * 0.26), -height / 2 - 0.06, 0.07);
    mesh(card, roundedSlab(0.24, 0.032, 0.012, 0.014, 0.002), matte(accentColor, 0.88), chipSide * (width * 0.26), -height / 2 - 0.06, 0.088);
    return card;
  }

  // 좌상단 부유 카드: AI 분석 결과 (SSAFY 심화과정 커리큘럼 안내)
  const leftCard = addFloatingCard(rig, {
    width: 1.18, height: 1.50,
    url: './assets/modera-screen-analysis.jpg',
    x: -1.48, y: 0.54, z: 0.42,
    rx: 0.04, ry: 0.22, rz: 0.06,
    accentColor: 0xf2a900,
    chipSide: -1,
  });

  // 우하단 부유 카드: AI 요약 문서 상세 (Claude 설치 방법 2가지)
  const rightCard = addFloatingCard(rig, {
    width: 1.16, height: 1.44,
    url: './assets/modera-screen-doc.jpg',
    x: 1.44, y: -0.58, z: 0.56,
    rx: -0.05, ry: -0.24, rz: -0.05,
    accentColor: 0xd97706,
    chipSide: 1,
  });

  // 좌상단 소형 매트 3D 돋보기(자연어 검색 상징)
  const magnifier = new THREE.Group();
  magnifier.position.set(-1.38, 1.58, 0.62);
  magnifier.rotation.set(0.08, 0.16, -0.42);
  rig.add(magnifier);
  mesh(magnifier, new THREE.TorusGeometry(0.18, 0.036, 12, 36), amberMat);
  mesh(magnifier, new THREE.CapsuleGeometry(0.032, 0.18, 8, 12), matte(0x3a342c, 0.92), 0, -0.28, 0);

  // 매트 골드 궤도 링 + 4각 매트 AI 스파클 별 클러스터
  const ring = orbit(group, 2.24, 0xd88b00, 1.24, -0.22);
  ring.position.set(0, -0.22, -0.08);
  const spark = new THREE.Group();
  spark.position.set(1.36, 1.24, 0.68);
  spark.rotation.z = 0.22;
  group.add(spark);
  const stars = [
    starMesh(spark, 0.30, 0.085, 0.065, goldMat, 0, 0, 0),
    starMesh(spark, 0.15, 0.045, 0.045, amberMat, 0.44, 0.36, 0.04),
    starMesh(spark, 0.12, 0.038, 0.04, goldMat, -0.16, -0.42, 0.02),
  ];

  const pointer = attachPointerTilt(viewport, 0.11, 0.16);

  function update(progress, elapsedMs = 0) {
    const t = elapsedMs / 1000;
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;
    pointer.hover += (pointer.targetHover - pointer.hover) * 0.08;

    rig.rotation.x = pointer.x;
    rig.rotation.y = pointer.y;

    device.rotation.y = -0.25 + Math.sin(t * 0.52) * 0.065;
    device.position.y = Math.sin(t * 0.9) * 0.055;

    leftCard.position.x = -1.48 - 0.10 * pointer.hover;
    leftCard.position.y = 0.54 + Math.sin(t * 1.1 + 0.6) * 0.07;
    rightCard.position.x = 1.44 + 0.10 * pointer.hover;
    rightCard.position.y = -0.58 + Math.sin(t * 1.05 + 2.4) * 0.07;

    magnifier.position.y = 1.58 + Math.sin(t * 1.3 + 1.2) * 0.06;
    magnifier.rotation.z = -0.42 + Math.sin(t * 0.9) * 0.08;

    const flare = 0.5 + 0.5 * Math.sin(t * 2.0);
    spark.position.y = 1.24 + 0.11 * flare;
    spark.rotation.z = 0.22 + 0.18 * Math.sin(t * 1.2);
    spark.scale.setScalar(0.96 + 0.14 * flare + 0.10 * pointer.hover);
    stars.forEach((star, i) => {
      star.rotation.y = Math.sin(t * (0.9 + i * 0.3)) * 0.45;
    });

    ring.rotation.x = 1.24 - 0.07 * Math.sin(t * 0.78);
    ring.rotation.z = t * 0.09;
  }

  update.continuous = true;
  return update;
}

/* ============================================================================
 * 4. AI Workflow (network): 매트 3D 아키텍처 노드 네트워크
 * ============================================================================ */
function network(group, viewport) {
  const rig = new THREE.Group();
  rig.rotation.set(0.32, -0.34, 0.04);
  group.add(rig);

  // 바닥 기준 그리드 링
  const floorRing1 = new THREE.Mesh(
    new THREE.TorusGeometry(2.05, 0.008, 8, 96),
    matte(0xcbd5e1, 0.96)
  );
  floorRing1.rotation.x = Math.PI / 2;
  floorRing1.position.y = -1.08;
  rig.add(floorRing1);

  const floorRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.007, 8, 72),
    matte(0xdbe3ef, 0.96)
  );
  floorRing2.rotation.x = Math.PI / 2;
  floorRing2.position.y = -1.08;
  rig.add(floorRing2);

  // 중앙 허브: 설계·컨텍스트 코어 (매트 다면체 + 이중 궤도 링)
  const hubPos = new THREE.Vector3(0, 0.08, 0);
  const hubGroup = new THREE.Group();
  hubGroup.position.copy(hubPos);
  rig.add(hubGroup);

  mesh(hubGroup, new THREE.OctahedronGeometry(0.40, 0), matte(0x2450db, 0.90));
  const hubHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.020, 12, 72),
    matte(0xe0a419, 0.90)
  );
  hubHalo.rotation.set(1.15, 0.35, 0);
  hubGroup.add(hubHalo);

  const hubHalo2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.76, 0.013, 10, 72),
    matte(0x6366f1, 0.92)
  );
  hubHalo2.rotation.set(-0.9, 0.55, 0.2);
  hubGroup.add(hubHalo2);

  // 4개 위성 노드 (구체화된 매트 아키텍처 모듈)
  const nodeSpecs = [
    { key: 'claude', pos: new THREE.Vector3(-1.72, 0.72, 0.52), color: 0xd97757, accent: 0xf4b299, shape: 'terminal' },
    { key: 'codex', pos: new THREE.Vector3(1.68, 0.78, -0.45), color: 0x263245, accent: 0x7b93b5, shape: 'agent' },
    { key: 'mcp', pos: new THREE.Vector3(-1.42, -0.74, -0.62), color: 0x7c3aed, accent: 0xc4b5fd, shape: 'cluster' },
    { key: 'verify', pos: new THREE.Vector3(1.52, -0.68, 0.68), color: 0x0f766e, accent: 0x5eead4, shape: 'worktree' },
  ];

  const nodeMeshes = {};
  const anchors = { hub: hubPos.clone().add(new THREE.Vector3(0, 0.78, 0)) };

  for (const spec of nodeSpecs) {
    const holder = new THREE.Group();
    holder.position.copy(spec.pos);
    rig.add(holder);

    // 이중 매트 받침 링
    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.014, 10, 48),
      matte(spec.accent, 0.94)
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -0.26;
    holder.add(baseRing);

    if (spec.shape === 'terminal') {
      // 코딩 툴 터미널 블록
      mesh(holder, roundedSlab(0.60, 0.44, 0.16, 0.07, 0.018), matte(spec.color, 0.92));
      mesh(holder, roundedSlab(0.50, 0.30, 0.03, 0.04, 0.006), matte(0x231a18, 0.95), 0, -0.02, 0.09);
      mesh(holder, roundedSlab(0.28, 0.045, 0.02, 0.015, 0.004), matte(0xffffff, 0.90), -0.06, 0.05, 0.115);
      mesh(holder, roundedSlab(0.20, 0.045, 0.02, 0.015, 0.004), matte(spec.accent, 0.90), -0.10, -0.04, 0.115);
    } else if (spec.shape === 'agent') {
      // 자율 에이전트 육각 코어 + 상단 링
      mesh(holder, new THREE.CylinderGeometry(0.28, 0.28, 0.38, 6), matte(spec.color, 0.92));
      mesh(holder, new THREE.CylinderGeometry(0.15, 0.15, 0.44, 6), matte(0x93c5fd, 0.90));
      const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.018, 8, 6), matte(spec.accent, 0.92));
      capRing.rotation.x = Math.PI / 2;
      capRing.position.y = 0.22;
      holder.add(capRing);
    } else if (spec.shape === 'cluster') {
      // MCP·Hook 연결 허브 클러스터
      mesh(holder, new THREE.SphereGeometry(0.20, 22, 16), matte(spec.color, 0.92));
      mesh(holder, new THREE.SphereGeometry(0.11, 18, 12), matte(spec.accent, 0.92), 0.26, 0.14, 0.08);
      mesh(holder, new THREE.SphereGeometry(0.10, 18, 12), matte(spec.accent, 0.92), -0.23, -0.12, 0.11);
      mesh(holder, new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8), matte(0xd8ccff, 0.94), 0.13, 0.07, 0.04).rotation.z = -1.05;
    } else {
      // Git Worktree 3단 병렬 브랜치 슬랩
      mesh(holder, roundedSlab(0.56, 0.10, 0.42, 0.04, 0.012), matte(spec.color, 0.92), 0, -0.14, 0);
      mesh(holder, roundedSlab(0.50, 0.10, 0.36, 0.04, 0.012), matte(0x14b8a6, 0.92), 0.04, 0.02, 0);
      mesh(holder, roundedSlab(0.44, 0.10, 0.30, 0.04, 0.012), matte(spec.accent, 0.92), 0.08, 0.18, 0);
    }

    const dropHeight = spec.pos.y - (-1.08);
    if (dropHeight > 0.1) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, dropHeight, 6),
        matte(0xcbd5e1, 0.96)
      );
      stem.position.set(spec.pos.x, -1.08 + dropHeight / 2, spec.pos.z);
      rig.add(stem);
      const foot = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 16),
        matte(spec.accent, 0.94)
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
    { from: hubPos, to: byKey.claude.pos, bend: new THREE.Vector3(-0.15, 0.36, 0.24), color: 0x3b66f5, speed: 0.24, offset: 0.0 },
    { from: hubPos, to: byKey.codex.pos, bend: new THREE.Vector3(0.18, 0.34, -0.22), color: 0x475569, speed: 0.22, offset: 0.25 },
    { from: hubPos, to: byKey.mcp.pos, bend: new THREE.Vector3(-0.22, -0.18, -0.34), color: 0x8b5cf6, speed: 0.21, offset: 0.5 },
    { from: hubPos, to: byKey.verify.pos, bend: new THREE.Vector3(0.22, -0.16, 0.32), color: 0x0d9488, speed: 0.25, offset: 0.75 },
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
      new THREE.TubeGeometry(curve, 36, link.outer ? 0.015 : 0.023, 8, false),
      matte(link.color, 0.94)
    );
    rig.add(tube);

    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(link.outer ? 0.052 : 0.068, 16, 12),
      matte(link.outer ? 0x2450db : link.color, 0.88, {
        emissive: link.outer ? 0x2450db : link.color,
        emissiveIntensity: 0.18,
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

  // 부드러운 무광 스튜디오 확산 조명(광택 하이라이트 제거)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x868b98, 2.25));
  const key = new THREE.DirectionalLight(0xffffff, 0.92);
  key.position.set(-2.5, 4.5, 7);
  const fill = new THREE.DirectionalLight(0xeef2ff, 0.42);
  fill.position.set(4, -1, 4);
  scene.add(key, fill);

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
