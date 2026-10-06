// A tiny screen router: one screen on show at a time inside #app.

const screens = new Map();
let current = null;
let root = null;

export function setRoot(node) {
  root = node;
}

/**
 * Register a screen. `render(params)` returns { node, title?, destroy?, focus? },
 * or { redirect: 'other-screen' } when it can't be shown right now.
 */
export function register(name, render) {
  screens.set(name, render);
}

export function go(name, params = {}) {
  const render = screens.get(name);
  if (!render) throw new Error(`Unknown screen: ${name}`);
  const next = render(params);
  if (next.redirect) return go(next.redirect, next.params);
  if (current && typeof current.destroy === 'function') current.destroy();
  current = next;
  current.name = name;
  root.replaceChildren(current.node);
  root.dataset.screen = name;
  document.title = current.title ? `${current.title} · Reading Game` : 'Reading Game';
  window.scrollTo(0, 0);
  // Move focus to the new screen so keyboard and screen-reader users follow along.
  const target = current.focus || current.node.querySelector('[data-autofocus]') || current.node.querySelector('h1, h2');
  if (target) {
    if (!target.hasAttribute('tabindex') && !/^(BUTTON|INPUT|SELECT|A)$/.test(target.tagName)) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  }
  return current;
}

export function currentScreen() {
  return current ? current.name : null;
}
