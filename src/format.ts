import { IOptions } from "./types";
import ThriftFormatter from "./internal/ThriftFormatter";

export function formatThrift(content: string, options?: IOptions): string {
  const t = new ThriftFormatter(options);
  return t.format(content);
}
