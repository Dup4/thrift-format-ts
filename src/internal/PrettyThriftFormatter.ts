import {
  CommonToken,
  ParseTree,
  TerminalNode,
  ThriftData,
  ThriftParser,
  ThriftParserAll,
} from "thrift-parser-typescript";

import { PureThriftFormatter } from "./PureThriftFormatter";
import { Options } from "./options";
import { Utility } from "./utility";

export class PrettyThriftFormatter extends PureThriftFormatter {
  public data: ThriftData;
  public document: ThriftParserAll.DocumentContext;

  protected fieldPadding = 0;
  protected lastTokenIndex = -1;

  constructor(data: ThriftData, options: Options) {
    super(options);
    this.data = data;
    this.document = data.document;
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
    if (fields.length === 0) {
      return 0;
    }

    let padding = 0;
    for (const field of fields) {
      const fieldOut = new PureThriftFormatter(this.options).formatNode(field);
      padding = Math.max(padding, fieldOut.length);
    }

    return padding;
  }

  protected beforeSubfieldsHook(fields: ParseTree[]) {
    this.fieldPadding = this.calcSubfieldsPadding(fields) + this.options.indent;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterSubfieldsHook(_: ParseTree[]) {
    this.fieldPadding = 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterBlockNodeHook(_: ParseTree) {
    this.tailComment();
  }

  protected lineComments(node: TerminalNode) {
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

    for (const token of tokens.slice(this.lastTokenIndex + 1)) {
      if (token.channel != 2) {
        continue;
      }

      if (token.tokenIndex < tokenIndex) {
        comments.push(token);
      }
    }

    for (const token of comments) {
      if (token.tokenIndex > 0 && token.type == ThriftParser.ML_COMMENT) {
        this.newline(2);
      }

      if (token.text === undefined) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const text = token.text!;

      if (this.indentS.length > 0) {
        this.push(this.indentS);
      }

      this.push(text.trim());

      const last_line = token.line + Utility.splitByLine(text).length - 1;
      const is_tight =
        token.type == ThriftParser.SL_COMMENT ||
        this.isEOF(node) ||
        (0 < node.symbol.line - last_line && node.symbol.line - last_line <= 1);

      if (is_tight) {
        this.newline();
      } else {
        this.newline(2);
      }
    }

    this.lastTokenIndex = tokenIndex;
  }

  protected tailComment() {
    if (!this.options.comment) {
      return;
    }

    if (this.lastTokenIndex === -1) {
      return;
    }

    const tokens = this.data.tokenStream.getTokens();
    const last_token = tokens[this.lastTokenIndex];
    const comments = [];

    for (const token of tokens.slice(this.lastTokenIndex + 1)) {
      if (token.line != last_token.line) {
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
      if (this.fieldPadding > 0) {
        const parts = Utility.splitByLine(this.out);
        const cur_tail = parts[parts.length - 1];
        const padding = this.fieldPadding - cur_tail.length;

        if (padding > 0) {
          this.append(" ".repeat(padding));
        }
      }

      this.append(" ");
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.append(comment.text!.trim());
      this.push("");
      this.lastTokenIndex = comment.tokenIndex;
    }
  }

  protected TerminalNode(n: ParseTree) {
    const node = <TerminalNode>n;

    if (this.newlineCount > 0) {
      this.tailComment();
    }

    this.lineComments(node);
    super.TerminalNode(node);
  }
}
