export type Realm = 'client' | 'menu' | 'server';

export interface PagePreviewResponse {
  status: string;
  html: string;
  title: string | null;
}

export interface PageLink {
  url: string;
  label: string;
  icon: string;
  description: string;
}

export interface PageJsonResponse {
  title: string;
  wikiName: string;
  wikiIcon: string;
  wikiUrl: string;
  address: string;
  createdTime: string;
  updatedCount: number;
  markup: string;
  html: string;
  footer: string;
  revisionId: number;
  pageLinks: Array<PageLink>;
}

export interface WikiPage {
  title: string;
  content: string;
}

export interface Class {
  name: string;
  parent?: string;
  description?: string;
  functions?: Array<Function>;
}

export interface Panel {
  parent: string;
  description?: string;
}

export interface FunctionArgument {
  name: string;
  type: string;
  default?: string;
  description?: string;
}

export interface FunctionReturnValue {
  name?: string;
  type: string;
  description?: string;
}

export interface FunctionSource {
  file: string;
  lineStart: number;
  lineEnd?: number;
}

export interface Function {
  name: string;
  parent: string;
  source?: FunctionSource;
  description?: string;
  realms: Array<Realm>;
  arguments?: Array<FunctionArgument>;
  returnValues?: Array<FunctionReturnValue>;
}

export interface Type {
  name: string;
  description?: string;
}

export interface EnumField {
  name: string;
  description?: string;
  value: number;
}

export interface Enum {
  name?: string;
  description?: string;
  fields: Array<EnumField>;
  realms: Array<Realm>;
}

export interface StructField {
  name: string;
  type: string;
  default?: string;
  description?: string;
}

export interface Struct {
  name?: string;
  description?: string;
  fields: Array<StructField>;
  realms: Array<Realm>;
}
