import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

// Executes the actual page module against a deliberately small DOM adapter.
// This verifies wiring/events, not rendered layout or a real webview.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {};
    this.listeners = {}; this.dataset = {}; this.style = {}; this.value = '';
    this.disabled = false; this.open = false;
    const classes = new Set();
    this.classList = {
      toggle(name, force) { if (force ?? !classes.has(name)) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); },
    };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler); }
  removeEventListener() {}
  getBoundingClientRect() { return {left: 0, top: 0, width: 8, height: 8}; }
  setPointerCapture() {}
  focus() {}
  select() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
  async fire(type, extra = {}) {
    const event = {type, target: this, stopPropagation() {}, preventDefault() {}, ...extra};
    await Promise.all((this.listeners[type] ?? []).map(handler => handler(event)));
  }
}
const settle = () => new Promise(resolve => setImmediate(resolve));
async function mount(native) {
  const html = readFileSync(new URL('./chord-lab.html', import.meta.url), 'utf8');
  const nodes = new Map(), ports = new Map(), calls = [], timeouts = [], navigations = [];
  for (const [, tag, id] of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"/g)) nodes.set(id, new Element(tag));
  for (const [, id, body] of html.matchAll(/<article\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)) {
    for (const [, port] of body.matchAll(/data-port="([^"]+)"/g)) ports.set(`${id}/${port}`, new Element('span'));
  }
  const windowEvents = new Element(), documentEvents = new Element();
  let running = false, armed = false;
  globalThis.document = {
    querySelector(selector) {
      const port = selector.match(/^#([\w-]+) \[data-port="([^"]+)"\]$/);
      const result = port ? ports.get(`${port[1]}/${port[2]}`) : nodes.get(selector.slice(1));
      assert.ok(result, `The page requested a real HTML element: ${selector}`);
      return result;
    },
    createElement: tag => new Element(tag),
    createElementNS: (_namespace, tag) => new Element(tag),
    addEventListener: (...args) => documentEvents.addEventListener(...args),
    hidden: false,
  };
  globalThis.window = {
    addEventListener: (...args) => windowEvents.addEventListener(...args),
    setTimeout: (fn, ms) => { timeouts.push({fn, ms}); return timeouts.length; },
    location: {assign: href => navigations.push(href)},
    ...(native ? {__TAURI__: {core: {invoke: async (name, args = {}) => {
      calls.push({name, args});
      if (name === 'audio_start') running = true;
      if (name === 'audio_stop') { running = false; armed = false; }
      if (name === 'sequence_config') armed = args.config.enabled;
      if (name === 'patch_apply') return {route_mask: 3};
      if (name === 'audio_status') return {running, sequence_enabled: armed, sequence_note: 128, sequence_ticks: 0, sample_rate: 48000, delay_frames: 64};
      return true;
    }}}} : {}),
  };
  nodes.get('patcher-link').href = 'index.html';
  await import(`./chord-lab.mjs?dom-test=${native}`);
  await settle();
  return {nodes, calls, timeouts, navigations, windowEvents, documentEvents,
    destroy() { delete globalThis.document; delete globalThis.window; }};
}

test('browser page mounts all controls, draws validated buses, and does not fake playback', async () => {
  const page = await mount(false);
  try {
    assert.equal(page.nodes.get('preview-banner').hidden, false);
    assert.equal(page.nodes.get('start-audio').disabled, true);
    assert.equal(page.nodes.get('run-transport').disabled, true);
    assert.equal(page.nodes.get('keyboard').children.length, 13);
    assert.ok(page.nodes.get('keyboard').children.every(key => key.disabled));
    assert.equal(page.nodes.get('pitch-map').children.length, 8);
    assert.equal(page.nodes.get('patch-cables').children.length, 27);
    assert.equal(page.calls.length, 0);
    assert.equal(page.timeouts[0].ms, 100);
    await page.nodes.get('preset-button').fire('click');
    assert.equal(page.nodes.get('preset-dialog').open, true);
    assert.equal(JSON.parse(page.nodes.get('preset-json').value).config.enabled, false);
  } finally { page.destroy(); }
});

test('native page wires Start, Run, pointer release, focus cleanup, and stopped backlink', async () => {
  const page = await mount(true);
  try {
    assert.equal(page.nodes.get('preview-banner').hidden, true);
    assert.ok(page.calls.some(call => call.name === 'patch_apply'), 'Startup prepares fixed routes');
    await page.nodes.get('start-audio').fire('click');
    assert.equal(page.nodes.get('run-transport').disabled, false);
    await page.nodes.get('run-transport').fire('click');
    assert.equal(page.nodes.get('run-transport').attrs['aria-pressed'], 'true');
    const key = page.nodes.get('keyboard').children[0];
    await key.fire('pointerdown', {button: 0, pointerId: 7}); await settle();
    await key.fire('pointercancel', {pointerId: 7}); await settle();
    assert.ok(page.calls.some(call => call.name === 'note_event' && call.args.device === 1 && call.args.kind === 0 && call.args.note === 60));
    assert.ok(page.calls.some(call => call.name === 'note_event' && call.args.device === 1 && call.args.kind === 1 && call.args.note === 60));
    await page.windowEvents.fire('blur');
    assert.equal(page.calls.filter(call => call.name === 'sequence_config').at(-1).args.config.enabled, false);
    await page.nodes.get('patcher-link').fire('click');
    assert.equal(page.calls.at(-2).name, 'audio_stop');
    assert.deepEqual(page.navigations, ['index.html']);
  } finally { page.destroy(); }
});
