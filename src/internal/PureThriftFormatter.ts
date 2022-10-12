import {
  ParseTree,
  TerminalNode,
  ThriftParser,
  ThriftParserAll,
} from "thrift-parser-typescript";

import { Constant } from "./constant";
import { Options } from "./options";

type Nodes = ParseTree[];
type IsKindFunc = (node: ParseTree) => boolean;
type TightFN = (index: number, node: ParseTree) => boolean;
type NodeProcessFunc = (this: PureThriftFormatter, node: ParseTree) => void;

export class PureThriftFormatter {
  protected _options: Options;

  protected _newline_count = 0;
  protected _indent_s = "";
  protected _out = "";

  constructor(options: Options) {
    this._options = options;
  }

  get options(): Options {
    return this._options;
  }

  public formatNode(node: ParseTree): string {
    this._out = "";
    this._newline_count = 0;
    this._indent_s = "";

    this.processNode(node);
    return this._out;
  }

  static getChildren(node: ParseTree): Nodes {
    const children = [];

    for (let i = 0; i < node.childCount; i++) {
      children.push(node.getChild(i));
    }

    return children;
  }

  _push(text: string) {
    if (this._newline_count > 0) {
      this._out += Constant.NEW_LINE.repeat(this._newline_count);
      this._newline_count = 0;
    }

    this._out += text;
  }

  _append(text: string) {
    this._out += text;
  }

  _newline(repeat = 1) {
    const diff = repeat - this._newline_count;

    if (diff <= 0) {
      return;
    }

    this._newline_count += diff;
  }

  _indent(indent = "") {
    this._indent_s = indent;
  }

  static walk_node(root: ParseTree, callback: (node: ParseTree) => void) {
    const stack: ParseTree[] = [root];
    while (stack.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const node = stack.shift()!;
      callback(node);
      for (let i = 0; i < node.childCount; i++) {
        const child = node.getChild(i);
        stack.push(child);
      }
    }
  }

  static _get_repeat_children(
    nodes: ParseTree[],
    kind_fn: IsKindFunc,
  ): [ParseTree[], ParseTree[]] {
    const children = [];

    for (const [index, node] of nodes.entries()) {
      if (!kind_fn(node)) {
        return [children, nodes.slice(index)];
      }

      children.push(node);
    }

    return [children, []];
  }

  static _is_EOF(node: ParseTree): boolean {
    return (
      node instanceof TerminalNode && node.symbol.type === ThriftParser.EOF
    );
  }

  static _is_token(node: ParseTree, text: string): boolean {
    return node instanceof TerminalNode && node.symbol.text === text;
  }

