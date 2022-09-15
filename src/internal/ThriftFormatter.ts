/* eslint-disable @typescript-eslint/no-unused-vars */
import { IOptions } from "../types";

class Options implements IOptions {
  indent = 4;
}

class StructLine {
  number = "";
  paramOptions = "";
  paramName = "";
  defaultValue = "";
  description = "";
  annotation = "";
}

class EnumLine {
  number = "";
  paramName = "";
  hasDescription = "";
  description = "";
  annotation = "";
}

class ThriftFormatter {
  options: IOptions;

  constructor(options?: IOptions) {
    this.options = options ?? new Options();
  }

  public format(content: string): string {
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

    return res.join("\n");
  }

  private splitByLine(str: string): string[] {
    return str.split(/\r?\n/);
  }
}

export { ThriftFormatter };
export default ThriftFormatter;
