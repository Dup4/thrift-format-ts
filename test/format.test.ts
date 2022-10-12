import { describe, expect, it } from "vitest";
import { formatThrift } from "@/format";

import * as fs from "fs";

import { getReadFullPath, readFile, writeFile } from "./common";

describe("ThriftFormatter", () => {
  it("format", () => {
    for (const file of fs.readdirSync(getReadFullPath(""))) {
      const content = readFile(file);
      const formatContent = formatThrift(content);
      writeFile(file, formatContent);

      expect(formatContent).matchSnapshot();
    }
  });
});
