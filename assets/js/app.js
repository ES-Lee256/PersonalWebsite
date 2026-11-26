/**
 * app.js — 读取 conf、发现语言包并渲染整个个人网站。
 * 没有框架，没有构建步骤；所有内容均来自 content/ 与 lang/。
 */

import { getSection, parseConf } from './conf.js';
import { parseBilibiliItems, parseMainPage, parseProjects, parseSectionMeta } from './content.js';

const BASE_URL = new URL('./', document.baseURI);
const LANGUAGE_STORAGE_KEY = 'zhuge-site-language';
const DEFAULT_CODE = 'zh-CN';

const DEFAULT_LANGUAGE = {
  code: DEFAULT_CODE,
  name: '简体中文',
  locale: 'zh-CN',
  dir: 'ltr',
  order: -1,
  file: '',
  path: '',
};

const SECTION_DEFS = [
  {
    id: 'bilibili',
    folder: 'content/bilibili',
    file: 'bilibili.conf',
    metaSection: 'bilibili',
    kind: 'bilibili',
    emptyKey: 'bilibili.empty',
    hideWhenEmpty: false,
  },
  {
    id: 'git',
    folder: 'content/gitproduct',
    file: 'git.conf',
    metaSection: 'git',
    jumpKey: 'action.view',
    emptyKey: 'git.empty',
    hideWhenEmpty: false,
  },
  {
    id: 'game',
    folder: 'content/gameproject',
    file: 'game.conf',
    metaSection: 'game',
    studioSection: 'studiowebsite',
    jumpKey: 'action.view',
    studioJumpKey: 'action.gameSite',
    emptyKey: 'game.empty',
    hideWhenEmpty: false,
    fullEmpty: true,
  },
  {
    id: 'commercial',
    folder: 'content/commercial',
    file: 'commercial.conf',
    metaSection: 'commercial',
    jumpKey: 'action.buy',
    emptyKey: 'commercial.empty',
    hideWhenEmpty: true,
  },
  {
    id: 'showcase',
    folder: 'content/showcase',
    file: 'showcase.conf',
    metaSection: 'showcase',
    jumpKey: 'action.buy',
    emptyKey: 'showcase.empty',
    hideWhenEmpty: true,
  },
];

const ZH_CN = {
  'page.title': '{name} · 个人网站',
  'meta.description': '{name} 的个人网站：开源项目、游戏作品、实体物品与个人橱窗。',
  skip: '跳到主要内容',
  'brand.sub': '个人网站',
  'nav.label': '主要导航',
  'nav.home': '首页',
  'nav.bilibili': 'B站精选',
  'nav.git': '开源项目',
  'nav.game': '游戏项目',
  'nav.commercial': '商业实体',
  'nav.showcase': '个人橱窗',
  'language.label': '切换语言',
  'hero.kicker': '个人主页 / PERSONAL SITE',
  'hero.avatarAlt': '{name} 的头像',
  'hero.introFallback': '你好，我是诸葛蕴乂。这里是我的个人网站，用来归档开源项目、游戏作品，以及一些实体与个人选物。欢迎随处看看。',
  'social.label': '社交账户',
  'social.bilibili': '个人BiliBili',
  'social.github': '个人 Github',
  'social.email': '个人邮箱',
  'social.emailNote': '若有要务或有要反馈的意见，请用这个邮箱。',
  'social.emailAria': '发送邮件至 {email}',
  'social.external': '{name}（在新窗口打开）',
  scroll: '向下浏览',
  'section.bilibili.kicker': 'BILIBILI FEATURED',
  'section.bilibili.title': 'Bilibili 精选',
  'section.bilibili.desc': '从 Bilibili 挑出的一些片段、创作与收藏。',
  'section.git.kicker': 'OPEN SOURCE',
  'section.git.title': 'GitHub 开源项目',
  'section.git.desc': '代码、工具与仍在生长中的想法。',
  'section.game.kicker': 'PLAYGROUND',
  'section.game.title': '游戏项目',
  'section.game.desc': '从规则、叙事到交互，一些正在被做出来的世界。',
  'section.commercial.kicker': 'OBJECTS',
  'section.commercial.title': '商业实体物品',
  'section.commercial.desc': '可以带走的设计与物件。',
  'section.showcase.kicker': 'SELECTED',
  'section.showcase.title': '个人橱窗',
  'section.showcase.desc': '我挑选、使用并愿意分享的东西。',
  'action.expand': '展开查看',
  'action.view': '去查看',
  'action.gameSite': '去游戏官网',
  'action.buy': '去购买',
  'action.noLink': '暂无链接',
  'action.back': '返回',
  'action.close': '关闭',
  'project.label': 'PROJECT',
  'project.studioLabel': 'STUDIO',
  'project.untitled': '未命名项目',
  'studio.title': '工作室官网',
  'bilibili.badge': '精选',
  'bilibili.top': '置顶',
  'bilibili.empty': '暂无精选内容，敬请期待',
  'bilibili.untitled': '未命名精选',
  'bilibili.open': '在 Bilibili 打开「{title}」',
  'game.empty': '暂无游戏，敬请期待',
  'git.empty': '暂无开源项目，敬请期待',
  'commercial.empty': '暂无物品，敬请期待',
  'showcase.empty': '暂无橱窗内容，敬请期待',
  'state.loadError': '配置读取失败，请检查 content 目录。',
  'error.content': '内容读取失败。',
  'error.lang': '语言包读取失败，已保留当前语言。',
  'link.modal.title': '选择要前往的网站',
  'link.modal.hint': '这个项目有多个相关网站，选择一个继续。',
  'link.unknown': '未命名链接',
  'link.open': '打开 {name}（在新窗口打开）',
  'aria.expand': '展开查看 {title}',
  'aria.multiple': '选择 {title} 的网站',
  'aria.image': '{title} 的配图',
  'footer.rights': '保留所有权利。',
};

