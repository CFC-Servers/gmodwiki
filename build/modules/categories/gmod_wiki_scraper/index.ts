import * as cheerio from 'cheerio';

type Realm = 'client' | 'menu' | 'server';

interface WikiPage {
  title: string;
  content: string;
}

interface Class {
  name: string;
  parent?: string;
  description?: string;
  functions?: Array<Function>;
}

interface Panel {
  parent: string;
  description?: string;
}

interface FunctionArgument {
  name: string;
  type: string;
  default?: string;
  description?: string;
}

interface FunctionReturnValue {
  name?: string;
  type: string;
  description?: string;
}

interface FunctionSource {
  file: string;
  lineStart: number;
  lineEnd?: number;
}

interface FunctionOverload {
  name: string;
  arguments: Array<FunctionArgument>;
}

interface Function {
  name: string;
  parent: string;
  source?: FunctionSource;
  description?: string;
  realms: Array<Realm>;
  arguments?: Array<FunctionArgument>;
  overloads?: Array<FunctionOverload>;
  returnValues?: Array<FunctionReturnValue>;
}

interface Type {
  name: string;
  description?: string;
}

interface EnumField {
  name: string;
  description?: string;
  value: number;
}

interface Enum {
  name?: string;
  description?: string;
  fields: Array<EnumField>;
  realms: Array<Realm>;
}

interface StructField {
  name: string;
  type: string;
  default?: string;
  description?: string;
}

interface Struct {
  name?: string;
  description?: string;
  fields: Array<StructField>;
  realms: Array<Realm>;
}

export class WikiScraper {
  constructor() { }

  public buildClasses(wikiPages: Array<WikiPage>): Array<Class> {
    const classes = new Map<string, Class>();

    wikiPages.forEach((wikiPage) => {
      // Examples:
      // ContentIcon
      // ContentIcon:GetColor
      // achievements
      // achievements.BalloonPopped
      const className = wikiPage.title.includes(':')
        ? wikiPage.title.split(':')[0]
        : wikiPage.title.includes('.')
          ? wikiPage.title.split('.')[0]
          : wikiPage.title;

      const _class: Class = classes.get(className) ?? { name: className };

      if (this.isPanelPage(wikiPage.markup)) {
        const panel = this.parsePanelPage(wikiPage.markup);
        _class.parent = panel.parent;

        if (panel.description) {
          _class.description = panel.description;
        }
      } else if (this.isTypePage(wikiPage.markup)) {
        const type = this.parseTypePage(wikiPage.markup);

        if (type.description) {
          _class.description = type.description;
        }
      } else if (this.isFunctionPage(wikiPage.markup)) {
        const _function = this.parseFunctionPage(wikiPage.markup);

        _class.functions = _class.functions ?? [];
        _class.functions.push(_function);
      } else {
        console.error(`Unknown page type encountered on page '${wikiPage.title}'`);
      }

      classes.set(className, _class);
    });

    return Array.from(classes.values());
  }

  public parseFunctionPage(pageContent: string): Function {
    const $ = this.parseContent(pageContent);
    const name = $('function').attr().name;
    const parent = $('function').attr().parent;
    const description = $('function > description').html();
    const $sourceFile = $('function > file');
    const realmsRaw = this.trimMultiLineString($('function > realm').text());
    const realms = this.parseRealms(realmsRaw);
    const args: Array<FunctionArgument> = [];
    const overloads: Array<FunctionOverload> = [];
    const returnValues: Array<FunctionReturnValue> = [];

    const parseArg = (arg: cheerio.Element, i: number) => {
        const description = $(arg).html();

        const argument: FunctionArgument = {
          name: arg.attribs.name || `arg${i+1}`,
          type: arg.attribs.type,
        };

        if (arg.attribs.default) {
          argument.default = arg.attribs.default;
        }

        if (description && description !== '') {
          argument.description = this.trimMultiLineString(description);
        }

        return argument
    }

    const $argsBlocks = $("function > args");

    $($argsBlocks[0]).children().each((i: number, arg: cheerio.Element) => {
        args.push(parseArg(arg, i))
    })

    for (let i = 1; i < $argsBlocks.length; i++) {
        const overload: FunctionOverload = {
            name: $argsBlocks[i].attribs.name,
            arguments: []
        }

        $($argsBlocks[i]).children().each((i: number, arg: cheerio.Element) => {
            overload.arguments.push(parseArg(arg, i))
        })

        overloads.push(overload)
    }

    $('function > rets')
      .children()
      .each((i, element) => {
        const description = $(element).html();
        const name = element.attribs.name;

        const returnValue: FunctionReturnValue = {
          type: element.attribs.type,
        };

        if (name && name !== '') {
          returnValue.name = name;
        }

        if (description && description !== '') {
          returnValue.description = this.trimMultiLineString(description);
        }

        returnValues.push(returnValue);
      });

    const _function: Function = {
      name: name,
      parent: parent,
      realms: realms,
    };

    if (description && description !== '') {
      _function.description = this.trimMultiLineString(description);
    }

    if (args.length > 0) {
      _function.arguments = args;
    }

    if (overloads.length > 0) {
      _function.overloads = overloads;
    }

    if (returnValues.length > 0) {
      _function.returnValues = returnValues;
    }

    if ($sourceFile.length > 0) {
      const file = $sourceFile.text();

      const line = $sourceFile.attr().line.replace('L', '');
      const lines = line.split('-');
      const lineStart = lines[0];
      const lineEnd = lines[1];

      const source: FunctionSource = {
        file: file,
        lineStart: Number(lineStart),
      };

      if (lineEnd) {
        source.lineEnd = Number(lineEnd);
      }

      _function.source = source;
    }

    return _function;
  }

