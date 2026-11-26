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

const build = { phone, layers, wave };

export function createProjectModel(viewport) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 2.7, -2.7, .1, 50);
  camera.position.set(0, 0, 10);
  const model = new THREE.Group();
  scene.add(model);
  const animateDetails = build[viewport.dataset.model](model);

  scene.add(new THREE.HemisphereLight(0xf4f5ff, 0x6a5261, 2.05));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-3, 5, 7);
  const rim = new THREE.DirectionalLight(0xd4deff, 1.65);
  rim.position.set(4, 0, -4);
  scene.add(key, rim);

  let frame = 0;
  let started = null;

  function draw(progress, detailProgress = 1) {
    const eased = 1 - (1 - progress) ** 3;
    model.rotation.y = (eased - 1) * Math.PI * 2;
    model.scale.setScalar(.80 + .20 * eased);
    model.position.y = -.19 * (1 - eased);
    animateDetails(detailProgress);
    canvas.style.opacity = Math.min(1, .10 + progress * 4).toString();
    renderer.render(scene, camera);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    draw(1);
  }

  function animate(now) {
    started ??= now;
    const elapsed = now - started;
    // 회전이 감속하는 동안 프로젝트별 모션을 겹치고, 끝나면 렌더링을 멈춥니다.
    const detailProgress = THREE.MathUtils.clamp((elapsed - 480) / 880, 0, 1);
    draw(Math.min(elapsed / 710, 1), detailProgress);
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
