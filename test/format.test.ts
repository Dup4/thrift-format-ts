import { describe, expect, it } from "vitest";
import { formatThrift } from "@/format";

import * as fs from "fs";
import path from "path";

function getFullPath(file_name: string): string {
  return path.resolve(__dirname, "test_data", file_name).toString();
}

describe("ThriftFormatter", () => {
  it("format", () => {
    for (const file of fs.readdirSync(getFullPath(""))) {
      const content = fs.readFileSync(getFullPath(file)).toString();

      expect(formatThrift(content)).matchSnapshot();
    }
  });
});
