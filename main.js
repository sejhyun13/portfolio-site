const about = document.querySelector('#about');
const navLinks = [...document.querySelectorAll('[data-nav]')];
const header = document.querySelector('.site-header');
let navObserver;

function observeNav() {
  navObserver?.disconnect();
  // 고정 헤더 아래에서 화면의 위쪽 절반을 기준으로 현재 메뉴를 표시합니다.
  navObserver = new IntersectionObserver(([entry]) => {
    const current = entry.isIntersecting ? '#about' : '#projects';
    for (const link of navLinks) {
      if (link.hash === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: `-${header.offsetHeight + 1}px 0px -${Math.round(innerHeight * .44)}px 0px` });
  navObserver.observe(about);
}
new ResizeObserver(observeNav).observe(header);
window.addEventListener('resize', observeNav);

const root = document.documentElement;
const themeSections = [...document.querySelectorAll('.project')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const palette = [[255, 255, 255], ...themeSections.map((section) => {
  const hex = getComputedStyle(section).getPropertyValue('--surface').trim();
  return hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16));
})];
let projectStarts = [];
let transitionLength = 0;
let transitionLead = 0;
let themeFrame = 0;
let themePosition = 0;
let themeVelocity = 0;
let lastThemeTime = null;

function targetTheme() {
  const scroll = window.scrollY;
  const next = projectStarts.findIndex((start) => scroll < start - transitionLead + transitionLength);
  if (next === -1) return palette.length - 1;
  return next + Math.max(0, (scroll - projectStarts[next] + transitionLead) / transitionLength);
}

function paintTheme() {
  const position = Math.max(0, Math.min(themePosition, palette.length - 1));
  const index = Math.min(Math.floor(position), palette.length - 2);
  const progress = position - index;
  const mix = progress ** 3 * (10 - 15 * progress + 6 * progress ** 2);
  const color = palette[index].map((from, channel) =>
    Math.round(from + (palette[index + 1][channel] - from) * mix)
  );

  const rgb = `rgb(${color.join(' ')})`;
  if (root.style.getPropertyValue('--scene-color') === rgb) return;

  // 배경의 밝기가 교차하는 순간에만 글자색을 바꿔 전환 중에도 대비를 확보합니다.
  const [red, green, blue] = color.map((channel) => {
    const sRGB = channel / 255;
    return sRGB <= .04045 ? sRGB / 12.92 : ((sRGB + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * red + .7152 * green + .0722 * blue;
  root.style.setProperty('--scene-color', rgb);
  root.dataset.scene = luminance < .179 ? 'light-ink' : 'dark-ink';
  root.toggleAttribute('data-scene-violet', luminance <= .08);
}

function syncTheme() {
  cancelAnimationFrame(themeFrame);
  themeFrame = 0;
  lastThemeTime = null;
  themeVelocity = 0;
  const target = targetTheme();
  themePosition = reducedMotion.matches ? Math.round(target) : target;
  paintTheme();
}

function animateTheme(now) {
  themeFrame = 0;
  if (reducedMotion.matches) {
    syncTheme();
    return;
  }

  // 색만 스크롤보다 늦게 따라가고 방향을 바꿔도 현재 위치와 속도에서 이어집니다.
  const target = targetTheme();
  const rate = 22;
  const dt = Math.min((now - (lastThemeTime ?? now - 16)) / 1000, .05);
  const offset = themePosition - target;
  const momentum = themeVelocity + rate * offset;
  const decay = Math.exp(-rate * dt);
  themePosition = target + (offset + momentum * dt) * decay;
  themeVelocity = (themeVelocity - rate * momentum * dt) * decay;

  if (Math.abs(themePosition - target) < .001 && Math.abs(themeVelocity) < .02) {
    themePosition = target;
    themeVelocity = 0;
    lastThemeTime = null;
  } else {
    lastThemeTime = now;
    scheduleTheme();
  }
  paintTheme();
}

function scheduleTheme() {
  if (!themeFrame) themeFrame = requestAnimationFrame(animateTheme);
}

function measureTheme() {
  const viewport = Math.min(window.innerHeight, 1050);
  projectStarts = themeSections.map((section) => section.getBoundingClientRect().top + window.scrollY);
  const gaps = projectStarts.slice(1).map((start, index) => start - projectStarts[index]);
  transitionLength = Math.min(viewport * .72, ...gaps);
  transitionLead = viewport * .96;
  scheduleTheme();
}

window.addEventListener('scroll', scheduleTheme, { passive: true });
window.addEventListener('resize', measureTheme);
window.addEventListener('pageshow', () => {
  measureTheme();
  syncTheme();
});
reducedMotion.addEventListener('change', syncTheme);
new ResizeObserver(measureTheme).observe(document.body);
measureTheme();
syncTheme();

const profileViewport = document.querySelector('.profile-viewport');
const profileControls = [...document.querySelectorAll('.profile-controls a')];
const profilePanels = [...profileViewport.children];
let profileFrame = 0;

function activeProfileIndex() {
  return Math.max(0, Math.min(profilePanels.length - 1,
    Math.round(profileViewport.scrollLeft / profileViewport.clientWidth)));
}

function updateProfile() {
  const index = activeProfileIndex();
  profileControls.forEach((control, candidate) => {
    if (candidate === index) control.setAttribute('aria-current', 'true');
    else control.removeAttribute('aria-current');
  });
}

function stopProfileScroll() {
  cancelAnimationFrame(profileFrame);
  profileFrame = 0;
  profileViewport.classList.remove('is-sliding');
}

function goToProfile(index) {
  cancelAnimationFrame(profileFrame);
  const from = profileViewport.scrollLeft;
  const target = index * profileViewport.clientWidth;
  if (reducedMotion.matches || from === target) {
    profileViewport.scrollLeft = target;
    stopProfileScroll();
    return;
  }

  // 거리와 무관하게 빠르게 이동하고 직접 밀기 시작하면 브라우저의 스냅으로 돌아갑니다.
  profileViewport.classList.add('is-sliding');
  const start = performance.now();
  function slide(now) {
    const progress = reducedMotion.matches ? 1 : Math.min((now - start) / 320, 1);
    const eased = 1 - (1 - progress) ** 3;
    profileViewport.scrollLeft = from + (index * profileViewport.clientWidth - from) * eased;
    if (progress < 1) profileFrame = requestAnimationFrame(slide);
    else stopProfileScroll();
  }
  profileFrame = requestAnimationFrame(slide);
}

profileControls.forEach((control, index) => {
  control.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    goToProfile(index);
  });
});

profileViewport.closest('.profile-details').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const current = profileControls.includes(event.target) ? profileControls.indexOf(event.target) : activeProfileIndex();
  const target = event.key === 'Home' ? 0 : event.key === 'End' ? profilePanels.length - 1
    : Math.max(0, Math.min(profilePanels.length - 1, current + (event.key === 'ArrowLeft' ? -1 : 1)));
  event.preventDefault();
  if (event.target !== profileViewport) profileControls[target].focus({ preventScroll: true });
  goToProfile(target);
});

profileViewport.addEventListener('scroll', updateProfile, { passive: true });
profileViewport.addEventListener('pointerdown', stopProfileScroll);
profileViewport.addEventListener('wheel', stopProfileScroll, { passive: true });
new ResizeObserver(updateProfile).observe(profileViewport);
profileViewport.setAttribute('data-ready', '');
updateProfile();

const profileDetails = profileViewport.closest('.profile-details');
const sectionIndex = document.querySelector('.section-index');
const sectionEntries = [...sectionIndex.querySelectorAll('a')].map((link) => {
  const profileIndex = profileControls.findIndex((control) => control.hash === link.hash);
  return { link, profileIndex, target: profileIndex < 0 ? document.querySelector(link.hash) : profileDetails };
});
let sectionIndexFrame = 0;

function updateSectionIndex() {
  sectionIndexFrame = 0;
  const activeProfile = activeProfileIndex();
  const readingLine = header.offsetHeight + 56;
  const atBottom = Math.ceil(scrollY + innerHeight) >= root.scrollHeight - 2;
  // 소개의 하위 항목들은 같은 높이에 있어 현재 보이는 가로 패널만 판단에 포함합니다.
  const current = atBottom ? sectionEntries.at(-1) : sectionEntries.findLast(({ target, profileIndex }) =>
    (profileIndex < 0 || profileIndex === activeProfile) && target.getBoundingClientRect().top <= readingLine
  ) ?? sectionEntries[0];
  for (const { link } of sectionEntries) {
    if (link === current.link) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

function scheduleSectionIndex() {
  if (!sectionIndexFrame) sectionIndexFrame = requestAnimationFrame(updateSectionIndex);
}

sectionIndex.addEventListener('click', (event) => {
  const entry = sectionEntries.find(({ link }) => link === event.target.closest('a'));
  if (!entry || entry.profileIndex < 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  goToProfile(entry.profileIndex);
  profileDetails.scrollIntoView({ block: 'start' });
});
window.addEventListener('scroll', scheduleSectionIndex, { passive: true });
profileViewport.addEventListener('scroll', scheduleSectionIndex, { passive: true });
new ResizeObserver(scheduleSectionIndex).observe(document.body);
updateSectionIndex();

// 뷰포트에 들어온 본문만 한 번 움직여 이미 읽은 문단을 다시 흔들지 않습니다.
const reveal = new IntersectionObserver((entries) => {
  for (const { intersectionRatio, target } of entries) {
    if (intersectionRatio < .22) continue;
    target.classList.add('is-revealed');
    reveal.unobserve(target);
  }
}, { threshold: .22 });
document.querySelectorAll('.project-copy').forEach((block) => reveal.observe(block));

const art = document.querySelectorAll('[data-model]');
const models = new WeakMap();
let modelModule;

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const viewport = entry.target;
    // 도형이 화면의 4분의 1 이상 들어왔을 때 회전을 시작합니다.
    const visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
    viewport.classList.toggle('is-visible', visible);
    if (!visible) {
      models.get(viewport)?.stop();
      continue;
    }

    modelModule ??= import('./project-models.js');
    modelModule.then(({ createProjectModel }) => {
      if (!viewport.classList.contains('is-visible')) return;
      if (!models.has(viewport)) {
        models.set(viewport, createProjectModel(viewport));
      }
      models.get(viewport).enter();
    }).catch(() => {
      // WebGL을 사용할 수 없으면 본문의 정적 아이콘을 유지합니다.
      observer.unobserve(viewport);
    });
  }
}, { threshold: 0.25 });

art.forEach((viewport) => observer.observe(viewport));

document.querySelector('[data-print-page]')?.addEventListener('click', () => {
  window.print();
});
