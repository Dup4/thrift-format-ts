import { describe, expect, it } from "vitest";
import { formatThrift } from "@/format";

describe("should", () => {
  it("exported", () => {
    const thriftContent = `
struct A {
    1: required string a,
}



`;
    expect(formatThrift(thriftContent)).matchSnapshot();
  });
});
