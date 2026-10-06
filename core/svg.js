// Build SVG with DOM calls (no innerHTML), e.g. svg('circle', { cx: 5, cy: 5, r: 4 }).
const NS = 'http://www.w3.org/2000/svg';

export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  for (const c of children.flat()) if (c) node.append(c);
  return node;
}
