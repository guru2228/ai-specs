import YAML from "yaml";
import { readFileSync } from "node:fs";
export function loadAgentSpec(source?: string) {
  const raw = source ?? process.env.AGENT_SPEC ?? readFileSync("agent.yaml","utf8");
  const crd = YAML.parse(raw);
  return crd.spec ?? crd;
}
