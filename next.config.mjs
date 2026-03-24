/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // 支持通过 BASE_PATH 构建参数将应用部署在指定子路径下
  // 示例：BASE_PATH=/logs 时，应用所有路由及静态资源均以 /logs 为前缀
  // 注意：此值在构建时固化，修改后需重新构建镜像
  basePath: process.env.BASE_PATH || "",
};

export default nextConfig;