const state = {
  languages: [DEFAULT_LANGUAGE],
  language: null,
  langConf: parseConf(''),
  mainConf: null,
  sectionData: new Map(),
  visibility: new Map(),
  renderToken: 0,
  textCache: new Map(),
  detailProject: null,
  detailReturnFocus: null,
  modalProject: null,
  modalReturnFocus: null,
  loadError: false,
  lastLanguageRefresh: 0,
  languageRefreshing: false,
  toastTimer: null,
  navFrame: 0,
};

const dom = {};

boot();

async function boot() {
  cacheDom();
  bindStaticEvents();
  setupRevealObserver();
  setCopyrightYear();

  await Promise.all([discoverLanguages(), loadSiteData()]);
  const initial = chooseInitialLanguage();
  await setLanguage(initial, { initial: true });

  if (state.loadError) {
    window.setTimeout(() => showToast(t('state.loadError')), 700);
  }
}

function cacheDom() {
  const byId = (id) => document.getElementById(id);
  dom.header = byId('siteHeader');
  dom.main = byId('main');
  dom.footer = document.querySelector('.site-footer');
  dom.skipLink = document.querySelector('.skip-link');
  dom.nav = byId('siteNav');
  dom.langSelect = byId('langSelect');
  dom.avatar = byId('avatar');
  dom.avatarFallback = byId('avatarFallback');
  dom.heroName = byId('heroName');
  dom.heroEng = byId('heroEng');
  dom.heroIntro = byId('heroIntro');
  dom.socialLinks = byId('socialLinks');
  dom.emailNote = byId('emailNote');
  dom.detail = byId('detail');
  dom.detailBack = byId('detailBack');
  dom.detailBrand = byId('detailBrand');
  dom.detailScroll = byId('detailScroll');
  dom.detailIndex = byId('detailIndex');
  dom.detailKicker = byId('detailKicker');
  dom.detailTitle = byId('detailTitle');
  dom.detailBody = byId('detailBody');
  dom.detailActions = byId('detailActions');
  dom.detailMedia = byId('detailMedia');
  dom.detailImage = byId('detailImage');
  dom.linkModal = byId('linkModal');
  dom.linkModalTitle = byId('linkModalTitle');
  dom.linkModalHint = byId('linkModalHint');
  dom.linkList = byId('linkList');
  dom.modalClose = dom.linkModal.querySelector('.modal-close');
  dom.toast = byId('toast');
  dom.currentNavLinks = [...document.querySelectorAll('[data-nav-section]')];
  dom.viewSections = new Map(
    SECTION_DEFS.map((definition) => [definition.id, document.getElementById(definition.id)]),
  );
  dom.grids = new Map(
    SECTION_DEFS.map((definition) => [definition.id, document.getElementById(`${definition.id}Grid`)]),
  );
  dom.titles = new Map(
    SECTION_DEFS.map((definition) => [definition.id, document.getElementById(`${definition.id}Title`)]),
  );
  dom.kickers = new Map(
    SECTION_DEFS.map((definition) => [definition.id, document.getElementById(`${definition.id}Kicker`)]),
  );
  dom.descriptions = new Map(
    SECTION_DEFS.map((definition) => [definition.id, document.getElementById(`${definition.id}Desc`)]),
  );
}

function bindStaticEvents() {
  dom.langSelect.addEventListener('change', async (event) => {
    const code = event.target.value;
    const ok = await setLanguage(code);
    if (!ok) {
      dom.langSelect.value = state.language?.code ?? DEFAULT_CODE;
    }
  });

  const refreshLanguagesSoon = () => {
    if (Date.now() - state.lastLanguageRefresh < 1_500) {
      return;
    }
    refreshLanguageOptions();
  };
  dom.langSelect.addEventListener('focus', refreshLanguagesSoon);
  dom.langSelect.addEventListener('pointerdown', refreshLanguagesSoon);

  dom.detailBack.addEventListener('click', () => closeDetail());
  dom.detailBrand.addEventListener('click', () => closeDetail({ restoreFocus: false }));

  for (const element of dom.linkModal.querySelectorAll('[data-close-modal]')) {
    element.addEventListener('click', () => closeLinkModal());
  }

  dom.avatar.addEventListener('error', () => {
    dom.avatar.classList.add('is-missing');
  });

  dom.detailImage.addEventListener('error', () => {
    dom.detailMedia.hidden = true;
  });

  document.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('scroll', scheduleNavUpdate, { passive: true });
  window.addEventListener('resize', scheduleNavUpdate);
  window.addEventListener('hashchange', scheduleNavUpdate);

  dom.nav.addEventListener('click', (event) => {
    const link = event.target.closest('[data-nav-section]');
    if (!link) {
      return;
    }
    setCurrentNav(link.dataset.navSection);
  });
}

/* --------------------------------------------------------------------------
   Language discovery
   -------------------------------------------------------------------------- */

async function discoverLanguages() {
  const discovered = await fetchLanguageIndex();
  state.languages = mergeLanguages(discovered);
  renderLanguageOptions();
}

