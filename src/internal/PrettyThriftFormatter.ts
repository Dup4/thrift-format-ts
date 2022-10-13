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
  _data: ThriftData;
  _document: ThriftParserAll.DocumentContext;

  _field_padding = 0;
  _last_token_index = -1;

  constructor(data: ThriftData, options: Options) {
    super(options);

    this._data = data;
    this._document = data.document;
  }

  public format(): string {
    if (this._options.patch) {
      this.patch();
    }

    return this.formatNode(this._document);
  }

  protected patch() {
    // this.walkNode(this._document, this.patchFieldReq);
    this.walkNode(this._document, this.patchFieldListSeparator);
    // this.walkNode(this._document, this.patchRemoveLastListSeparator);
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

    const fake_token = new CommonToken(ThriftParser.COMMA, ",");
    fake_token.line = -1;
    fake_token.charPositionInLine = -1;
    fake_token.tokenIndex = -1;
    const fake_node = new TerminalNode(fake_token);
    const fake_ctx = new ThriftParserAll.List_separatorContext(n, 0);

    fake_node.setParent(fake_ctx);
    fake_ctx.addChild(fake_node);
    fake_ctx.setParent(n);

    n.addChild(fake_ctx);
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
      const fieldOut = new PureThriftFormatter(this._options).formatNode(field);
      padding = Math.max(padding, fieldOut.length);
    }

    return padding;
  }

  protected beforeSubfieldsHook(fields: ParseTree[]) {
    this._field_padding =
      this.calcSubfieldsPadding(fields) + this._options.indent;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterSubfieldsHook(_: ParseTree[]) {
    this._field_padding = 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected afterBlockNodeHook(_: ParseTree) {
    this.tailComment();
  }

  protected lineComments(node: TerminalNode) {
    if (!this._options.comment) {
      return;
    }

    // fake_token
    if (node.symbol.line === -1) {
      return;
    }

    const tokenIndex = node.symbol.tokenIndex;
    const comments = [];
    const tokens = this._data.tokenStream.getTokens();

    for (const token of tokens.slice(this._last_token_index + 1)) {
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

      if (this._indent_s.length > 0) {
        this.push(this._indent_s);
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

    this._last_token_index = tokenIndex;
  }

  protected tailComment() {
    if (!this._options.comment) {
      return;
    }

    if (this._last_token_index === -1) {
      return;
    }

    const tokens = this._data.tokenStream.getTokens();
    const last_token = tokens[this._last_token_index];
    const comments = [];

    for (const token of tokens.slice(this._last_token_index + 1)) {
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
      if (this._field_padding > 0) {
        const parts = Utility.splitByLine(this._out);
        const cur_tail = parts[parts.length - 1];
        const padding = this._field_padding - cur_tail.length;

        if (padding > 0) {
          this.append(" ".repeat(padding));
        }
      }

      this.append(" ");
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.append(comment.text!.trim());
      this.push("");
      this._last_token_index = comment.tokenIndex;
    }
  }

  TerminalNode(n: ParseTree) {
    const node = <TerminalNode>n;

    if (this._newline_count > 0) {
      this.tailComment();
    }

    this.lineComments(node);
    super.TerminalNode(node);
  }
}
