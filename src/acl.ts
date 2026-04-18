import { die } from "./errors.ts";

type AclConfig = {
  allow?: string[];
  deny?: string[];
};

export function checkAcl(backend: AclConfig, subcommand: string, backendName: string): void {
  const { allow, deny } = backend;

  // allowlist가 있으면 목록에 없는 subcommand 차단
  if (allow && allow.length > 0 && !allow.includes(subcommand)) {
    die(
      `"${subcommand}" is not allowed for backend "${backendName}".\nAllowed: ${allow.join(", ")}`,
    );
  }

  // denylist에 있는 subcommand 차단
  if (deny && deny.length > 0 && deny.includes(subcommand)) {
    die(`"${subcommand}" is denied for backend "${backendName}".`);
  }
}
