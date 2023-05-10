import {
  CommonToken,
  ParseTree,
  TerminalNode,
  ThriftData,
  ThriftParser,
  ThriftParserAll,
} from "thrift-parser-typescript";

import { PureThriftFormatter } from "./PureThriftFormatter";
import { Options } from "./Options";
import { Utility } from "./Utility";
import { Constant } from "./Constant";

export class PrettyThriftFormatter extends PureThriftFormatter {
  public content: string;
  public lines: string[];
  public data: ThriftData;
  public document: ThriftParserAll.DocumentContext;

  protected fieldPaddingForTailComment: Map<number, number> = new Map();

  protected lastTokenIndexForComment = -1;
  protected lastLineForEmptyLine = -1;

  constructor(content: string, options: Options) {
    super(options);

    this.content = content;
    this.lines = Utility.splitByLine(content);
    this.data = ThriftData.fromString(content);
    this.document = this.data.document;
  }

  public format(): string {
    if (this.options.patch) {
      this.patch();
    }

    return this.formatNode(this.document);
  }

  protected patch() {
    // this.walkNode(this.document, this.patchFieldReq);
    this.walkNode(this.document, this.patchFieldListSeparator);
    this.walkNode(this.document, this.patchRemoveLastListSeparator);
  }

  protected patchFieldReq(n: ParseTree) {
    if (!(n instanceof ThriftParserAll.FieldContext)) {
      return;
    }

    if (
      n.parent === undefined ||
      n.parent instanceof ThriftParserAll.Function_Context
    ) {
      return;
    }

    let i = 0;
    for (; i < n.childCount; i++) {
      const child = n.getChild(i);

      if (child instanceof ThriftParserAll.Field_reqContext) {
        return;
      }

      if (child instanceof ThriftParserAll.Field_typeContext) {
        break;
      }
    }

    const fake_token = new CommonToken(ThriftParser.T__20, "required");
    fake_token.line = -1;
    fake_token.charPositionInLine = -1;
    fake_token.tokenIndex = -1;
    const fake_node = new TerminalNode(fake_token);
    const fake_ctx = new ThriftParserAll.Field_reqContext(n, 0);

    fake_node.setParent(fake_ctx);

    fake_ctx.addChild(fake_node);
    fake_ctx.setParent(n);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    n.children!.splice(i, 0, fake_ctx);
  }

  protected patchFieldListSeparator(n: ParseTree) {
    if (
      !(
        n instanceof ThriftParserAll.Enum_fieldContext ||
        n instanceof ThriftParserAll.FieldContext ||
        n instanceof ThriftParserAll.Function_Context
      )
    ) {
      return;
    }

    const child = n.getChild(n.childCount - 1);
    if (child instanceof ThriftParserAll.List_separatorContext) {
      const comma = <TerminalNode>child.getChild(0);
      const token = <CommonToken>comma.symbol;
      token.text = ",";
      return;
    }

    // add last comma
    const fakeToken = new CommonToken(ThriftParser.COMMA, ",");
    fakeToken.line = -1;
    fakeToken.charPositionInLine = -1;
    fakeToken.tokenIndex = -1;
    const fakeNode = new TerminalNode(fakeToken);
    const fakeCtx = new ThriftParserAll.List_separatorContext(n, 0);

    fakeNode.setParent(fakeCtx);
    fakeCtx.addChild(fakeNode);
    fakeCtx.setParent(n);

    n.addChild(fakeCtx);
  }

  protected patchRemoveLastListSeparator(n: ParseTree) {
    const is_inline_field =
      n instanceof ThriftParserAll.FieldContext &&
      (n.parent instanceof ThriftParserAll.Function_Context ||
        n.parent instanceof ThriftParserAll.Throws_listContext);
    const is_inline_node = n instanceof ThriftParserAll.Type_annotationContext;

    if (!(is_inline_field || is_inline_node)) {
      return;
    }

    if (n.parent === undefined) {
      return;
    }

    let is_last = false;
    const brothers = n.parent.children || [];
    const brotherCount = n.parent.childCount;
    for (let i = 0; i < brotherCount; i++) {
      if (brothers[i] === n) {
        if (
          i === brotherCount - 1 ||
          n.constructor.name !== brothers[i + 1].constructor.name
        ) {
          is_last = true;
          break;
        }
      }
    }

    if (is_last) {
      const child = n.getChild(n.childCount - 1);

      if (child instanceof ThriftParserAll.List_separatorContext) {
        n.removeLastChild();
      }
    }
  }

