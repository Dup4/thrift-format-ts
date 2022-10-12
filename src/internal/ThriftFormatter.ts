import { ThriftData } from "thrift-parser-typescript";

import { IOptions } from "../types";
import { Options } from "./options";
import { PrettyThriftFormatter } from "./PrettyThriftFormatter";

export class ThriftFormatter {
  readonly NEW_LINE = "\n";
  readonly NEW_LINE_REGEX = /\r?\n/;

  options: Options;

  constructor(options?: IOptions) {
    this.options = { ...new Options(), ...options };
  }

  public format(content: string): string {
    const data = ThriftData.fromString(content);
    const fmt = new PrettyThriftFormatter(data, this.options);

    content = fmt.format();

    content += this.NEW_LINE;
    content = this.deleteExtraEmptyLines(content);

    return content;
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
}
