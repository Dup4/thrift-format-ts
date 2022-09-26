/* eslint-disable @typescript-eslint/no-unused-vars */
import { ThriftData } from "thrift-parser-ts";
import { PureThriftFormatter } from "thrift-fmt-ts";

import { IOptions } from "../types";

class Options implements IOptions {
  indent = 4;
  enableLabFormat = false;
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
    this.options = { ...new Options(), ...options };
  }

  public format(content: string): string {
    if (this.options.enableLabFormat === true) {
      content = this.labFormat(content);
    }

    content = this.deleteExtraEmptyLines(content);
    return content;
  }

  private labFormat(content: string): string {
    const data = ThriftData.from_string(content);
    const fmt = new PureThriftFormatter();
    const afterFormatContent = fmt.format_node(data.document);
    return afterFormatContent;
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