  protected calcSubfieldsPadding(fields: ParseTree[]) {
    const fieldPaddingForTailComment: Map<number, number> = new Map();
    const lines: Array<number> = [];

    for (const field of fields) {
      let line = -1;

      for (let i = 0; i < field.childCount; i++) {
        const child = field.getChild(i);

        if (child instanceof TerminalNode) {
          line = child.symbol.line;
          break;
        }
      }

      if (line === -1) {
        continue;
      }

      lines.push(line as number);

      const fieldOut = new PureThriftFormatter(this.options).formatNode(field);
      fieldPaddingForTailComment.set(
        line,
        fieldOut.length + this.options.indent,
      );
    }

    lines.sort((a, b) => a - b);

    for (const line of lines) {
      if (fieldPaddingForTailComment.has(line - 1)) {
        fieldPaddingForTailComment.set(
          line,
          Math.max(
            fieldPaddingForTailComment.get(line - 1) as number,
            fieldPaddingForTailComment.get(line) as number,
          ),
        );
      }
    }

    lines.reverse();

    for (const line of lines) {
      if (fieldPaddingForTailComment.has(line + 1)) {
        fieldPaddingForTailComment.set(
          line,
          Math.max(
            fieldPaddingForTailComment.get(line + 1) as number,
            fieldPaddingForTailComment.get(line) as number,
          ),
        );
      }
    }

    return fieldPaddingForTailComment;
  }

  protected beforeSubfieldsHook(fields: ParseTree[]) {
    this.fieldPaddingForTailComment = this.calcSubfieldsPadding(fields);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterSubfieldsHook(_: ParseTree[]) {
    this.fieldPaddingForTailComment = new Map();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterBlockNodeHook(_: ParseTree) {
    this.addTailComment();
  }

  protected addEmptyLine(line: number) {
    if (line <= this.lastLineForEmptyLine) {
      return;
    }

    for (let i = line - 2; i >= 0; i--) {
      if (this.lines[i].trim().length == 0) {
        this.push(Constant.NEW_LINE);
      } else {
        break;
      }
    }

    this.lastLineForEmptyLine = line;
  }

  protected addLineComments(node: TerminalNode) {
    if (!this.options.comment) {
      return;
    }

    // fakeToken
    if (node.symbol.line === -1) {
      return;
    }

    const tokenIndex = node.symbol.tokenIndex;
    const comments = [];
    const tokens = this.data.tokenStream.getTokens();

    for (const token of tokens.slice(this.lastTokenIndexForComment + 1)) {
      if (token.channel != 2) {
        continue;
      }

      if (token.tokenIndex < tokenIndex) {
        comments.push(token);
      }
    }

    for (const token of comments) {
      if (token.tokenIndex > 0 && token.type == ThriftParser.ML_COMMENT) {
        this.newLine(2);
      }

      if (token.text === undefined) {
        continue;
      }

      this.addEmptyLine(token.line);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const text = token.text!;

      if (this.indentS.length > 0) {
        this.push(this.indentS);
      }

      this.push(text.trim());

      const lastLine = token.line + Utility.splitByLine(text).length - 1;
      const diffLine = node.symbol.line - lastLine;
      const isTight =
        token.type == ThriftParser.SL_COMMENT ||
        this.isEOF(node) ||
        (diffLine > 0 && diffLine <= 1);

      if (isTight) {
        this.newLine();
      } else {
        this.newLine(2);
      }
    }

    this.lastTokenIndexForComment = tokenIndex;
  }

  protected addTailComment() {
    if (!this.options.comment) {
      return;
    }

    if (this.lastTokenIndexForComment === -1) {
      return;
    }

    const tokens = this.data.tokenStream.getTokens();
    const lastToken = tokens[this.lastTokenIndexForComment];
    const comments = [];

    for (const token of tokens.slice(this.lastTokenIndexForComment + 1)) {
      if (token.line != lastToken.line) {
        break;
      }

      if (token.channel != 2) {
        continue;
      }

      comments.push(token);
    }

    if (comments.length > 0) {
      const comment = comments[0];

      // align
      if (this.fieldPaddingForTailComment.has(comment.line)) {
        const parts = Utility.splitByLine(this.out);
        const curTail = parts[parts.length - 1];
        const padding =
          (this.fieldPaddingForTailComment.get(comment.line) as number) -
          curTail.length;

        if (padding > 0) {
          this.append(" ".repeat(padding));
        }
      }

      this.append(" ");
      this.append(comment.text?.trim() ?? "");
      this.push("");

      this.lastTokenIndexForComment = comment.tokenIndex;
    }
  }

  protected TerminalNode(n: ParseTree) {
    const node = <TerminalNode>n;

    if (this.newlineCount > 0) {
      this.addTailComment();
    }

    this.addLineComments(node);
    this.addEmptyLine(node.symbol.line);

    super.TerminalNode(node);
  }
}
