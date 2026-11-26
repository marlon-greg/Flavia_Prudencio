/** @type {import("next").NextConfig} */
const config = {
  serverExternalPackages: ["@electric-sql/pglite"],
  // As migrações SQL são lidas em tempo de execução; precisam ir junto no pacote do servidor (Vercel).
  outputFileTracingIncludes: { "/**": ["./drizzle/**"] },
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};
export default config;
