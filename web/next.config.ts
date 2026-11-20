import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出：构建产物由 FastAPI 以 /admin 前缀统一托管，无需单独运行 Next.js 服务
  output: "export",
  // 页面路由本身已是 /admin/*，这里只给静态资源加前缀，配合后端挂载到 /admin
  assetPrefix: "/admin",
  // 导出为目录 + index.html，便于 FastAPI 的 StaticFiles 直接提供 /admin/xxx 访问
  trailingSlash: true,
};

export default nextConfig;
