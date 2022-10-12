import * as fs from "fs";
import path from "path";

export function getFullPath(fileName: string): string {
  return path.resolve(__dirname, "test_data", fileName).toString();
}

export function readFile(fileName: string): string {
  return fs.readFileSync(getFullPath(fileName)).toString();
}
