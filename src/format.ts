/* eslint-disable @typescript-eslint/no-unused-vars */
import { IOptions } from "./types";

export function formatThrift(
  content: string,
  options?: IOptions,
): [string, boolean] {
  const defaultOptions: IOptions = {};
  content = deleteExtraEmptyLines(content, options || defaultOptions);
  return [content, true];
}

function deleteExtraEmptyLines(content: string, options?: IOptions) {
  const c = content.split("\n");
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
