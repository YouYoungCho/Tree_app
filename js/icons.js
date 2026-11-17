/*
 * 선택지 그림(SVG) 생성기 — 외부 이미지 없이 오프라인에서도 보이도록 코드로 그립니다.
 */
const Icons = (() => {
  const S = 'var(--ink)';
  const LEAF = 'var(--leaf)';
  const LEAF_D = 'var(--leaf-dark)';

  const svg = (body, vb = '0 0 60 60') =>
    `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

  /* ---------- 잎 윤곽 생성 ----------
   * profile(t): t=0(잎밑)~1(잎끝) 에서 0~1 의 상대 폭
   * edge(t): 가장자리 톱니 등 추가 변형(바깥쪽 +) */
  function leafOutline({ profile, len = 40, w = 16, cx = 30, base = 50, edge = () => 0, n = 120, angle = 0 }) {
    const right = [];
    const left = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = Math.max(0, profile(t));
      const d = p > 0.02 ? w * p + edge(t) * Math.min(1, p * 3) : w * p;
      const y = base - t * len;
      right.push([cx + d, y]);
      left.push([cx - d, y]);
    }
    const pts = right.concat(left.reverse());
    let path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + 'Z';
    return `<g transform="rotate(${angle} ${cx} ${base})"><path d="${path}" fill="${LEAF}" stroke="${LEAF_D}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<line x1="${cx}" y1="${base + 7}" x2="${cx}" y2="${base - len * 0.92}" stroke="${LEAF_D}" stroke-width="1"/></g>`;
  }

  const P = {
    oval: (t) => Math.sin(Math.PI * t),
    ovate: (t) => Math.sin(Math.PI * Math.pow(t, 0.7)),
    obovate: (t) => Math.sin(Math.PI * Math.pow(t, 1.6)),
    round: (t) => Math.pow(Math.sin(Math.PI * t), 0.55),
    lanceolate: (t) => Math.sin(Math.PI * Math.pow(t, 0.6)),
    linear: (t) => Math.pow(Math.sin(Math.PI * t), 0.15),
  };
  const frac = (x) => x - Math.floor(x);

  const EDGE = {
    entire: () => 0,
    serrate: (t) => 2.2 * frac(t * 14),
    double: (t) => 3 * frac(t * 7) + 1.2 * frac(t * 28),
    wavy: (t) => 2.6 * Math.abs(Math.sin(Math.PI * t * 7)),
    spiny: (t) => (frac(t * 10) > 0.8 ? 4.5 * (frac(t * 10) - 0.8) / 0.2 : 0),
  };

  function shape(v) {
    switch (v) {
      case 'round': return svg(leafOutline({ profile: P.round, len: 36, w: 18, base: 48 }));
      case 'oval': return svg(leafOutline({ profile: P.oval, w: 14 }));
      case 'ovate': return svg(leafOutline({ profile: P.ovate, w: 15 }));
      case 'obovate': return svg(leafOutline({ profile: P.obovate, w: 15 }));
      case 'lanceolate': return svg(leafOutline({ profile: P.lanceolate, w: 7, len: 44, base: 52 }));
      case 'linear': return svg(leafOutline({ profile: P.linear, w: 3, len: 48, base: 54 }));
      case 'heart':
        return svg(`<path d="M30 52 C 10 44, 6 30, 12 22 C 18 14, 27 17, 30 24 C 33 17, 42 14, 48 22 C 54 30, 50 44, 30 52Z" transform="rotate(180 30 34)" fill="${LEAF}" stroke="${LEAF_D}" stroke-width="1.2"/><line x1="30" y1="22" x2="30" y2="58" stroke="${LEAF_D}"/>`);
      case 'arrow':
        return svg(`<path d="M30 6 C 36 16, 40 28, 40 38 L 52 46 L 38 44 C 35 45, 32 46, 30 46 C 28 46, 25 45, 22 44 L 8 46 L 20 38 C 20 28, 24 16, 30 6Z" fill="${LEAF}" stroke="${LEAF_D}" stroke-width="1.2" stroke-linejoin="round"/><line x1="30" y1="46" x2="30" y2="58" stroke="${LEAF_D}"/>`);
      case 'lobed':
        return svg(`<path d="M30 50 L 14 46 L 4 30 L 17 34 L 13 14 L 24 26 L 30 4 L 36 26 L 47 14 L 43 34 L 56 30 L 46 46 Z" fill="${LEAF}" stroke="${LEAF_D}" stroke-width="1.2" stroke-linejoin="round"/><path d="M30 58 V 50 M30 50 L30 8 M30 50 L15 17 M30 50 L45 17 M30 50 L7 31 M30 50 L53 31" stroke="${LEAF_D}" stroke-width="0.9" fill="none"/>`);
      case 'pinnatifid':
        return svg(leafOutline({ profile: (t) => Math.sin(Math.PI * Math.pow(t, 0.8)) * (0.25 + 0.75 * Math.abs(Math.sin(Math.PI * t * 4.5))), w: 18, len: 44, base: 52 }));
      case 'fan':
        return svg(`<path d="M30 40 L 8 18 C 14 8, 26 6, 29 10 L 30 20 L 31 10 C 34 6, 46 8, 52 18 Z" fill="${LEAF}" stroke="${LEAF_D}" stroke-width="1.2" stroke-linejoin="round"/><path d="M30 40 V 56 M30 40 L14 16 M30 40 L21 11 M30 40 L39 11 M30 40 L46 16" stroke="${LEAF_D}" stroke-width="0.8"/>`);
      default: return '';
    }
  }

  function margin(v) {
    // 잎 일부를 크게 확대해 가장자리만 보여줌
    // 확대 그림용 가장자리 (톱니 개수를 줄여 크게 보이게)
    const BIG = {
      entire: () => 0,
      serrate: (t) => 6 * frac(t * 7),
      double: (t) => 8 * frac(t * 4) + 3 * frac(t * 16),
      wavy: (t) => 6 * Math.abs(Math.sin(Math.PI * t * 4)),
      spiny: (t) => (frac(t * 5) > 0.82 ? 13 * (frac(t * 5) - 0.82) / 0.18 : 0),
    };
    const e = BIG[v] || BIG.entire;
    let d = 'M4 56';
    const n = 200;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = 4 + t * 52;
      const base = 34 - Math.sin(Math.PI * t) * 6;
      const y = base - e(t);
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    d += ' L56 56 Z';
    return svg(`<path d="${d}" fill="${LEAF}" stroke="${LEAF_D}" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 50 Q 30 44 56 50" stroke="${LEAF_D}" fill="none" stroke-width="0.8"/>`);
  }

  function smallLeaf(x, y, ang, len = 12, w = 4.5) {
    return `<ellipse cx="${x}" cy="${y - len / 2}" rx="${w}" ry="${len / 2}" transform="rotate(${ang} ${x} ${y})" fill="${LEAF}" stroke="${LEAF_D}" stroke-width="1"/>`;
  }

  function compound(v) {
    const stem = (y1 = 58, y2 = 8) => `<line x1="30" y1="${y1}" x2="30" y2="${y2}" stroke="${LEAF_D}" stroke-width="1.6"/>`;
    switch (v) {
      case 'simple': return svg(leafOutline({ profile: P.oval, w: 13, len: 40 }));
      case 'tri':
        return svg(stem(58, 30) + smallLeaf(30, 30, 0, 22, 7) + smallLeaf(30, 30, -62, 18, 6) + smallLeaf(30, 30, 62, 18, 6));
      case 'pinnate': {
        let b = stem(58, 8);
        [44, 34, 24, 14].forEach((y) => { b += smallLeaf(30, y, -75, 13, 4) + smallLeaf(30, y, 75, 13, 4); });
        b += smallLeaf(30, 10, 0, 12, 4);
        return svg(b);
      }
      case 'palmate': {
        let b = stem(58, 32);
        [-80, -40, 0, 40, 80].forEach((a) => { b += smallLeaf(30, 32, a, 20, 5); });
        return svg(b);
      }
      default: return '';
    }
  }

  function arrange(v) {
    const stem = `<line x1="30" y1="58" x2="30" y2="4" stroke="${LEAF_D}" stroke-width="2"/>`;
    let b = '';
    switch (v) {
      case 'alt':
        b = stem + smallLeaf(30, 48, 60) + smallLeaf(30, 36, -60) + smallLeaf(30, 24, 60) + smallLeaf(30, 12, -60);
        break;
      case 'opp':
        b = stem;
        [46, 30, 14].forEach((y) => { b += smallLeaf(30, y, 65) + smallLeaf(30, y, -65); });
        break;
      case 'whorl':
        b = stem;
        [42, 18].forEach((y) => { [-75, -25, 25, 75].forEach((a) => { b += smallLeaf(30, y, a, 13, 3.5); }); });
        break;
      case 'basal':
        b = `<line x1="4" y1="54" x2="56" y2="54" stroke="${S}" stroke-width="1" opacity=".4"/>`;
        [-70, -40, -12, 12, 40, 70].forEach((a) => { b += smallLeaf(30, 52, a, 22, 5); });
        break;
      case 'cluster':
        b = `<path d="M6 54 L54 14" stroke="${LEAF_D}" stroke-width="2"/><rect x="26" y="30" width="6" height="6" rx="2" fill="${LEAF_D}"/>`;
        for (let a = -70; a <= 70; a += 14) b += `<line x1="29" y1="31" x2="${29 + 22 * Math.sin(a * Math.PI / 180)}" y2="${31 - 22 * Math.cos(a * Math.PI / 180)}" stroke="${LEAF_D}" stroke-width="1.6" stroke-linecap="round"/>`;
        break;
    }
    return svg(b);
  }

  function needleBundle(n, cx = 30, by = 56, spread = 40) {
    let b = `<line x1="${cx - 16}" y1="${by + 2}" x2="${cx + 4}" y2="${by - 2}" stroke="#8a5a32" stroke-width="3" stroke-linecap="round"/>`;
    if (n === 1) {
      for (let i = 0; i < 6; i++) {
        const x = cx - 14 + i * 6;
        b += `<line x1="${x}" y1="${by + 1 - i * 1.1}" x2="${x + 4}" y2="${by - 22 - i}" stroke="${LEAF_D}" stroke-width="2" stroke-linecap="round"/>`;
      }
      return b;
    }
    b += `<rect x="${cx - 3}" y="${by - 10}" width="6" height="9" rx="2" fill="#a8835a"/>`;
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
      const r = a * Math.PI / 180;
      b += `<line x1="${cx}" y1="${by - 9}" x2="${(cx + 46 * Math.sin(r)).toFixed(1)}" y2="${(by - 9 - 46 * Math.cos(r)).toFixed(1)}" stroke="${LEAF_D}" stroke-width="2" stroke-linecap="round"/>`;
    }
    return b;
  }

  function needle(v) {
    if (v === '1') return svg(needleBundle(1));
    if (v === 'many') return svg(needleBundle(14, 30, 56, 110));
    const n = +v;
    return svg(needleBundle(n, 30, 56, n === 2 ? 14 : n === 3 ? 26 : 40));
  }

  function leafType(v) {
    if (v === 'needle') return needle('2');
    if (v === 'scale') {
      let b = `<line x1="30" y1="58" x2="30" y2="4" stroke="${LEAF_D}" stroke-width="2"/>`;
      for (let y = 10; y < 56; y += 7) {
        b += `<path d="M30 ${y} q -8 4 -10 10 q 6 -2 10 -4 q 4 2 10 4 q -2 -6 -10 -10z" fill="${LEAF}" stroke="${LEAF_D}" stroke-width="1"/>`;
      }
      for (let y = 18; y < 52; y += 14) {
        b += `<line x1="30" y1="${y}" x2="14" y2="${y - 10}" stroke="${LEAF_D}" stroke-width="2"/><line x1="30" y1="${y}" x2="46" y2="${y - 10}" stroke="${LEAF_D}" stroke-width="2"/>`;
      }
      return svg(b);
    }
    return svg(leafOutline({ profile: P.ovate, w: 16, len: 42, base: 52 }));
  }

  function type(v) {
    if (v === 'tree') return habit('tree');
    // 풀: 줄기 + 꽃
    return svg(`<line x1="30" y1="58" x2="30" y2="20" stroke="${LEAF_D}" stroke-width="2"/>` +
      smallLeaf(30, 46, -55, 14, 5) + smallLeaf(30, 38, 55, 14, 5) + flowerRadial(5, 30, 16, 10, '#f4a3c0') +
      `<line x1="6" y1="58" x2="54" y2="58" stroke="${S}" opacity=".35"/>`);
  }

  function habit(v) {
    const ground = `<line x1="4" y1="57" x2="56" y2="57" stroke="${S}" stroke-width="1" opacity=".35"/>`;
    if (v === 'tree') {
      return svg(ground + `<rect x="27" y="30" width="6" height="27" fill="#8a5a32"/><circle cx="30" cy="20" r="15" fill="${LEAF}" stroke="${LEAF_D}"/><circle cx="20" cy="28" r="9" fill="${LEAF}" stroke="${LEAF_D}"/><circle cx="40" cy="28" r="9" fill="${LEAF}" stroke="${LEAF_D}"/>`);
    }
    if (v === 'shrub') {
      return svg(ground + `<path d="M30 57 L22 40 M30 57 L30 38 M30 57 L38 40 M30 57 L14 44 M30 57 L46 44" stroke="#8a5a32" stroke-width="2"/>` +
        `<ellipse cx="30" cy="40" rx="24" ry="13" fill="${LEAF}" stroke="${LEAF_D}" opacity=".95"/>`);
    }
    // vine
    let b = ground + `<rect x="27" y="4" width="6" height="53" fill="#c8b59a"/>`;
    b += `<path d="M24 57 C 40 50, 40 46, 24 40 C 8 34, 40 30, 36 24 C 32 18, 20 16, 30 8" stroke="${LEAF_D}" stroke-width="2" fill="none"/>`;
    b += smallLeaf(38, 47, 70, 10, 4) + smallLeaf(18, 36, -70, 10, 4) + smallLeaf(37, 24, 70, 10, 4) + smallLeaf(24, 14, -60, 9, 3.5);
    return svg(b);
  }

  function flowerRadial(n, cx, cy, r, color, center = '#f5d02c') {
    let b = '';
    for (let i = 0; i < n; i++) {
      const a = (360 / n) * i;
      b += `<ellipse cx="${cx}" cy="${cy - r * 0.55}" rx="${Math.min(r * 0.42, (Math.PI * r) / n * 0.9)}" ry="${r * 0.55}" transform="rotate(${a} ${cx} ${cy})" fill="${color}" stroke="${S}" stroke-opacity=".35" stroke-width=".8"/>`;
    }
    return b + `<circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="${center}"/>`;
  }

  const PET = '#f2b6cf';
  function fform(v) {
    switch (v) {
      case '3': case '4': case '5': case '6':
        return svg(flowerRadial(+v, 30, 30, 24, PET));
      case 'many': return svg(flowerRadial(12, 30, 30, 24, PET));
      case 'composite': {
        let b = '';
        for (let i = 0; i < 22; i++) b += `<ellipse cx="30" cy="12" rx="2.4" ry="10" transform="rotate(${i * 360 / 22} 30 30)" fill="#fff" stroke="${S}" stroke-opacity=".35" stroke-width=".7"/>`;
        b += `<circle cx="30" cy="30" r="8" fill="#f5c518" stroke="#c99a00"/>`;
        for (let i = 0; i < 10; i++) b += `<circle cx="${30 + 4.5 * Math.cos(i)}" cy="${30 + 4.5 * Math.sin(i * 1.7)}" r=".9" fill="#a87b00"/>`;
        return svg(b);
      }
      case 'tube':
        return svg(`<path d="M30 6 V 14" stroke="${LEAF_D}" stroke-width="2"/><path d="M22 14 C 20 30, 14 44, 10 52 L 18 48 L 24 54 L 30 48 L 36 54 L 42 48 L 50 52 C 46 44, 40 30, 38 14 Z" fill="${PET}" stroke="${S}" stroke-opacity=".4" stroke-linejoin="round"/>`);
      case 'pea':
        return svg(`<path d="M30 8 C 48 6, 54 24, 44 32 C 40 26, 34 24, 30 26 Z" fill="${PET}" stroke="${S}" stroke-opacity=".4"/><path d="M30 26 C 22 28, 18 36, 22 46 C 30 52, 42 48, 44 38 C 40 32, 36 28, 30 26Z" fill="#e48fb4" stroke="${S}" stroke-opacity=".4"/><path d="M24 30 C 12 30, 10 42, 18 46" fill="${PET}" stroke="${S}" stroke-opacity=".4"/><path d="M30 26 L 14 56" stroke="${LEAF_D}" stroke-width="2"/>`);
      case 'cluster': {
        let b = `<path d="M30 58 V 30 M30 30 L16 14 M30 30 L44 14 M30 30 L30 10 M30 30 L20 22 M30 30 L40 22" stroke="${LEAF_D}" stroke-width="1.2"/>`;
        [[16, 14], [44, 14], [30, 10], [20, 22], [40, 22], [24, 12], [36, 12], [12, 22], [48, 22]].forEach(([x, y]) => { b += flowerRadial(5, x, y, 5, PET); });
        return svg(b);
      }
      case 'catkin': {
        let b = `<path d="M8 8 Q 30 4 52 10" stroke="#8a5a32" stroke-width="2" fill="none"/>`;
        [[18, 6], [38, 8]].forEach(([x, y]) => {
          for (let i = 0; i < 9; i++) b += `<circle cx="${x + Math.sin(i * 0.5) * 2}" cy="${y + 4 + i * 5}" r="3" fill="#b7c96a" stroke="${LEAF_D}" stroke-width=".6"/>`;
        });
        return svg(b);
      }
      case 'odd':
        return svg(`<path d="M10 30 C 16 18, 34 16, 44 24 C 50 22, 56 18, 56 12 C 58 22, 54 28, 46 32 C 36 40, 18 42, 10 30Z" fill="#a98be0" stroke="${S}" stroke-opacity=".4"/><path d="M10 30 C 6 34, 8 38, 14 36" fill="#a98be0" stroke="${S}" stroke-opacity=".4"/><path d="M30 38 V 58" stroke="${LEAF_D}" stroke-width="2"/>`);
      default: return '';
    }
  }

  function color(opt) {
    return svg(`<circle cx="30" cy="30" r="22" fill="${opt.color}" stroke="${S}" stroke-opacity=".35" stroke-width="1.5"/>`);
  }

  function season(v) {
    const m = { earlyspring: '🌱', latespring: '🌸', summer: '☀️', autumn: '🍁', winter: '❄️' };
    return `<span class="emoji">${m[v] || ''}</span>`;
  }

  function evergreen(v) {
    if (v === 'ever') {
      return svg(`<path d="M30 6 L 46 30 H 38 L 50 48 H 10 L 22 30 H 14 Z" fill="${LEAF_D}"/><rect x="27" y="48" width="6" height="8" fill="#8a5a32"/>` +
        `<circle cx="16" cy="12" r="1.6" fill="#9ec3e6"/><circle cx="46" cy="10" r="1.6" fill="#9ec3e6"/><circle cx="52" cy="22" r="1.4" fill="#9ec3e6"/>`);
    }
    return svg(`<path d="M30 56 V 30 M30 40 L 20 28 M30 36 L 42 24 M30 30 L 26 16 M30 30 L 36 14" stroke="#8a5a32" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="14" cy="52" rx="5" ry="2.5" fill="#d98c2b"/><ellipse cx="46" cy="54" rx="5" ry="2.5" fill="#c4572c"/><ellipse cx="44" cy="40" rx="3" ry="5" transform="rotate(30 44 40)" fill="#e0a53a"/>`);
  }

  function fruit(v) {
    switch (v) {
      case 'cone': {
        let b = '';
        for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) {
          b += `<ellipse cx="${22 + c * 8 + (r % 2) * 4 - 2}" cy="${14 + r * 7}" rx="5" ry="4" fill="#a0703f" stroke="#5e3d1e" stroke-width=".8"/>`;
        }
        return svg(b);
      }
      case 'acorn':
        return svg(`<ellipse cx="30" cy="36" rx="11" ry="15" fill="#b9853f" stroke="#6b4519"/><path d="M17 28 C 18 16, 42 16, 43 28 Z" fill="#7a5530" stroke="#4d3417"/><path d="M30 18 V 10" stroke="#4d3417" stroke-width="2"/>`);
      case 'chestnut': {
        let b = `<circle cx="30" cy="32" r="16" fill="#9cb84a" stroke="#5f7a24"/>`;
        for (let i = 0; i < 28; i++) {
          const a = (i * 360 / 28) * Math.PI / 180;
          b += `<line x1="${30 + 14 * Math.cos(a)}" y1="${32 + 14 * Math.sin(a)}" x2="${30 + 24 * Math.cos(a)}" y2="${32 + 24 * Math.sin(a)}" stroke="#7e9a35" stroke-width="1.2"/>`;
        }
        return svg(b);
      }
      case 'samara':
        return svg(`<circle cx="30" cy="38" r="4" fill="#9a6b3a"/><path d="M28 38 C 18 34, 6 22, 8 14 C 14 12, 24 22, 30 34Z" fill="#d7b46a" stroke="#8b6a2c"/><path d="M32 38 C 42 34, 54 22, 52 14 C 46 12, 36 22, 30 34Z" fill="#d7b46a" stroke="#8b6a2c"/>`);
      case 'pod':
        return svg(`<path d="M8 20 C 20 22, 40 34, 54 50 C 40 44, 18 34, 8 26 Z" fill="#8f7a45" stroke="#5c4d26"/><circle cx="20" cy="26" r="2" fill="#5c4d26"/><circle cx="30" cy="32" r="2" fill="#5c4d26"/><circle cx="40" cy="39" r="2" fill="#5c4d26"/>`);
      case 'red': return svg(berries('#d8323b'));
      case 'black': return svg(berries('#33284a'));
      case 'yellow': return svg(berries('#e8c14a'));
      case 'other':
        return svg(`<path d="M30 8 V 20" stroke="#6b5233" stroke-width="2"/><ellipse cx="30" cy="36" rx="12" ry="16" fill="#b7a07a" stroke="#6b5233"/><path d="M30 20 V 52" stroke="#6b5233" stroke-width="1"/>`);
      default: return '';
    }
  }
  function berries(c) {
    return `<path d="M30 6 Q 28 18 20 28 M30 6 Q 32 20 40 30 M30 6 V 32" stroke="#6b5233" stroke-width="1.5" fill="none"/>` +
      `<circle cx="20" cy="34" r="7" fill="${c}"/><circle cx="40" cy="36" r="7" fill="${c}"/><circle cx="30" cy="40" r="7" fill="${c}"/><circle cx="18" cy="32" r="1.6" fill="#fff" opacity=".6"/><circle cx="28" cy="38" r="1.6" fill="#fff" opacity=".6"/>`;
  }

  function bark(v) {
    const frame = (fill, inner) => svg(`<rect x="12" y="2" width="36" height="56" rx="3" fill="${fill}" stroke="#4a3520" stroke-width="1"/>${inner}`);
    switch (v) {
      case 'white':
        return frame('#f2efe6', `<path d="M14 14 h10 M30 22 h14 M16 32 h8 M28 40 h16 M14 50 h12" stroke="#333" stroke-width="2" stroke-linecap="round"/><path d="M38 12 q 6 2 8 8 l -6 -2 z" fill="#d9cbb0"/>`);
      case 'reddish':
        return frame('#b5562d', `<path d="M20 4 v 52 M30 4 v 52 M40 4 v 52" stroke="#8a3a1a" stroke-width="1.4" opacity=".6"/>`);
      case 'smooth':
        return frame('#9a9a92', `<path d="M16 20 h6 M34 32 h8 M20 46 h6" stroke="#77776f" stroke-width="1.2"/>`);
      case 'furrowed':
        return frame('#6b5235', `<path d="M18 2 L 20 16 L 17 30 L 21 44 L 18 58 M30 2 L 28 14 L 32 28 L 29 42 L 31 58 M42 2 L 40 18 L 43 32 L 40 46 L 42 58 M18 22 L 30 20 M30 36 L 42 38 M20 46 L 30 50" stroke="#2e2112" stroke-width="2" fill="none"/>`);
      case 'cork':
        return frame('#a98b62', `<path d="M14 10 C 22 6, 24 16, 32 12 C 40 8, 44 14, 46 12 M14 26 C 20 22, 28 30, 34 26 C 40 22, 44 28, 46 26 M14 42 C 22 38, 26 46, 34 42 C 40 38, 44 44, 46 42" stroke="#6b5233" stroke-width="3" fill="none"/>`);
      case 'peeling':
        return frame('#a4a07e', `<path d="M14 6 h14 v14 h-14z" fill="#d6cfa6"/><path d="M30 22 h16 v12 h-16z" fill="#7d8a5a"/><path d="M14 36 h12 v16 h-12z" fill="#c9b38a"/><path d="M32 44 h12 v10 h-12z" fill="#e2dcc2"/>`);
      default: return '';
    }
  }

  function thorn(v) {
    let b = `<path d="M6 34 L 54 26" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/>`;
    if (v === 'yes') {
      [[14, 32], [26, 30], [38, 28], [48, 27]].forEach(([x, y], i) => {
        const up = i % 2 === 0;
        b += `<path d="M${x - 3} ${y} L ${x + 3} ${y + (up ? -12 : 12)} L ${x + 5} ${y}" fill="#5a3f26"/>`;
      });
    }
    return svg(b);
  }

  /* 질문 id → 선택지 그림 */
  function forOption(qid, opt) {
    switch (qid) {
      case 'type': return type(opt.v);
      case 'leaf': return leafType(opt.v);
      case 'needle': return needle(opt.v);
      case 'compound': return compound(opt.v);
      case 'shape': return shape(opt.v);
      case 'margin': return margin(opt.v);
      case 'habit': return habit(opt.v);
      case 'arrange': return arrange(opt.v);
      case 'evergreen': return evergreen(opt.v);
      case 'fcolor': return color(opt);
      case 'fform': return fform(opt.v);
      case 'season': return season(opt.v);
      case 'fruit': return fruit(opt.v);
      case 'bark': return bark(opt.v);
      case 'thorn': return thorn(opt.v);
      default: return '';
    }
  }

  /* 식물 대표 그림: 잎 모양 + 꽃 색 등으로 간단히 */
  function plantBadge(sp) {
    const t = sp.t;
    const first = (x) => (Array.isArray(x) ? x[0] : x);
    if (t.leaf === 'needle' || (Array.isArray(t.leaf) && t.leaf[0] === 'needle')) return needle(first(t.needle) || '1');
    if (first(t.leaf) === 'scale') return leafType('scale');
    if (t.type === 'herb' && t.fcolor) {
      const c = QUESTIONS.find((q) => q.id === 'fcolor').options.find((o) => o.v === first(t.fcolor));
      const form = first(t.fform);
      const n = /^\d$/.test(form) ? +form : form === 'many' ? 12 : 5;
      return svg(flowerRadial(n, 30, 30, 24, c ? c.color : PET));
    }
    if (t.compound && first(t.compound) !== 'simple') return compound(first(t.compound));
    if (t.shape) return shape(first(t.shape));
    return leafType('broad');
  }

  return { forOption, plantBadge };
})();
