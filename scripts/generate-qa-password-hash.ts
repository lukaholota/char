import { randomBytes } from "node:crypto";
import { stdin as input, stderr as output } from "node:process";
import { hashQaPassword } from "../src/lib/auth/qa-credentials";

async function readPassword(): Promise<string> {
  output.write("QA password: ");

  if (!input.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of input) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString().trimEnd();
  }

  input.setRawMode(true);
  input.resume();
  return new Promise((resolve, reject) => {
    let password = "";
    const onData = (chunk: Buffer) => {
      const character = chunk.toString();
      if (character === "\r" || character === "\n") {
        input.off("data", onData);
        input.setRawMode(false);
        input.pause();
        output.write("\n");
        resolve(password);
      } else if (character === "\u0003") {
        input.off("data", onData);
        input.setRawMode(false);
        input.pause();
        reject(new Error("Password entry cancelled."));
      } else if (character === "\u007f") {
        password = password.slice(0, -1);
      } else {
        password += character;
      }
    };
    input.on("data", onData);
  });
}

async function main() {
  const password = await readPassword();

  if (!password) {
    throw new Error("A QA password is required.");
  }

  const passwordSalt = randomBytes(16).toString("base64");
  const passwordHash = hashQaPassword(password, passwordSalt).toString("base64");

  console.log(`QA_CREDENTIALS_PASSWORD_SALT=${passwordSalt}`);
  console.log(`QA_CREDENTIALS_PASSWORD_HASH=${passwordHash}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
