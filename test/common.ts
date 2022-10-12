import * as fs from "fs";
import path from "path";

export function getReadFullPath(fileName: string): string {
  return path.resolve(__dirname, "test_data", fileName).toString();
}

export function getWriteFullPath(fileName: string): string {
  return path.resolve(__dirname, "format_data", fileName).toString();
}

export function readFile(fileName: string): string {
  return fs.readFileSync(getReadFullPath(fileName)).toString();
}

export function writeFile(fileName: string, content: string) {
  const fileFields = fileName.split(".");
  const reFileName = [...fileFields.slice(0, -1), "format", "thrift"].join(".");
  fs.writeFileSync(getWriteFullPath(reFileName), content);
}