async function refreshLanguageOptions() {
  if (state.languageRefreshing) {
    return;
  }
  state.languageRefreshing = true;
  try {
    const discovered = await fetchLanguageIndex();
    const merged = mergeLanguages(discovered);
    const before = state.languages.map((language) => language.code).join('|');
    const after = merged.map((language) => language.code).join('|');
    state.languages = merged;
    state.lastLanguageRefresh = Date.now();
    if (before !== after) {
      renderLanguageOptions();
    }
  } finally {
    state.languageRefreshing = false;
  }
}

async function fetchLanguageIndex() {
  // GitHub Pages 是纯静态托管，语言列表来自随站点一起部署的清单文件。
  try {
    const response = await fetch(new URL('lang/languages.json', BASE_URL), { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    const items = Array.isArray(payload) ? payload : payload?.languages;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function mergeLanguages(items) {
  const languages = [DEFAULT_LANGUAGE];
  const seen = new Set([DEFAULT_CODE]);

  for (const item of Array.isArray(items) ? items : []) {
    const code = String(item?.code ?? '').trim();
    const file = String(item?.file ?? '').replace(/\\/g, '/').split('/').pop();
    if (!code || !file || !/\.conf$/i.test(file) || seen.has(code)) {
      continue;
    }
    seen.add(code);
    const locale = String(item?.locale ?? code).trim() || code;
    const dir = String(item?.dir ?? '').toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
    const orderNumber = Number(item?.order);
    languages.push({
      code,
      name: String(item?.name ?? code).trim() || code,
      locale,
      dir,
      order: Number.isFinite(orderNumber) ? orderNumber : 999,
      file,
      path: new URL(`lang/${encodeURIComponent(file)}`, BASE_URL).href,
    });
  }

  return languages.sort((a, b) => {
    if (a.code === DEFAULT_CODE) return -1;
    if (b.code === DEFAULT_CODE) return 1;
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
}

function renderLanguageOptions() {
  const current = state.language?.code ?? dom.langSelect.value ?? DEFAULT_CODE;
  dom.langSelect.replaceChildren();

  for (const language of state.languages) {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = language.name;
    option.lang = language.locale;
    dom.langSelect.append(option);
  }

  if (state.languages.some((language) => language.code === current)) {
    dom.langSelect.value = current;
  } else {
    dom.langSelect.value = DEFAULT_CODE;
  }
}

function chooseInitialLanguage() {
  const available = new Set(state.languages.map((language) => language.code));
  let saved = '';
  try {
    saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '';
  } catch {
    // 隐私模式下 localStorage 可能被禁用。
  }
  if (saved && available.has(saved)) {
    return saved;
  }

  // 简体中文是网站的第一语言，也是首次访问的默认语言。
  return DEFAULT_CODE;
}

async function loadLanguageConf(language) {
  if (language.code === DEFAULT_CODE) {
    return parseConf('');
  }
  if (!language.path) {
    throw new Error('Missing language path');
  }
  const response = await fetch(language.path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Language HTTP ${response.status}`);
  }
  return parseConf(await response.text());
}

async function setLanguage(code, options = {}) {
  const target =
    state.languages.find((language) => language.code === code) ??
    state.languages.find((language) => language.code === DEFAULT_CODE) ??
    DEFAULT_LANGUAGE;

  let languageConf;
  try {
    languageConf = await loadLanguageConf(target);
  } catch (error) {
    console.warn(error);
    showToast(t('error.lang'));
    if (options.initial && target.code !== DEFAULT_CODE) {
      return setLanguage(DEFAULT_CODE, options);
    }
    return false;
  }

  const token = ++state.renderToken;
  state.language = target;
  state.langConf = languageConf;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, target.code);
  } catch {
    // 忽略隐私模式下的存储错误。
  }

  document.documentElement.lang = target.locale || target.code;
  document.documentElement.dir = target.dir || 'ltr';
  dom.langSelect.value = target.code;
  closeDetail({ restoreFocus: false });
  closeLinkModal({ restoreFocus: false });
  applyStaticTranslations();

  await renderPage(token);
  return true;
}

/* --------------------------------------------------------------------------
   Translation helpers
   -------------------------------------------------------------------------- */

function t(key, variables = {}) {
  const normalizedKey = String(key).toLowerCase();
  const ui = getSection(state.langConf, 'ui')?.values;
  let value = ui?.[normalizedKey];
  if (value === undefined || value === '') {
    value = ZH_CN[key] ?? ZH_CN[normalizedKey];
  }
  if (value === undefined) {
    return key;
  }
  return String(value).replace(/\{(\w+)\}/g, (_, name) => String(variables[name] ?? ''));
}

function applyStaticTranslations() {
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  }

  dom.langSelect.setAttribute('aria-label', t('language.label'));
  dom.nav.setAttribute('aria-label', t('nav.label'));
  dom.socialLinks.setAttribute('aria-label', t('social.label'));
  dom.modalClose.setAttribute('aria-label', t('action.close'));
  dom.linkModalTitle.textContent = t('link.modal.title');

  const project = state.detailProject;
  if (project) {
    dom.detailIndex.textContent = detailIndexText(project);
  }
}

function sectionUiMeta(definition) {
  const base = parseSectionMeta(state.sectionData.get(definition.id)?.conf, definition.metaSection);
  const languageMeta = getSection(state.langConf, `section.${definition.id}`)?.values ?? {};
  return {
    title: languageMeta.title || base.title || t(`section.${definition.id}.title`),
    kicker: languageMeta.kicker || base.kicker || t(`section.${definition.id}.kicker`),
    description: languageMeta.description || base.description || t(`section.${definition.id}.desc`),
    empty: languageMeta.empty || base.empty || '',
  };
}

/* --------------------------------------------------------------------------
   Content loading
   -------------------------------------------------------------------------- */

async function loadSiteData() {
  const mainPromise = fetchConf('content/mainpage/mainpage.conf');
  const sectionPromises = SECTION_DEFS.map(async (definition) => {
    try {
      const conf = await fetchConf(`${definition.folder}/${definition.file}`);
      return { definition, conf, error: false };
    } catch (error) {
      console.warn(error);
      return { definition, conf: null, error: true };
    }
  });

  const [mainResult, ...sectionResults] = await Promise.all([
    mainPromise.then((conf) => ({ conf, error: false })).catch((error) => {
      console.warn(error);
      return { conf: null, error: true };
    }),
    ...sectionPromises,
  ]);

  state.mainConf = mainResult.conf;
  if (mainResult.error) {
    state.loadError = true;
  }

  for (const result of sectionResults) {
    const { definition, conf, error } = result;
    if (error) {
      state.loadError = true;
    }
    state.sectionData.set(definition.id, {
      conf,
      error,
      projects: error
        ? []
        : definition.kind === 'bilibili'
          ? parseBilibiliItems(conf)
          : parseProjects(conf, { studioSection: definition.studioSection }),
    });
  }
}

async function fetchConf(path) {
  const response = await fetch(new URL(path, BASE_URL), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }
  return parseConf(await response.text());
}

async function fetchText(url) {
  const key = String(url);
  if (state.textCache.has(key)) {
    return state.textCache.get(key);
  }
  const promise = fetch(url, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${key}`);
      }
      return response.text();
    })
    .then((text) => text.replace(/^\uFEFF/, '').trim());
  state.textCache.set(key, promise);
  return promise;
}

async function resolveContent(folder, value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (/\.txt$/i.test(trimmed)) {
    try {
      return await fetchText(assetUrl(folder, trimmed));
    } catch (error) {
      console.warn(error);
      return null;
    }
  }
  return trimmed;
}

async function buildHeroData() {
  const base = parseMainPage(state.mainConf);
  const overrides = getSection(state.langConf, 'mainpage')?.values ?? {};

  const merged = { ...base };
  for (const key of Object.keys(merged)) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      merged[key] = overrides[key];
    }
  }

  let presentation = '';
  if (String(merged.presentation ?? '').trim()) {
    const resolved = await resolveContent('content/mainpage', merged.presentation);
    presentation = resolved === null ? '' : resolved;
  }
  if (!presentation.trim()) {
    presentation = t('hero.introFallback');
  }

  return {
    ...merged,
    nickname: String(merged.nickname ?? '').trim() || '诸葛蕴乂',
    engname: String(merged.engname ?? '').trim(),
    avatar: String(merged.avatar ?? '').trim() || 'avatar.jpg',
    presentation,
    bilibili: String(merged.bilibili ?? '').trim(),
    bicon: String(merged.bicon ?? '').trim(),
    github: String(merged.github ?? '').trim(),
    gicon: String(merged.gicon ?? '').trim(),
    email: String(merged.email ?? '').trim(),
    eicon: String(merged.eicon ?? '').trim(),
  };
}

/* --------------------------------------------------------------------------
   Page rendering
   -------------------------------------------------------------------------- */

async function renderPage(token) {
  const hero = await buildHeroData();
  if (token !== state.renderToken) {
    return;
  }
  renderHero(hero);
  await Promise.all(SECTION_DEFS.map((definition) => renderSection(definition, token)));
  if (token !== state.renderToken) {
    return;
  }
  updateMetadata(hero);
  updateNavVisibility();
  scheduleNavUpdate();
}

function renderHero(hero) {
  const avatarUrl = assetUrl('content/mainpage', hero.avatar);
  if (avatarUrl && dom.avatar.getAttribute('src') !== avatarUrl) {
    dom.avatar.classList.remove('is-missing');
    dom.avatar.setAttribute('src', avatarUrl);
  }
  dom.avatar.alt = t('hero.avatarAlt', { name: hero.nickname });
  dom.avatarFallback.textContent = Array.from(hero.nickname).slice(-1)[0] ?? '蕴';

  dom.heroName.textContent = hero.nickname;
  dom.heroEng.textContent = hero.engname;
  dom.heroIntro.innerHTML = textToHtml(hero.presentation);
  dom.socialLinks.replaceChildren();

  const emailHref = emailHrefFor(hero.email);
  const socialLinks = [
    {
      name: 'bilibili',
      label: t('social.bilibili'),
      href: hrefFor(hero.bilibili),
      icon: hero.bicon || 'bilibili.svg',
      external: true,
    },
    {
      name: 'github',
      label: t('social.github'),
      href: hrefFor(hero.github),
      icon: hero.gicon || 'github.svg',
      external: true,
    },
    {
      name: 'email',
      label: t('social.email'),
      href: emailHref,
      icon: hero.eicon || 'outlook.svg',
      email: hero.email,
      external: false,
    },
  ];

  for (const social of socialLinks) {
    if (!social.href) {
      continue;
    }
    const anchor = document.createElement('a');
    anchor.className = 'social-link';
    if (social.name === 'email') {
      anchor.classList.add('social-link--email');
    }
    anchor.href = social.href;

    if (social.external) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.setAttribute('aria-label', t('social.external', { name: social.label }));
    } else {
      anchor.setAttribute(
        'aria-label',
        t('social.emailAria', { email: social.email || social.label }),
      );
    }

    const icon = makeIcon(resolveIcon(social.icon), 'social-link__icon');
    if (icon) {
      anchor.append(icon);
    }
    const label = document.createElement('span');
    label.textContent = social.label;
    anchor.append(label);
    dom.socialLinks.append(anchor);
  }

  if (dom.emailNote) {
    dom.emailNote.hidden = !emailHref;
  }
}

