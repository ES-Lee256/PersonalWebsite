/**
 * content.js — 把 .conf 转换成页面需要的普通数据。
 * 这里不依赖 DOM，方便在 Node.js 中做单元测试。
 */

import { getValue } from './conf.js';

const NUMBERED_KEY = /^\d+$/;

function parseCount(value) {
  const trimmed = String(value ?? '').trim();
  if (!NUMBERED_KEY.test(trimmed)) {
    return 0;
  }
  const number = Number.parseInt(trimmed, 10);
  return Number.isFinite(number) && number > 0 ? Math.min(number, 100) : 0;
}

/**
 * 一行的网站写法：
 *   https://example.com                          -> { url, icon: '', label: '' }
 *   https://example.com 按钮文字                  -> { url, icon: '', label: '按钮文字' }
 *   https://example.com link.svg                  -> { url, icon: 'link.svg', label: '' }
 *   https://example.com link.svg 带空格的按钮文字   -> { url, icon: 'link.svg', label: '带空格的按钮文字' }
 *
 * 图标紧跟在链接后、自定义名称前，通过图片文件扩展名识别。
 */
export function parseLink(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(/^(\S+)(?:\s+([\s\S]+))?$/);
  if (!match) {
    return null;
  }

  const rest = (match[2] ?? '').trim();
  let icon = '';
  let label = rest;

  if (rest) {
    const iconMatch = rest.match(/^(\S+)(?:\s+([\s\S]+))?$/);
    if (iconMatch && /\.(?:svg|png|jpe?g|webp|gif|ico|avif)$/i.test(iconMatch[1])) {
      icon = iconMatch[1];
      label = (iconMatch[2] ?? '').trim();
    }
  }

  return {
    url: match[1],
    icon,
    label,
  };
}

/**
 * 读取 web / icon 这类“总键 + 编号子项”的字段。
 *
 * web = 3
 * 1 = https://a 网站甲
 * 2 = https://b
 * 3 = https://c 网站丙
 */
function readNumberedField(section, field, parser) {
  const values = section.values ?? {};
  const raw = values[field] ?? '';
  const count = parseCount(raw);

  if (count > 0) {
    const group = section.groups?.[field] ?? {};
    const items = [];
    for (let index = 1; index <= count; index += 1) {
      const value = group[String(index)] ?? '';
      const parsed = parser(value);
      items.push(parsed ?? null);
    }
    return items;
  }

  if (String(raw).trim()) {
    return [parser(raw)];
  }

  return [];
}

function readLinks(section) {
  return readNumberedField(section, 'web', parseLink).filter(Boolean);
}

function readIcons(section) {
  const raw = section.values?.icon ?? '';
  if (!String(raw).trim()) {
    return [];
  }

  const count = parseCount(raw);
  if (count > 0) {
    const group = section.groups?.icon ?? {};
    const icons = [];
    for (let index = 1; index <= count; index += 1) {
      const value = String(group[String(index)] ?? '').trim();
      icons.push(value || '');
    }
    return icons;
  }

  return [String(raw).trim()];
}

/**
 * 把项目段落转为项目对象。
 * @param {{name: string, values: Record<string, string>}} section
 * @param {{kind?: string}} options
 */
export function parseProject(section, options = {}) {
  const values = section.values ?? {};
  const id = String(section.name).trim();
  const legacyIcons = readIcons(section);
  const links = readLinks(section).map((link, index) => ({
    ...link,
    icon: link.icon || legacyIcons[index] || '',
  }));

  return {
    id,
    kind: options.kind ?? 'project',
    title: values.title ?? '',
    content: values.content ?? '',
    picture: values.picture ?? '',
    links,
    icons: links.map((link) => link.icon),
  };
}

/**
 * 读取一个项目分组内的有效项目。x[1] 已被解析器标记为 disabled，不返回。
 * @param {ReturnType<import('./conf.js').parseConf>} conf
 * @param {{studioSection?: string}} options
 */
export function parseProjects(conf, options = {}) {
  const projects = [];

  if (options.studioSection) {
    const studioSection = conf?.get(options.studioSection);
    if (studioSection && !studioSection.disabled) {
      projects.push(parseProject(studioSection, { kind: 'studio' }));
    }
  }

  const regularSections = conf
    ? [...conf.sections.values()]
        .filter((section) => !section.disabled && NUMBERED_KEY.test(section.name.trim()))
        .sort((a, b) => Number(a.name) - Number(b.name))
    : [];

  for (const section of regularSections) {
    projects.push(parseProject(section, { kind: 'project' }));
  }

  return projects;
}

/**
 * 读取 Bilibili 精选栏项目。只使用 title / picture / top 三个字段。
 * 精选栏不使用网页链接，也不支持展开详情。
 */
export function parseBilibiliItems(conf) {
  if (!conf) {
    return [];
  }

  return [...conf.sections.values()]
    .filter((section) => !section.disabled && NUMBERED_KEY.test(section.name.trim()))
    .sort((a, b) => Number(a.name) - Number(b.name))
    .map((section) => ({
      id: String(section.name).trim(),
      title: section.values.title ?? '',
      picture: section.values.picture ?? '',
      web: section.values.web ?? '',
      top: String(section.values.top ?? '').trim() === '1',
    }));
}

/**
 * 读取可选的栏目文案（例如 [git] 里的 title / description）。
 * 这些字段不是必需的，缺省时由语言包提供。
 */
export function parseSectionMeta(conf, sectionName) {
  const section = conf?.get(sectionName);
  if (!section || section.disabled) {
    return {};
  }
  return {
    title: section.values.title ?? '',
    kicker: section.values.kicker ?? '',
    description: section.values.description ?? '',
    empty: section.values.empty ?? '',
  };
}

export function parseMainPage(conf) {
  const section = conf?.get('mainpage');
  const values = section?.values ?? {};
  return {
    avatar: values.avatar ?? 'avatar.jpg',
    nickname: values.nickname ?? '',
    engname: values.engname ?? '',
    presentation: values.presentation ?? 'presentation.txt',
    bilibili: values.bilibili ?? '',
    bicon: values.bicon ?? '',
    github: values.github ?? '',
    gicon: values.gicon ?? '',
    email: values.email ?? '',
    eicon: values.eicon ?? '',
  };
}

export const contentInternals = {
  parseCount,
  readNumberedField,
};
