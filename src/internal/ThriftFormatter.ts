import { IOptions } from "../types";

import { Constant } from "./Constant";
import { Options } from "./Options";
import { PrettyThriftFormatter } from "./PrettyThriftFormatter";
import { Utility } from "./Utility";

export class ThriftFormatter {
  options: Options;

  constructor(options?: IOptions) {
    this.options = { ...new Options(), ...options };
  }

  public format(content: string): string {
    const fmt = new PrettyThriftFormatter(content, this.options);
    content = fmt.format();

    content += Constant.NEW_LINE;
    content = this.deleteExtraEmptyLines(content);

    return content;
  }

  private deleteExtraEmptyLines(content: string): string {
    const c = Utility.splitByLine(content);
    const res: string[] = [];

    for (const l of c) {
      if (l !== "") {
        res.push(l);
      } else if (res.length === 0 || res.at(-1) !== "") {
        res.push(l);
      }
    }

    return res.join(Constant.NEW_LINE);
  }
}