function emailHrefFor(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return hrefFor(/^mailto:/i.test(trimmed) ? trimmed : `mailto:${trimmed}`);
}

async function renderSection(definition, token) {
  if (definition.kind === 'bilibili') {
    await renderBilibiliSection(definition, token);
    return;
  }

  const sectionElement = dom.viewSections.get(definition.id);
  const grid = dom.grids.get(definition.id);
  if (!sectionElement || !grid) {
    return;
  }

  const data = state.sectionData.get(definition.id);
  const meta = sectionUiMeta(definition);
  dom.titles.get(definition.id).textContent = meta.title;
  dom.kickers.get(definition.id).textContent = meta.kicker;
  dom.descriptions.get(definition.id).textContent = meta.description;

  const rawProjects = data?.projects ?? [];
  const projects = await Promise.all(
    rawProjects.map(async (project) => {
      const localized = await localizeProject(definition, project);
      localized.sectionTitle = meta.title;
      localized.sectionKicker = meta.kicker;
      return localized;
    }),
  );
  if (token !== state.renderToken) {
    return;
  }

  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'false');
  sectionElement.classList.remove('is-empty');

  const hasProjects = projects.length > 0;
  const visible = hasProjects || !definition.hideWhenEmpty;
  sectionElement.hidden = !visible;
  state.visibility.set(definition.id, visible);

  if (!visible) {
    return;
  }

  if (!hasProjects) {
    const isGameEmpty = definition.fullEmpty === true;
    if (isGameEmpty) {
      sectionElement.classList.add('is-empty');
    }
    const message = data?.error
      ? t('state.loadError')
      : meta.empty || t(definition.emptyKey);
    grid.append(createEmptyState(message, isGameEmpty));
    return;
  }

  projects.forEach((project, index) => {
    grid.append(createProjectCard(project, definition, index));
  });
}

