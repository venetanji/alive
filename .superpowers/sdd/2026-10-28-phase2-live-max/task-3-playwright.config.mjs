export default {
  testDir: '/home/venetanji/.codex/worktrees/bb01/alive/apps/ultra/tests/ci',
  testMatch: ['canvas-documents.spec.mjs'], workers: 1, retries: 0, timeout: 30000,
  reporter: 'list',
  use: {browserName:'chromium',baseURL:'http://127.0.0.1:4174',viewport:{width:1600,height:1400},launchOptions:{chromiumSandbox:true},screenshot:'off',trace:'off'},
  webServer:{command:'python3 -m http.server 4174 --bind 127.0.0.1',cwd:'/home/venetanji/.codex/worktrees/bb01/alive/apps/ultra/ui',url:'http://127.0.0.1:4174/canvas.html',timeout:15000,reuseExistingServer:false},
};
