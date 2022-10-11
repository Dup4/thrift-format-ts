/* eslint-disable @typescript-eslint/no-unused-vars */
import { IOptions } from "../types";
import { ThriftData, Token } from "thrift-parser-typescript";

class Options implements IOptions {
  indent = 4;
}

class ThriftFormatter {
  readonly NEW_LINE = "\r\n";
  readonly NEW_LINE_REGEX = /\r?\n/;

  options: IOptions;

  constructor(options?: IOptions) {
    this.options = { ...new Options(), ...options };
  }

  public format(content: string): string {
    content += this.NEW_LINE;
    content = this.deleteExtraEmptyLines(content);

    const thriftData = ThriftData.fromString(content);
    const tokens = thriftData.tokenStream.getTokens();

    return this.reFormatByTokens(tokens);
  }

  private deleteExtraEmptyLines(content: string): string {
    const c = this.splitByLine(content);
    const res: string[] = [];

    for (const l of c) {
      if (l !== "") {
        res.push(l);
      } else if (res.length === 0 || res.at(-1) !== "") {
        res.push(l);
      }
    }

    return res.join(this.NEW_LINE);
  }

  private splitByLine(str: string): string[] {
    return str.split(this.NEW_LINE_REGEX);
  }

  private reFormatByTokens(tokens: Token[]): string {
    let res = "";

    for (const token of tokens) {
      // <EOF>
      if (token.type == -1) {
        continue;
      }

      res += token.text;
    }

    return res;
  }
}

export { ThriftFormatter };
export default ThriftFormatter;