async function renderBilibiliSection(definition, token) {
  const sectionElement = dom.viewSections.get(definition.id);
  const grid = dom.grids.get(definition.id);
  if (!sectionElement || !grid) {
    return;
  }

  const data = state.sectionData.get(definition.id);
  const meta = sectionUiMeta(definition);
  dom.titles.get(definition.id).textContent = meta.title;
  dom.kickers.get(definition.id).textContent = meta.kicker;
  dom.descriptions.get(definition.id).textContent = meta.description;

  const items = (data?.projects ?? [])
    .map((item, index) => {
      const overrides = getSection(state.langConf, `${definition.id}.${item.id}`)?.values ?? {};
      return {
        ...item,
        title: String(
          overrides.title || item.title || t('bilibili.untitled'),
        ).trim(),
        picture: String(overrides.picture || item.picture || '').trim(),
        web: String(overrides.web || item.web || '').trim(),
        _order: index,
      };
    })
    .sort((a, b) => Number(b.top) - Number(a.top) || a._order - b._order);

  if (token !== state.renderToken) {
    return;
  }

  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'false');
  sectionElement.hidden = false;
  sectionElement.classList.toggle('is-empty', items.length === 0);
  state.visibility.set(definition.id, true);

  if (items.length === 0) {
    const message = data?.error
      ? t('state.loadError')
      : meta.empty || t(definition.emptyKey);
    grid.append(createBilibiliEmpty(message));
    return;
  }

  items.forEach((item) => {
    grid.append(createBilibiliCard(item, definition));
  });
}

