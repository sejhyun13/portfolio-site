const introSections = [
  document.querySelector('#about'),
  document.querySelector('#stack'),
  document.querySelector('#ai-workflow'),
].filter(Boolean);
const navLinks = [...document.querySelectorAll('[data-nav]')];
const header = document.querySelector('.site-header');
let navObserver;

function observeNav() {
  navObserver?.disconnect();
  const visible = new Set();
  // 고정 헤더 아래에서 화면의 위쪽 절반을 기준으로 현재 메뉴를 표시합니다.
  navObserver = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
    }
    const current = visible.size ? '#about' : '#projects';
    for (const link of navLinks) {
      if (link.hash === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: `-${header.offsetHeight + 1}px 0px -${Math.round(innerHeight * .44)}px 0px` });
  introSections.forEach((sec) => navObserver.observe(sec));
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
reducedMotion.addEventListener?.('change', syncTheme);
new ResizeObserver(measureTheme).observe(document.body);
measureTheme();
syncTheme();

const profileDetails = document.querySelector('.profile-details');
const profileControls = profileDetails.querySelector('.profile-controls');
const profileTabs = [...profileControls.querySelectorAll('a')];
const profilePanels = profileTabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
let activeProfile = 0;

function selectProfile(index, { focus = false } = {}) {
  activeProfile = Math.max(0, Math.min(profileTabs.length - 1, index));
  profileTabs.forEach((tab, i) => {
    const selected = i === activeProfile;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    profilePanels[i].hidden = !selected;
    profilePanels[i].inert = !selected;
  });
  if (focus) profileTabs[activeProfile].focus();
  scheduleSectionIndex();
}
profileTabs.forEach((tab, index) => {
  tab.setAttribute('role', 'tab');
  profilePanels[index].setAttribute('role', 'tabpanel');
  tab.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectProfile(index);
  });
});

profileControls.setAttribute('role', 'tablist');
profileControls.setAttribute('aria-orientation', 'vertical');
profileControls.addEventListener('keydown', (event) => {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  let next = activeProfile;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = profileTabs.length - 1;
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (activeProfile - 1 + profileTabs.length) % profileTabs.length;
  else next = (activeProfile + 1) % profileTabs.length;
  selectProfile(next, { focus: true });
});

const sectionIndex = document.querySelector('.section-index');
const sectionEntries = [...sectionIndex.querySelectorAll('a')].map((link) => {
  const profileIndex = profileTabs.findIndex((tab) => tab.hash === link.hash);
  return { link, profileIndex, target: profileIndex < 0 ? document.querySelector(link.hash) : profileDetails };
});
let sectionIndexFrame = 0;
// 탭을 고르는 기능은 HTML 링크로도 작동하고, 이벤트 등록이 끝나면 탭 동작으로 전환합니다.
selectProfile(Math.max(0, profileTabs.findIndex((tab) => tab.hash === location.hash)));
profileDetails.dataset.tabsReady = '';

function updateSectionIndex() {
  sectionIndexFrame = 0;
  const readingLine = header.offsetHeight + 56;
  const atBottom = Math.ceil(scrollY + innerHeight) >= root.scrollHeight - 2;
  let current = sectionEntries[sectionEntries.length - 1];
  if (!atBottom) {
    current = sectionEntries[0];
    for (let index = sectionEntries.length - 1; index >= 0; index--) {
      const entry = sectionEntries[index];
      if ((entry.profileIndex < 0 || entry.profileIndex === activeProfile)
        && entry.target && entry.target.getBoundingClientRect().top <= readingLine) {
        current = entry;
        break;
      }
    }
  }
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
  selectProfile(entry.profileIndex);
  profileDetails.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  if (location.hash) history.replaceState(null, '', `${location.pathname}${location.search}`);
});

// 내부 섹션 링크 클릭 시 URL에 #해시를 붙이지 않고 해당 위치로 이동합니다.
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href').slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  if (link.classList.contains('skip-link')) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  if (location.hash) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }
});

window.addEventListener('scroll', scheduleSectionIndex, { passive: true });
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

const stackDetail = document.querySelector('[data-stack-detail]');
if (stackDetail) {
  const defaultTip = stackDetail.textContent;
  const showTip = (chip) => {
    const tip = chip?.getAttribute('aria-description');
    stackDetail.textContent = tip ?? defaultTip;
    stackDetail.classList.toggle('is-active', Boolean(tip));
  };
  document.querySelectorAll('.stack-items li[aria-description]').forEach((chip) => {
    chip.addEventListener('mouseenter', () => showTip(chip));
    chip.addEventListener('focus', () => showTip(chip));
    chip.addEventListener('click', () => showTip(chip));
  });
  document.querySelector('.profile-stack')?.addEventListener('mouseleave', () => showTip(null));
  stackDetail.closest('#stack').dataset.stackReady = '';
}
