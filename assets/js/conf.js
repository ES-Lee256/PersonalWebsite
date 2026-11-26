/**
 * conf.js — 一个很小的、可在浏览器与 Node.js 中共用的 .conf 解析器。
 *
 * 支持的格式：
 *   # 注释
 *   ; 注释
 *   [section]
 *   key = value
 *   x[section]   // 被禁用（禁用项不会参与页面渲染）
 *
 * 文件必须保存为 UTF-8。值会保留等号后的空格，方便写标题、介绍和网址。
 */

const SECTION_RE = /^\s*(x\s*)?\[([^\]]+)\]\s*$/i;

/**
 * @param {string} source
 * @returns {{sections: Map<string, {name: string, key: string, disabled: boolean, values: Record<string, string>, line: number}>, get: (name: string) => object|undefined}}
 */
export function parseConf(source) {
  const text = String(source ?? '').replace(/^\uFEFF/, '');
  const sections = new Map();
  let current = null;
  let activeGroup = null;

  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      const name = sectionMatch[2].trim();
      const key = name.toLowerCase();
      current = {
        name,
        key,
        disabled: Boolean(sectionMatch[1]),
        values: Object.create(null),
        // 编号键会同时跟随它前面的总键，例如 web = 3 后面的 1/2/3。
        // 这解决了 web 与 icon 都使用 1/2/3 作为子键时的冲突。
        groups: Object.create(null),
        line: index + 1,
      };
      activeGroup = null;
      // 同名段落重复出现时，后一个覆盖前一个，行为可预期。
      sections.set(key, current);
      continue;
    }

    // 第一个 [section] 之前出现的键不属于任何段落，直接忽略。
    if (!current) {
      continue;
    }

    const equalsIndex = rawLine.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = rawLine.slice(0, equalsIndex).trim().toLowerCase();
    if (!key) {
      continue;
    }

    let value = rawLine.slice(equalsIndex + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    current.values[key] = value;

    if (/^\d+$/.test(key)) {
      if (activeGroup) {
        if (!current.groups[activeGroup]) {
          current.groups[activeGroup] = Object.create(null);
        }
        current.groups[activeGroup][key] = value;
      }
    } else {
      activeGroup = key;
      if (!current.groups[key]) {
        current.groups[key] = Object.create(null);
      }
    }
  }

  return {
    sections,
    get(name) {
      return sections.get(String(name).trim().toLowerCase());
    },
  };
}

/**
 * 取得某个段落对象（含 values / disabled / line）。
 * @param {{sections: Map<string, any>}} conf
 * @param {string} sectionName
 */
export function getSection(conf, sectionName) {
  return conf?.get?.(String(sectionName).trim().toLowerCase());
}

/**
 * 取得某个段落的键值；不存在时返回 fallback。
 * @param {{sections: Map<string, any>}} conf
 * @param {string} sectionName
 * @param {string} key
 * @param {string} fallback
 */
export function getValue(conf, sectionName, key, fallback = '') {
  const section = conf?.get(sectionName);
  const value = section?.values?.[String(key).trim().toLowerCase()];
  return value === undefined ? fallback : value;
}

/**
 * 返回按出现顺序排列的段落数组。
 * @param {{sections: Map<string, any>}} conf
 */
export function listSections(conf) {
  return conf ? [...conf.sections.values()] : [];
}
