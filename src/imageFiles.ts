import * as path from "node:path";
import { collectFiles } from "./fileCollector";

export function collectImageFiles(dir: string, extensions: Set<string>): string[] {
  return collectFiles(dir).filter((file) => extensions.has(path.extname(file).toLowerCase()));
}
