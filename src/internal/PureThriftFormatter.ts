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
  public options: Options;

  protected newlineCount = 0;
  protected indentS = "";
  protected out = "";

  constructor(options: Options) {
    this.options = options;
  }

  public formatNode(node: ParseTree): string {
    this.out = "";
    this.newlineCount = 0;
    this.indentS = "";

    this.processNode(node);
    return this.out;
  }

  protected getChildren(node: ParseTree): Nodes {
    const children = [];

    for (let i = 0; i < node.childCount; i++) {
      children.push(node.getChild(i));
    }

    return children;
  }

  protected push(text: string) {
    if (this.newlineCount > 0) {
      this.out += Constant.NEW_LINE.repeat(this.newlineCount);
      this.newlineCount = 0;
    }

    this.out += text;
  }

  protected append(text: string) {
    this.out += text;
  }

  protected newline(repeat = 1) {
    const diff = repeat - this.newlineCount;

    if (diff <= 0) {
      return;
    }

    this.newlineCount += diff;
  }

  protected indent(indent = "") {
    this.indentS = indent;
  }

  protected walkNode(root: ParseTree, callback: (node: ParseTree) => void) {
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

  protected getRepeatChildren(
    nodes: ParseTree[],
    kindFn: IsKindFunc,
  ): [ParseTree[], ParseTree[]] {
    const children = [];

    for (const [index, node] of nodes.entries()) {
      if (!kindFn(node)) {
        return [children, nodes.slice(index)];
      }

      children.push(node);
    }

    return [children, []];
  }

  protected isEOF(node: ParseTree): boolean {
    return (
      node instanceof TerminalNode && node.symbol.type === ThriftParser.EOF
    );
  }

  protected isToken(node: ParseTree, text: string): boolean {
    return node instanceof TerminalNode && node.symbol.text === text;
  }

  protected isNewlineNode(node: ParseTree): boolean {
    return (
      node instanceof ThriftParserAll.Enum_ruleContext ||
      node instanceof ThriftParserAll.Struct_Context ||
      node instanceof ThriftParserAll.Union_Context ||
      node instanceof ThriftParserAll.Exception_Context ||
      node instanceof ThriftParserAll.ServiceContext
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  protected beforeBlockNodeHook(_: ParseTree) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  protected afterBlockNodeHook(_: ParseTree) {}

  protected blockNodes(nodes: ParseTree[], indent = "") {
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
          this.isNewlineNode(node)
        ) {
          this.newline(2);
        } else {
          this.newline();
        }
      }

      this.indent(indent);
      this.processNode(node);
      this.afterBlockNodeHook(node);
      last_node = node;
    }
  }

  protected inlineNodes(nodes: ParseTree[], join = " ") {
    for (const [index, node] of nodes.entries()) {
      if (index > 0) {
        this.push(join);
      }

      this.processNode(node);
    }
  }

  protected genInlineContext(
    join = " ",
    tightFn?: TightFN,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    debugSign?: string,
  ): NodeProcessFunc {
    return function (this: PureThriftFormatter, node: ParseTree) {
      for (let i = 0; i < node.childCount; i++) {
        const child = node.getChild(i);

        if (i > 0 && join.length > 0) {
          if (!tightFn || !tightFn(i, child)) {
            this.push(join);
          }
        }

        this.processNode(child);
      }
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  protected beforeSubfieldsHook(_: ParseTree[]) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  protected afterSubfieldsHook(_: ParseTree[]) {}

  protected genSubfieldsContext(
    start: number,
    kind_fn: IsKindFunc,
  ): NodeProcessFunc {
    return function (this: PureThriftFormatter, node: ParseTree) {
      const children = this.getChildren(node);
      this.inlineNodes(children.slice(0, start));
      this.newline();

      const [fields, left] = this.getRepeatChildren(
        children.slice(start),
        kind_fn,
      );

      this.beforeSubfieldsHook(fields);
      this.blockNodes(fields, " ".repeat(this.options.indent));
      this.afterSubfieldsHook(fields);
      this.newline();

      this.inlineNodes(left);
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

    if (this.isEOF(node)) {
      return;
    }

    if (this.indentS.length > 0) {
      this.push(this.indentS);
      this.indentS = "";
    }

    this.push(node.symbol.text ?? "");
  }

  DocumentContext: NodeProcessFunc = function (
    this: PureThriftFormatter,
    node: ParseTree,
  ) {
    const children = this.getChildren(node);
    this.blockNodes(children);
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

  Include_Context: NodeProcessFunc = this.genInlineContext();
  Namespace_Context: NodeProcessFunc = this.genInlineContext();
  Typedef_Context: NodeProcessFunc = this.genInlineContext();
  Base_typeContext: NodeProcessFunc = this.genInlineContext();
  Field_typeContext: NodeProcessFunc = this.genInlineContext();
  Real_base_typeContext: NodeProcessFunc = this.genInlineContext();
  Const_ruleContext: NodeProcessFunc = this.genInlineContext();
  Const_valueContext: NodeProcessFunc = this.genInlineContext();
  IntegerContext: NodeProcessFunc = this.genInlineContext();
  Container_typeContext: NodeProcessFunc = this.genInlineContext("");
  Set_typeContext: NodeProcessFunc = this.genInlineContext("");
  List_typeContext: NodeProcessFunc = this.genInlineContext("");
  Cpp_typeContext: NodeProcessFunc = this.genInlineContext();
  Const_mapContext: NodeProcessFunc = this.genInlineContext();
  Const_map_entryContext: NodeProcessFunc = this.genInlineContext();
  List_separatorContext: NodeProcessFunc = this.genInlineContext();
  Field_idContext: NodeProcessFunc = this.genInlineContext("");
  Field_reqContext: NodeProcessFunc = this.genInlineContext(" ");

  Map_typeContext: NodeProcessFunc = this.genInlineContext(
    " ",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (i, n) => !this.isToken(n.parent!.getChild(i - 1), ","),
  );

  Const_listContext: NodeProcessFunc = this.genInlineContext(
    " ",
    (i, n) =>
      !(
        n.parent?.getChild(i - 1) instanceof
        ThriftParserAll.List_separatorContext
      ),
  );

  Enum_ruleContext: NodeProcessFunc = this.genSubfieldsContext(
    3,
    (n) => n instanceof ThriftParserAll.Enum_fieldContext,
  );

  Enum_fieldContext: NodeProcessFunc = this.genInlineContext(
    " ",
    (_, node) => node instanceof ThriftParserAll.List_separatorContext,
  );

  Struct_Context: NodeProcessFunc = this.genSubfieldsContext(
    3,
    (n) => n instanceof ThriftParserAll.FieldContext,
  );

  Union_Context: NodeProcessFunc = this.genSubfieldsContext(
    3,
    (n) => n instanceof ThriftParserAll.FieldContext,
  );

  Exception_Context: NodeProcessFunc = this.genSubfieldsContext(
    3,
    (n) => n instanceof ThriftParserAll.FieldContext,
  );

  FieldContext: NodeProcessFunc = this.genInlineContext(
    " ",
    (_, n) => n instanceof ThriftParserAll.List_separatorContext,
  );

  Function_Context: NodeProcessFunc = this.genInlineContext(
    " ",
    (i, n) =>
      this.isToken(n, "(") ||
      this.isToken(n, ")") ||
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.isToken(n.parent!.getChild(i - 1), "(") ||
      n instanceof ThriftParserAll.List_separatorContext,
  );

  OnewayContext: NodeProcessFunc = this.genInlineContext();

  Function_typeContext: NodeProcessFunc = this.genInlineContext();

  Throws_listContext: NodeProcessFunc = this.genInlineContext(
    " ",
    (i, n) =>
      this.isToken(n, "(") ||
      this.isToken(n, ")") ||
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.isToken(n.parent!.getChild(i - 1), "(") ||
      n instanceof ThriftParserAll.List_separatorContext,
  );

  Type_annotationsContext: NodeProcessFunc = this.genInlineContext(
    " ",
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (i, n) => !n.parent!.getChild(i - 1).text.endsWith(","),
  );

  Type_annotationContext: NodeProcessFunc = this.genInlineContext(
    " ",
    (_i, n) => n instanceof ThriftParserAll.List_separatorContext,
  );

  Annotation_valueContext: NodeProcessFunc = this.genInlineContext();

  ServiceContext_Default: NodeProcessFunc = this.genSubfieldsContext(
    3,
    (n) => n instanceof ThriftParserAll.Function_Context,
  );

  ServiceContext_Extends: NodeProcessFunc = this.genSubfieldsContext(
    5,
    (n) => n instanceof ThriftParserAll.Function_Context,
  );

  ServiceContext: NodeProcessFunc = function (
    this: PureThriftFormatter,
    n: ParseTree,
  ) {
    const node = <ThriftParserAll.ServiceContext>n;
    if (this.isToken(node.getChild(2), "extends")) {
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
