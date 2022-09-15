import { describe, expect, it } from "vitest";
import { formatThrift } from "@/format";

import * as fs from "fs";
import path from "path";

function getFullPath(file_name: string): string {
  return path.resolve(__dirname, "test_data", file_name).toString();
}

describe("should", () => {
  it("exported", () => {
    const thriftContent = fs.readFileSync(getFullPath("a.thrift")).toString();
    expect(formatThrift(thriftContent)).matchSnapshot();
  });
});
