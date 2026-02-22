import { config } from "./config.js";
import { buildApp } from "./app.js";

async function main() {
  const app = await buildApp();
  await app.listen({ port: config.PORT, host: "0.0.0.0" });
  console.log(`Server listening on :${config.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