function createBilibiliCard(item, definition) {
  const href = hrefFor(item.web);
  const card = document.createElement(href ? 'a' : 'article');
  card.className = 'bili-card reveal';
  card.dataset.top = item.top ? '1' : '0';

  if (href) {
    card.href = href;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', t('bilibili.open', { title: item.title }));
  }

  const cover = document.createElement('div');
  cover.className = 'bili-cover';

  const fallback = document.createElement('div');
  fallback.className = 'bili-cover-empty';
  const fallbackIcon = makeIcon(resolveIcon('bilibili.svg'), 'bili-cover-empty__icon');
  if (fallbackIcon) {
    fallback.append(fallbackIcon);
  }
  cover.append(fallback);

  if (item.picture) {
    const image = document.createElement('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = t('aria.image', { title: item.title });
    image.addEventListener('error', () => {
      cover.classList.add('is-missing');
      image.remove();
    });
    image.src = assetUrl(definition.folder, item.picture);
    cover.append(image);
  } else {
    cover.classList.add('is-missing');
  }

  if (item.top) {
    const badge = document.createElement('span');
    badge.className = 'bili-top-badge';
    badge.textContent = t('bilibili.top');
    cover.append(badge);
  }

  const play = document.createElement('span');
  play.className = 'bili-play';
  play.setAttribute('aria-hidden', 'true');
  play.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="rgba(17,24,39,.55)"/><path d="M10 8.2 16 12l-6 3.8V8.2Z" fill="#fff"/></svg>';
  cover.append(play);

  const brand = document.createElement('span');
  brand.className = 'bili-cover-brand';
  brand.setAttribute('aria-hidden', 'true');
  brand.textContent = 'BILIBILI';
  cover.append(brand);

  const info = document.createElement('div');
  info.className = 'bili-info';

  const title = document.createElement('h3');
  title.className = 'bili-title';
  title.textContent = item.title;

  const meta = document.createElement('p');
  meta.className = 'bili-meta';
  const chip = document.createElement('span');
  chip.className = 'bili-chip';
  chip.textContent = t('bilibili.badge');
  const id = document.createElement('span');
  id.className = 'bili-item-id';
  id.textContent = `#${item.id}`;
  meta.append(chip, id);

  info.append(title, meta);
  card.append(cover, info);
  observeReveal(card);
  return card;
}

function createBilibiliEmpty(message) {
  const wrapper = document.createElement('div');
  wrapper.className = 'bili-empty';

  const mark = document.createElement('span');
  mark.className = 'bili-empty__mark';
  const icon = makeIcon(resolveIcon('bilibili.svg'), 'bili-empty__icon');
  if (icon) {
    mark.append(icon);
  }

  const text = document.createElement('p');
  text.textContent = message;

  wrapper.append(mark, text);
  return wrapper;
}

async function localizeProject(definition, rawProject) {
  const overrides = projectTranslation(definition, rawProject);
  const title = String(
    overrides.title ||
      rawProject.title ||
      (rawProject.kind === 'studio' ? t('studio.title') : t('project.untitled')),
  ).trim();

  const hasContentOverride = Object.prototype.hasOwnProperty.call(overrides, 'content');
  const contentSource = hasContentOverride ? overrides.content : rawProject.content;
  const resolvedContent = await resolveContent(definition.folder, contentSource);

  const links = rawProject.links
    .map((link, index) => {
      const href = hrefFor(link.url);
      return href ? { ...link, href, iconIndex: index } : null;
    })
    .filter(Boolean);

  return {
    ...rawProject,
    uid: `${definition.id}:${rawProject.id}`,
    sectionId: definition.id,
    title,
    content: resolvedContent ?? '',
    contentError: resolvedContent === null,
    links,
  };
}

function projectTranslation(definition, project) {
  const candidates =
    project.kind === 'studio'
      ? [`${definition.id}.${project.id}`, project.id]
      : [`${definition.id}.${project.id}`];

  for (const candidate of candidates) {
    const section = getSection(state.langConf, candidate);
    if (section) {
      return section.values;
    }
  }
  return {};
}

function createProjectCard(project, definition, index) {
  const article = document.createElement('article');
  article.className = 'project-card reveal';
  if (project.kind === 'studio') {
    article.classList.add('project-card--featured');
  }
  article.dataset.uid = project.uid;

  if (project.picture) {
    const media = document.createElement('div');
    media.className = 'project-media';
    const image = document.createElement('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = t('aria.image', { title: project.title });
    image.addEventListener('error', () => {
      media.hidden = true;
    });
    image.src = assetUrl(definition.folder, project.picture);
    media.append(image);
    article.append(media);
  }

  const body = document.createElement('div');
  body.className = 'project-body';

  const meta = document.createElement('p');
  meta.className = 'project-meta';
  meta.textContent =
    project.kind === 'studio'
      ? t('project.studioLabel')
      : `${t('project.label')} ${String(project.id).padStart(2, '0')}`;
  body.append(meta);

  const title = document.createElement('h3');
  title.className = 'project-title';
  title.textContent = project.title;
  body.append(title);

  const excerpt = project.contentError ? t('error.content') : excerptText(project.content);
  const excerptElement = document.createElement('p');
  excerptElement.className = 'project-excerpt';
  if (!excerpt) {
    excerptElement.classList.add('is-empty');
  } else {
    excerptElement.textContent = excerpt;
  }
  body.append(excerptElement);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const expandButton = makePillButton({
    label: t('action.expand'),
    variant: 'ghost',
    ariaLabel: t('aria.expand', { title: project.title }),
    onClick: () => openDetail(project, expandButton),
  });
  expandButton.dataset.action = 'expand';

  const jumpControl = createJumpControl(project, definition, {
    onOpenLinks: (trigger) => openLinkModal(project, trigger),
  });

  actions.append(expandButton, jumpControl);
  body.append(actions);
  article.append(body);
  observeReveal(article);
  return article;
}

function createJumpControl(project, definition, options = {}) {
  const hasLinks = project.links.length > 0;
  if (!hasLinks) {
    return makePillButton({
      label: t('action.noLink'),
      variant: 'solid',
      disabled: true,
    });
  }

  const singleLink = project.links.length === 1 ? project.links[0] : null;
  const defaultLabel =
    project.kind === 'studio' ? t('action.gameSite') : t(definition.jumpKey);
  const label = singleLink?.label || defaultLabel;
  const icon = resolveIcon(project.links[0]?.icon || project.icons?.[0] || '');

  if (project.links.length === 1) {
    return makePillButton({
      label,
      variant: 'solid',
      href: project.links[0].href,
      icon,
    });
  }

  return makePillButton({
    label,
    variant: 'solid',
    icon,
    ariaLabel: t('aria.multiple', { title: project.title }),
    onClick: () => options.onOpenLinks?.(document.activeElement),
  });
}

function createEmptyState(message, fullHeight) {
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';
  if (fullHeight) {
    wrapper.classList.add('empty-state--full');
  }

  const inner = document.createElement('div');
  inner.className = 'empty-state__inner';

  const mark = document.createElement('span');
  mark.className = 'empty-state__mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '乂';

  const text = document.createElement('p');
  text.textContent = message;

  inner.append(mark, text);
  wrapper.append(inner);
  return wrapper;
}

function makePillButton({
  label,
  variant = 'solid',
  href = '',
  icon = '',
  ariaLabel = '',
  onClick = null,
  disabled = false,
}) {
  const element = href ? document.createElement('a') : document.createElement('button');
  element.className = `pill-btn pill-btn--${variant}`;

  if (href) {
    element.href = href;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
  } else {
    element.type = 'button';
  }

  if (disabled) {
    element.disabled = true;
    element.setAttribute('aria-disabled', 'true');
  }

  if (ariaLabel) {
    element.setAttribute('aria-label', ariaLabel);
  }

  const iconElement = makeIcon(icon, 'btn-icon');
  if (iconElement) {
    iconElement.setAttribute('aria-hidden', 'true');
    element.append(iconElement);
  }

  const text = document.createElement('span');
  text.className = 'btn-label';
  text.textContent = label;
  element.append(text);

  if (onClick && !disabled) {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      onClick(element);
    });
  }

  return element;
}

