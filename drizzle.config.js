/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./utils/schema.js",
  dialect: 'postgresql',
  dbCredentials: {
      url: 'postgresql://neondb_owner:npg_0AjcUozktF5y@ep-weathered-grass-a8sw1ku6-pooler.eastus2.azure.neon.tech/AI%20Mock%20Db1?sslmode=require',
  }
};
