import { config } from "./config.js";
import { buildApp } from "./app.js";

async function main() {
  const app = await buildApp();
  const port = Number(process.env.PORT) || config.PORT || 8080;
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Server listening on :${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
