// 将 Next.js 静态导出产物同步到后端，供 FastAPI 以 /admin 前缀统一提供
// 导出的页面文件位于 out/admin/*（对应 /admin/* 路由），挂载前需摊平到目标目录根部
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(webRoot, 'out');
const routesDir = join(outDir, 'admin');
const targetDir = resolve(webRoot, '..', 'backend', 'admin_ui');

if (!existsSync(join(outDir, 'index.html')) || !existsSync(routesDir)) {
  console.error(`未找到静态导出产物：${outDir}，请先执行 next build`);
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });

// 公共资源（_next）、入口页 index.html 等根级文件
for (const entry of readdirSync(outDir)) {
  if (entry === 'admin') continue;
  cpSync(join(outDir, entry), join(targetDir, entry), { recursive: true });
}

// 各管理页面的路由目录，摊平为 /admin/<page>/
cpSync(routesDir, targetDir, { recursive: true });

console.log(`管理后台静态文件已同步到 ${targetDir}`);
