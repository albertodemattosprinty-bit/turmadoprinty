import "../src/load-env.js";

import { db } from "../src/db.js";
import { migrateProject200MarinMessagesEncryption } from "../src/project200-marin.js";

const batchSize = Math.max(1, Math.min(500, Math.trunc(Number(process.argv[2]) || 100)));
let totalScanned = 0;
let totalEncrypted = 0;

try {
  while (true) {
    const result = await migrateProject200MarinMessagesEncryption({ batchSize });
    totalScanned += result.scanned;
    totalEncrypted += result.encrypted;
    console.log(JSON.stringify({
      batchScanned: result.scanned,
      batchEncrypted: result.encrypted,
      totalScanned,
      totalEncrypted
    }));
    if (result.scanned === 0) break;
    if (result.encrypted === 0) {
      throw new Error("A migracao nao avancou; verifique registros concorrentes ou a chave configurada.");
    }
  }
} finally {
  await db?.end();
}
