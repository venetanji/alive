import {test, expect} from '@playwright/test';

// These tests use the real page and ordinary user controls. They deliberately
// provide no __TAURI__ or native-IPC replacement and make no audio claim.
async function exportPatch(page) {
  await page.locator('#export-patch').click();
  await expect(page.locator('#patch-dialog')).toBeVisible();
  const patch = JSON.parse(await page.locator('#patch-json').inputValue());
  await page.keyboard.press('Escape');
  await expect(page.locator('#patch-dialog')).not.toBeVisible();
  return patch;
}

async function importPatch(page, patch) {
  await page.locator('#open-patch').click();
  await page.locator('#patch-json').fill(JSON.stringify(patch));
  await page.locator('#import-patch').click();
}

test('honest browser preview renders all inlets above outlets', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/canvas.html');
  await expect(page.locator('#preview-banner')).toBeVisible();
  await expect(page.locator('#preview-banner')).toContainText(/native|preview/i);
  await expect(page.locator('#start-audio')).toBeDisabled();
  await expect(page.locator('#palette [data-add]')).toHaveCount(15);
  await expect(page.locator('#objects [data-node]').first()).toBeVisible();

  const geometry = await page.locator('#objects [data-node]').evaluateAll(nodes =>
    nodes.map(node => {
      const box = node.getBoundingClientRect();
      const ports = [...node.querySelectorAll('[data-direction]')].map(port => {
        const rect = port.getBoundingClientRect();
        return {
          direction: port.dataset.direction,
          index: Number(port.dataset.port),
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      });
      return {id: node.dataset.node, top: box.top, bottom: box.bottom, ports};
    }),
  );
  expect(geometry.length).toBeGreaterThan(10);
  let checkedPorts = 0;
  for (const node of geometry) {
    const midpoint = (node.top + node.bottom) / 2;
    for (const port of node.ports) {
      checkedPorts++;
      if (port.direction === 'in') expect(port.y, `node ${node.id} inlet`).toBeLessThan(midpoint);
      else expect(port.y, `node ${node.id} outlet`).toBeGreaterThan(midpoint);
    }
    for (const direction of ['in', 'out']) {
      const ports = node.ports.filter(port => port.direction === direction).sort((a, b) => a.index - b.index);
      for (let i = 1; i < ports.length; i++) expect(ports[i].x).toBeGreaterThan(ports[i - 1].x);
    }
  }
  expect(checkedPorts).toBeGreaterThan(30);
  expect(errors).toEqual([]);
  const screenshot = testInfo.outputPath('canvas-browser-preview.png');
  await page.screenshot({path: screenshot, fullPage: true});
  await testInfo.attach('Canvas browser preview, not native audio', {path: screenshot, contentType: 'image/png'});
});

test('add and wire objects, delete and undo, export, and reject invalid import', async ({page}, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/canvas.html');
  await expect(page.locator('#palette [data-add]')).toHaveCount(15);
  await importPatch(page, {version: 1, profile: 'ultra-canvas-v1', nodes: [], edges: []});
  await expect(page.locator('#patch-dialog')).not.toBeVisible();
  await expect(page.locator('#objects [data-node]')).toHaveCount(0);

  await page.locator('#palette [data-add="bang"]').click();
  await page.locator('#palette [data-add="number"]').click();
  await expect(page.locator('#objects [data-node]')).toHaveCount(2);
  const added = await exportPatch(page);
  const source = added.nodes.find(node => node.type === 'bang');
  const target = added.nodes.find(node => node.type === 'number');
  expect(source).toBeTruthy();
  expect(target).toBeTruthy();

  const header = page.locator(`#objects [data-node="${source.id}"] [data-drag]`);
  const headerBox = await header.boundingBox();
  expect(headerBox).toBeTruthy();
  // New nodes are cascaded. Use the exposed header corner rather than the
  // center, which may be covered by the next node's top inlet.
  const dragStart = {x: headerBox.x + 8, y: headerBox.y + 8};
  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await page.mouse.move(dragStart.x, dragStart.y + 180, {steps: 8});
  await page.mouse.up();
  const moved = await exportPatch(page);
  expect(moved.nodes.find(node => node.id === source.id).y).toBe(source.y + 180);

  await page.locator(`#objects [data-node="${source.id}"] [data-direction="out"][data-port="0"]`).click();
  await page.locator(`#objects [data-node="${target.id}"] [data-direction="in"][data-port="0"]`).click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(1);
  const connected = await exportPatch(page);
  expect(connected.edges).toEqual([{from: source.id, outlet: 0, to: target.id, inlet: 0}]);

  // Select the cable at an actual rendered path point, not its rectangular
  // bounding-box center (which can lie outside a curved SVG stroke).
  const cablePoint = await page.locator('#cables path[data-edge="0"]').evaluate(path => {
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM());
    return {x: screen.x, y: screen.y};
  });
  await page.mouse.click(cablePoint.x, cablePoint.y);
  await page.locator('#delete-selection').click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(0);
  await page.locator('#undo').click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(1);
  await page.locator('#redo').click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(0);
  await page.locator('#undo').click();
  await expect(page.locator('#cables path[data-edge]')).toHaveCount(1);

  const valid = await exportPatch(page);
  await importPatch(page, {...valid, edges: [{from: source.id, outlet: 99, to: target.id, inlet: 0}]});
  await expect(page.locator('#notice')).toContainText(/outlet|port|invalid/i);
  await page.keyboard.press('Escape');
  expect(await exportPatch(page)).toEqual(valid);
  await expect(page.locator('#start-audio')).toBeDisabled();
  expect(errors).toEqual([]);

  const screenshot = testInfo.outputPath('canvas-browser-edited.png');
  await page.screenshot({path: screenshot, fullPage: true});
  await testInfo.attach('Canvas editing result, not native audio', {path: screenshot, contentType: 'image/png'});
});
