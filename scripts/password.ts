import { hashPassword } from "../src/lib/security";
import { createInterface } from "node:readline";
const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question(
  "Neues Passwort (mind. 12 Zeichen; Eingabe sichtbar, kein Shell-Verlauf): ",
  (password) => {
    if (password.length < 12 || password.length > 256) {
      console.error("Bitte 12–256 Zeichen verwenden.");
      process.exitCode = 1;
    } else console.log(`PASSWORD_HASH=${hashPassword(password)}`);
    rl.close();
  },
);