  static _is_newline_node(node: ParseTree): boolean {
    return (
      node instanceof ThriftParserAll.Enum_ruleContext ||
      node instanceof ThriftParserAll.Struct_Context ||
      node instanceof ThriftParserAll.Union_Context ||
      node instanceof ThriftParserAll.Exception_Context ||
      node instanceof ThriftParserAll.ServiceContext
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  after_block_node_hook(_: ParseTree) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  before_block_node_hook(_: ParseTree) {}

  _block_nodes(nodes: ParseTree[], indent = "") {
    let last_node: ParseTree | undefined = undefined;

    // eslint-disable-next-line prefer-const
    for (let [index, node] of nodes.entries()) {
      if (
        node instanceof ThriftParserAll.HeaderContext ||
        node instanceof ThriftParserAll.DefinitionContext
      ) {
        node = node.getChild(0);
      }

      if (index > 0) {
        if (
          last_node?.constructor.name !== node.constructor.name ||
          PureThriftFormatter._is_newline_node(node)
        ) {
          this._newline(2);
        } else {
          this._newline();
        }
      }

      this._indent(indent);
      this.processNode(node);
      this.after_block_node_hook(node);
      last_node = node;
    }
  }

  _inline_nodes(nodes: ParseTree[], join = " ") {
    for (const [index, node] of nodes.entries()) {
      if (index > 0) {
        this._push(join);
      }

      this.processNode(node);
    }
  }

  static _gen_inline_Context(
    join = " ",
    tight_fn?: TightFN | undefined,
  ): NodeProcessFunc {
    return function (this: PureThriftFormatter, node: ParseTree) {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.getChild(i);

        if (i > 0 && join.length > 0) {
          if (!tight_fn || !tight_fn(i, child)) {
            this._push(join);
          }
        }

        this.processNode(child);
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  before_subfields_hook(_: ParseTree[]) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  after_subfields_hook(_: ParseTree[]) {}

  static _gen_subfields_Context(
    start: number,
    kind_fn: IsKindFunc,
  ): NodeProcessFunc {
    return function (this: PureThriftFormatter, node: ParseTree) {
      const children = PureThriftFormatter.getChildren(node);
      this._inline_nodes(children.slice(0, start));
      this._newline();

      const [fields, left] = PureThriftFormatter._get_repeat_children(
        children.slice(start),
        kind_fn,
      );

      this.before_subfields_hook(fields);
      this._block_nodes(fields, " ".repeat(this.options.indent));
      this.after_subfields_hook(fields);
      this._newline();

      this._inline_nodes(left);
    };
  }

  processNode(node: ParseTree): void {
    if (node instanceof TerminalNode) {
      this.TerminalNode(node);
    } else if (node instanceof ThriftParserAll.DocumentContext) {
      this.DocumentContext(node);
    } else if (node instanceof ThriftParserAll.HeaderContext) {
      this.HeaderContext(node);
    } else if (node instanceof ThriftParserAll.DefinitionContext) {
      this.DefinitionContext(node);
    } else if (node instanceof ThriftParserAll.Include_Context) {
      this.Include_Context(node);
    } else if (node instanceof ThriftParserAll.Namespace_Context) {
      this.Namespace_Context(node);
    } else if (node instanceof ThriftParserAll.Typedef_Context) {
      this.Typedef_Context(node);
    } else if (node instanceof ThriftParserAll.Base_typeContext) {
      this.Base_typeContext(node);
    } else if (node instanceof ThriftParserAll.Real_base_typeContext) {
      this.Real_base_typeContext(node);
    } else if (node instanceof ThriftParserAll.Const_ruleContext) {
      this.Const_ruleContext(node);
    } else if (node instanceof ThriftParserAll.Const_valueContext) {
      this.Const_valueContext(node);
    } else if (node instanceof ThriftParserAll.IntegerContext) {
      this.IntegerContext(node);
    } else if (node instanceof ThriftParserAll.Container_typeContext) {
      this.Container_typeContext(node);
    } else if (node instanceof ThriftParserAll.Set_typeContext) {
      this.Set_typeContext(node);
    } else if (node instanceof ThriftParserAll.List_typeContext) {
      this.List_typeContext(node);
    } else if (node instanceof ThriftParserAll.Cpp_typeContext) {
      this.Cpp_typeContext(node);
    } else if (node instanceof ThriftParserAll.Const_mapContext) {
      this.Const_mapContext(node);
    } else if (node instanceof ThriftParserAll.Const_map_entryContext) {
      this.Const_map_entryContext(node);
    } else if (node instanceof ThriftParserAll.List_separatorContext) {
      this.List_separatorContext(node);
    } else if (node instanceof ThriftParserAll.Field_idContext) {
      this.Field_idContext(node);
    } else if (node instanceof ThriftParserAll.Field_reqContext) {
      this.Field_reqContext(node);
    } else if (node instanceof ThriftParserAll.Field_typeContext) {
      this.Field_typeContext(node);
    } else if (node instanceof ThriftParserAll.Map_typeContext) {
      this.Map_typeContext(node);
    } else if (node instanceof ThriftParserAll.Const_listContext) {
      this.Const_listContext(node);
    } else if (node instanceof ThriftParserAll.Enum_ruleContext) {
      this.Enum_ruleContext(node);
    } else if (node instanceof ThriftParserAll.Struct_Context) {
      this.Struct_Context(node);
    } else if (node instanceof ThriftParserAll.Union_Context) {
      this.Union_Context(node);
    } else if (node instanceof ThriftParserAll.Exception_Context) {
      this.Exception_Context(node);
    } else if (node instanceof ThriftParserAll.Enum_fieldContext) {
      this.Enum_fieldContext(node);
    } else if (node instanceof ThriftParserAll.FieldContext) {
      this.FieldContext(node);
    } else if (node instanceof ThriftParserAll.Function_Context) {
      this.Function_Context(node);
    } else if (node instanceof ThriftParserAll.OnewayContext) {
      this.OnewayContext(node);
    } else if (node instanceof ThriftParserAll.Function_typeContext) {
      this.Function_typeContext(node);
    } else if (node instanceof ThriftParserAll.Throws_listContext) {
      this.Throws_listContext(node);
    } else if (node instanceof ThriftParserAll.Type_annotationsContext) {
      this.Type_annotationsContext(node);
    } else if (node instanceof ThriftParserAll.Type_annotationContext) {
      this.Type_annotationContext(node);
    } else if (node instanceof ThriftParserAll.Annotation_valueContext) {
      this.Annotation_valueContext(node);
    } else if (node instanceof ThriftParserAll.ServiceContext) {
      this.ServiceContext(node);
    } else if (node instanceof ThriftParserAll.SenumContext) {
      this.SenumContext(node);
    } else {
      console.log(`Unknown node: ${node}`);
    }
  }

  TerminalNode(n: ParseTree) {
    const node = <TerminalNode>n;

    if (PureThriftFormatter._is_EOF(node)) {
      return;
    }

    if (this._indent_s.length > 0) {
      this._push(this._indent_s);
      this._indent_s = "";
    }

    this._push(node.symbol.text ?? "");
  }

  DocumentContext: NodeProcessFunc = function (
    this: PureThriftFormatter,
    node: ParseTree,
  ) {
    const children = PureThriftFormatter.getChildren(node);
    this._block_nodes(children);
  };

  HeaderContext: NodeProcessFunc = function (
    this: PureThriftFormatter,
    node: ParseTree,
  ) {
    this.processNode(node.getChild(0));
  };

  DefinitionContext: NodeProcessFunc = function (
    this: PureThriftFormatter,
    node: ParseTree,
  ) {
    this.processNode(node.getChild(0));
  };

  Include_Context: NodeProcessFunc = PureThriftFormatter._gen_inline_Context();

  Namespace_Context: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  Typedef_Context: NodeProcessFunc = PureThriftFormatter._gen_inline_Context();

  Base_typeContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context();

  Field_typeContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  Real_base_typeContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  Const_ruleContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  Const_valueContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  IntegerContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context();

  Container_typeContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context("");

  Set_typeContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context("");

  List_typeContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context("");

  Cpp_typeContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context();

  Const_mapContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context();

  Const_map_entryContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  List_separatorContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  Field_idContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context("");

  Field_reqContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context(" ");

  Map_typeContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context(
    " ",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (i, n) => !PureThriftFormatter._is_token(n.parent!.getChild(i - 1), ","),
  );

  Const_listContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context(
    " ",
    (_, n) => n instanceof ThriftParserAll.List_separatorContext,
  );

  Enum_ruleContext: NodeProcessFunc =
    PureThriftFormatter._gen_subfields_Context(
      3,
      (n) => n instanceof ThriftParserAll.Enum_fieldContext,
    );

  Enum_fieldContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context(
    " ",
    (_, node) => node instanceof ThriftParserAll.List_separatorContext,
  );

  Struct_Context: NodeProcessFunc = PureThriftFormatter._gen_subfields_Context(
    3,
    (n) => n instanceof ThriftParserAll.FieldContext,
  );

  Union_Context: NodeProcessFunc = PureThriftFormatter._gen_subfields_Context(
    3,
    (n) => n instanceof ThriftParserAll.FieldContext,
  );

  Exception_Context: NodeProcessFunc =
    PureThriftFormatter._gen_subfields_Context(
      3,
      (n) => n instanceof ThriftParserAll.FieldContext,
    );

  FieldContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context(
    " ",
    (_, n) => n instanceof ThriftParserAll.List_separatorContext,
  );

  Function_Context: NodeProcessFunc = PureThriftFormatter._gen_inline_Context(
    " ",
    (i, n) =>
      PureThriftFormatter._is_token(n, "(") ||
      PureThriftFormatter._is_token(n, ")") ||
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      PureThriftFormatter._is_token(n.parent!.getChild(i - 1), "(") ||
      n instanceof ThriftParserAll.List_separatorContext,
  );

  OnewayContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context();

  Function_typeContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  Throws_listContext: NodeProcessFunc = PureThriftFormatter._gen_inline_Context(
    " ",
    (i, n) =>
      PureThriftFormatter._is_token(n, "(") ||
      PureThriftFormatter._is_token(n, ")") ||
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      PureThriftFormatter._is_token(n.parent!.getChild(i - 1), "(") ||
      n instanceof ThriftParserAll.List_separatorContext,
  );

  Type_annotationsContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  Type_annotationContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context(
      " ",
      (_i, n) => n instanceof ThriftParserAll.List_separatorContext,
    );

  Annotation_valueContext: NodeProcessFunc =
    PureThriftFormatter._gen_inline_Context();

  ServiceContext_Default: NodeProcessFunc =
    PureThriftFormatter._gen_subfields_Context(
      3,
      (n) => n instanceof ThriftParserAll.Function_Context,
    );

  ServiceContext_Extends: NodeProcessFunc =
    PureThriftFormatter._gen_subfields_Context(
      5,
      (n) => n instanceof ThriftParserAll.Function_Context,
    );

  ServiceContext: NodeProcessFunc = function (
    this: PureThriftFormatter,
    n: ParseTree,
  ) {
    const node = <ThriftParserAll.ServiceContext>n;
    if (PureThriftFormatter._is_token(node.getChild(2), "extends")) {
      this.ServiceContext_Extends(node);
    } else {
      this.ServiceContext_Default(node);
    }
  };

  SenumContext: NodeProcessFunc = function (
    this: PureThriftFormatter,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _n: ParseTree,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
  ) {};
}
