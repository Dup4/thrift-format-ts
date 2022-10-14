import { Constant } from "./Constant";

export class Utility {
  public static splitByLine(str: string): string[] {
    return str.split(Constant.NEW_LINE_REGEX);
  }
}
