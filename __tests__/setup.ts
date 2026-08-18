import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const thisDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(thisDir, "../.env.local") });