function makeIcon(src, className) {
  if (!src) {
    return null;
  }
  const image = document.createElement('img');
  image.className = className;
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => {
    image.classList.add('is-missing');
  });
  image.src = src;
  return image;
}

function updateMetadata(hero) {
  document.title = t('page.title', { name: hero.nickname });
  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute('content', t('meta.description', { name: hero.nickname }));
  }
}

function updateNavVisibility() {
  for (const link of dom.currentNavLinks) {
    if (link.dataset.navSection === 'home') {
      link.hidden = false;
      continue;
    }
    link.hidden = state.visibility.get(link.dataset.navSection) !== true;
  }
}

/* --------------------------------------------------------------------------
   Detail view
   -------------------------------------------------------------------------- */

function openDetail(project, trigger) {
  closeLinkModal({ restoreFocus: false });
  state.detailProject = project;
  state.detailReturnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;

  dom.detailKicker.textContent = project.sectionKicker;
  dom.detailIndex.textContent = detailIndexText(project);
  dom.detailTitle.textContent = project.title;

  dom.detailBody.replaceChildren();
  dom.detailBody.classList.remove('is-empty');
  if (project.contentError) {
    dom.detailBody.textContent = t('error.content');
  } else if (project.content.trim()) {
    appendParagraphs(dom.detailBody, project.content);
  } else {
    dom.detailBody.classList.add('is-empty');
  }

  const definition =
    SECTION_DEFS.find((item) => item.id === project.sectionId) ?? SECTION_DEFS[0];

  dom.detailActions.replaceChildren();
  dom.detailActions.append(
    createJumpControl(project, definition, {
      onOpenLinks: (button) => openLinkModal(project, button),
    }),
  );

  if (project.picture) {
    dom.detailMedia.hidden = false;
    dom.detailImage.alt = t('aria.image', { title: project.title });
    dom.detailImage.src = assetUrl(definition.folder, project.picture);
  } else {
    dom.detailMedia.hidden = true;
    dom.detailImage.removeAttribute('src');
  }

  dom.detail.hidden = false;
  dom.detailScroll.scrollTop = 0;
  syncPageInert();
  syncBodyLock();
  dom.detailBack.focus({ preventScroll: true });
}

function detailIndexText(project) {
  const kind =
    project.kind === 'studio'
      ? t('project.studioLabel')
      : `${t('project.label')} ${String(project.id).padStart(2, '0')}`;
  return `${project.sectionTitle ?? ''} / ${kind}`;
}

function closeDetail(options = {}) {
  if (dom.detail.hidden) {
    return;
  }
  closeLinkModal({ restoreFocus: false });
  dom.detail.hidden = true;
  state.detailProject = null;
  syncPageInert();
  syncBodyLock();

  if (options.restoreFocus !== false && state.detailReturnFocus instanceof HTMLElement) {
    state.detailReturnFocus.focus({ preventScroll: true });
  }
  state.detailReturnFocus = null;
}

/* --------------------------------------------------------------------------
   Multiple links modal
   -------------------------------------------------------------------------- */

function openLinkModal(project, trigger) {
  if (project.links.length < 2) {
    return;
  }
  state.modalProject = project;
  state.modalReturnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;

  dom.linkModalTitle.textContent = t('link.modal.title');
  dom.linkModalHint.textContent = `${project.title} · ${t('link.modal.hint')}`;
  dom.linkList.replaceChildren();

  project.links.forEach((link, index) => {
    const anchor = document.createElement('a');
    anchor.className = 'link-item';
    anchor.href = link.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    const name = link.label || prettyLinkName(link.href);
    anchor.setAttribute('aria-label', t('link.open', { name }));

    const icon = resolveIcon(link.icon || project.icons?.[link.iconIndex ?? index] || '');
    if (icon) {
      const iconWrap = document.createElement('span');
      iconWrap.className = 'link-item__icon-wrap';
      const image = makeIcon(icon, 'link-item__icon');
      if (image) {
        iconWrap.append(image);
      }
      anchor.append(iconWrap);
    } else {
      anchor.classList.add('no-icon');
    }

    const copy = document.createElement('span');
    copy.className = 'link-item__copy';
    const nameElement = document.createElement('span');
    nameElement.className = 'link-item__name';
    nameElement.textContent = name;
    const hostElement = document.createElement('span');
    hostElement.className = 'link-item__host';
    hostElement.textContent = prettyLinkHost(link.href);
    copy.append(nameElement, hostElement);
    anchor.append(copy);

    const arrow = document.createElement('span');
    arrow.className = 'link-item__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML =
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 13 13 7M8 7h5v5"/></svg>';
    anchor.append(arrow);

    anchor.addEventListener('click', () => closeLinkModal({ restoreFocus: false }));
    dom.linkList.append(anchor);
  });

  dom.linkModal.hidden = false;
  syncPageInert();
  syncBodyLock();
  dom.modalClose.focus({ preventScroll: true });
}

