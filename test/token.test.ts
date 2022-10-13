import { describe, expect, it } from "vitest";

import { ThriftData } from "thrift-parser-typescript";
import { readFile } from "./common";

describe("Thrift Parser", () => {
  it("view token", () => {
    const content = readFile("token.thrift");
    const thriftData = ThriftData.fromString(content);
    const tokens = thriftData.tokenStream.getTokens();

    for (const token of tokens) {
      expect(
        `[line=${token.line}] [type=${token.type}] [channel=${token.channel}] [tokenIndex=${token.tokenIndex}] [startIndex=${token.startIndex}] [stopIndex=${token.stopIndex}]\n${token.text}`,
      ).matchSnapshot();
    }
  });
});