  public parsePanelPage(pageContent: string): Panel {
    const $ = this.parseContent(pageContent);
    const parent = this.trimMultiLineString($('panel > parent').text());
    const description = $('panel > description').html();

    const panel: Panel = {
      parent: parent,
    };

    if (description && description !== '') {
      panel.description = this.trimMultiLineString(description);
    }

    return panel;
  }

  public parseTypePage(pageContent: string): Type {
    const $ = this.parseContent(pageContent);
    const name = $('type').attr().name;
    const description = $('type > summary').html();

    const type: Type = {
      name: name,
    };

    if (description && description !== '') {
      type.description = this.trimMultiLineString(description);
    }

    return type;
  }

  public parseEnumPage(pageContent: string): Enum {
    const $ = this.parseContent(pageContent);
    const realmsRaw = this.trimMultiLineString($('enum > realm').text());
    const realms = this.parseRealms(realmsRaw);
    const description = $('enum > description').html();
    const enumFields: Array<EnumField> = [];

    $('enum > items')
      .children()
      .each((i, element) => {
        const name = element.attribs.key;
        const value = element.attribs.value;
        const description = $(element).html();

        const enumField: EnumField = {
          name: name,
          value: Number(value),
        };

        if (description && description !== '') {
          enumField.description = this.trimMultiLineString(description);
        }

        enumFields.push(enumField);
      });

    const _enum: Enum = {
      fields: enumFields,
      realms: realms,
    };

    if (description && description !== '') {
      _enum.description = this.trimMultiLineString(description);
    }

    return _enum;
  }

  public parseStructPage(pageContent: string): Struct {
    const $ = this.parseContent(pageContent);
    const realmsRaw = this.trimMultiLineString($('structure > realm').text());
    const realms = this.parseRealms(realmsRaw);
    const description = $('structure > description').html();
    const structFields: Array<StructField> = [];

    $('structure > fields')
      .children()
      .each((i, element) => {
        const name = element.attribs.name;
        const type = element.attribs.type;
        const description = $(element).html();

        const structField: StructField = {
          name: name,
          type: type,
        };

        if (element.attribs.default) {
          structField.default = element.attribs.default;
        }

        if (description && description !== '') {
          structField.description = this.trimMultiLineString(description);
        }

        structFields.push(structField);
      });

    const struct: Struct = {
      fields: structFields,
      realms: realms,
    };

    if (description && description !== '') {
      struct.description = this.trimMultiLineString(description);
    }

    return struct;
  }

  public parseRealms(realmsRaw: string): Array<Realm> {
    const realms = new Set<Realm>();
    const realmsRawLower = realmsRaw.toLowerCase();

    if (realmsRawLower.includes('client')) {
      realms.add('client');
    }

    if (realmsRawLower.includes('menu')) {
      realms.add('menu');
    }

    if (realmsRawLower.includes('server')) {
      realms.add('server');
    }

    if (realmsRawLower.includes('shared')) {
      realms.add('client');
      realms.add('server');
    }

    return Array.from(realms);
  }

  public isPanelPage(pageContent: string): boolean {
    const $ = this.parseContent(pageContent);

    return $('panel').length > 0;
  }

  public isFunctionPage(pageContent: string): boolean {
    const $ = this.parseContent(pageContent);

    return $('function').length > 0;
  }

  public isTypePage(pageContent: string): boolean {
    const $ = this.parseContent(pageContent);

    return $('type').length > 0;
  }

  public isEnumPage(pageContent: string): boolean {
    const $ = this.parseContent(pageContent);

    return $('enum').length > 0;
  }

  public isStructPage(pageContent: string): boolean {
    const $ = this.parseContent(pageContent);

    return $('structure').length > 0;
  }

  private parseContent(content: string): cheerio.CheerioAPI {
    return cheerio.load(content, { decodeEntities: false });
  }

  private trimMultiLineString(str: string): string {
    return str
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim();
  }
}