function closeLinkModal(options = {}) {
  if (dom.linkModal.hidden) {
    return;
  }
  dom.linkModal.hidden = true;
  state.modalProject = null;
  if (!dom.detail.hidden) {
    dom.detail.inert = false;
  }
  syncPageInert();
  syncBodyLock();

  if (options.restoreFocus !== false && state.modalReturnFocus instanceof HTMLElement) {
    state.modalReturnFocus.focus({ preventScroll: true });
  }
  state.modalReturnFocus = null;
}

function syncPageInert() {
  const detailOpen = !dom.detail.hidden;
  const modalOpen = !dom.linkModal.hidden;
  dom.header.inert = detailOpen || modalOpen;
  dom.main.inert = detailOpen || modalOpen;
  dom.footer.inert = detailOpen || modalOpen;
  dom.skipLink.inert = detailOpen || modalOpen;
  dom.detail.inert = modalOpen;
}

function syncBodyLock() {
  document.body.classList.toggle('is-locked', !dom.detail.hidden || !dom.linkModal.hidden);
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape') {
    if (!dom.linkModal.hidden) {
      event.preventDefault();
      closeLinkModal();
      return;
    }
    if (!dom.detail.hidden) {
      event.preventDefault();
      closeDetail();
      return;
    }
  }

  if (event.key !== 'Tab') {
    return;
  }

  const dialog = !dom.linkModal.hidden
    ? dom.linkModal.querySelector('.modal-panel')
    : !dom.detail.hidden
      ? dom.detail
      : null;
  if (!dialog) {
    return;
  }

  const focusable = [
    ...dialog.querySelectorAll(
      'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hidden && element.getClientRects().length > 0);

  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* --------------------------------------------------------------------------
   Navigation, reveal and misc.
   -------------------------------------------------------------------------- */

function scheduleNavUpdate() {
  if (state.navFrame) {
    return;
  }
  state.navFrame = window.requestAnimationFrame(() => {
    state.navFrame = 0;
    updateCurrentNav();
  });
}

function updateCurrentNav() {
  const threshold = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 78;
  let current = 'home';

  for (const definition of SECTION_DEFS) {
    if (state.visibility.get(definition.id) !== true) {
      continue;
    }
    const element = dom.viewSections.get(definition.id);
    if (element && element.getBoundingClientRect().top <= threshold + 65) {
      current = definition.id;
    }
  }

  setCurrentNav(current);
}

function setCurrentNav(sectionId) {
  for (const link of dom.currentNavLinks) {
    link.classList.toggle('is-current', link.dataset.navSection === sectionId);
    if (link.dataset.navSection === sectionId) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

function setupRevealObserver() {
  const elements = document.querySelectorAll('.section-head');
  for (const element of elements) {
    element.classList.add('reveal');
    observeReveal(element);
  }
}

function observeReveal(element) {
  if (!('IntersectionObserver' in window)) {
    element.classList.add('is-visible');
    return;
  }
  if (!state.revealObserver) {
    state.revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            state.revealObserver.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
    );
  }
  state.revealObserver.observe(element);
}

function setCopyrightYear() {
  const year = document.getElementById('copyrightYear');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

function showToast(message) {
  if (!message) {
    return;
  }
  dom.toast.textContent = message;
  dom.toast.classList.add('is-visible');
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    dom.toast.classList.remove('is-visible');
  }, 4200);
}

/* --------------------------------------------------------------------------
   Small utilities
   -------------------------------------------------------------------------- */

function textToHtml(text) {
  return escapeHtml(String(text).trim())
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function appendParagraphs(container, text) {
  const paragraphs = String(text)
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const element = document.createElement('p');
    element.innerHTML = escapeHtml(paragraph).replace(/\n/g, '<br>');
    container.append(element);
  }
}

function excerptText(text, maxLength = 148) {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  const characters = Array.from(normalized);
  if (characters.length <= maxLength) {
    return normalized;
  }
  return `${characters.slice(0, maxLength).join('')}…`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hrefFor(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  try {
    const url = new URL(trimmed, BASE_URL);
    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
      return url.href;
    }
  } catch {
    // 非法链接直接隐藏。
  }
  return '';
}

function assetUrl(folder, value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (/^data:image\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^(https?:)?\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed, BASE_URL).href;
    } catch {
      return '';
    }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return '';
  }

  const cleanFolder = String(folder ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
  const cleanFile = trimmed
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/^\/+/, '');
  if (!cleanFile) {
    return '';
  }
  const path = cleanFolder ? `${cleanFolder}/${cleanFile}` : cleanFile;
  try {
    return new URL(path, BASE_URL).href;
  } catch {
    return '';
  }
}

function resolveIcon(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  if (/^(https?:)?\/\//i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    try {
      return new URL(trimmed, BASE_URL).href;
    } catch {
      return '';
    }
  }
  const clean = trimmed.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/^\/+/, '');
  if (!clean) {
    return '';
  }
  const path = clean.startsWith('icon/') || clean.includes('/') ? clean : `icon/${clean}`;
  return new URL(path, BASE_URL).href;
}

function prettyLinkName(href) {
  try {
    const url = new URL(href);
    if (url.protocol === 'mailto:') {
      return url.pathname;
    }
    return url.hostname.replace(/^www\./i, '') || href;
  } catch {
    return href;
  }
}

function prettyLinkHost(href) {
  try {
    const url = new URL(href);
    if (url.protocol === 'mailto:') {
      return url.href;
    }
    const path = `${url.pathname}${url.search}`.replace(/\/$/, '');
    return `${url.hostname.replace(/^www\./i, '')}${path === '/' ? '' : path}`;
  } catch {
    return href;
  }
}
