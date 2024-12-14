import ts from 'typescript';

export type Schema = ObjSchema | PrimitiveSchema | ArraySchema;
export type PrimitiveSchema = BooleanSchema | NumberSchema | StringSchema;
export type SchemaType = 'object' | 'boolean' | 'number' | 'string' | 'array';

export interface ArrayJsonSchema {
  type: 'array';
  name: string;
  description?: string;
  default?: any[];
  items: Schema;
}

export interface JsonSchema {
  type: 'object';
  name: string;
  description?: string;
  default?: any;
  properties: Schema[];
}

interface BaseSchema {
  key?: string;
  description?: string;
  default?: any;
  nullable?: boolean;
  optional?: boolean;
  type: SchemaType;
}

export interface ObjSchema extends BaseSchema {
  type: 'object';
  properties: Schema[];
}

export interface NumberSchema extends BaseSchema {
  type: 'number';
  default?: number | null;
  enum?: number[];
}

export interface BooleanSchema extends BaseSchema {
  type: 'boolean';
  default?: boolean | null;
}

export interface StringSchema extends BaseSchema {
  type: 'string';
  default?: string | null;
  enum?: string[];
}

export interface ArraySchema extends BaseSchema {
  type: 'array';
  default?: any[];
  items: Schema;
}

export interface TsOptions {
  scriptTarget?: ts.ScriptTarget;
  objectInterfaceNameHandler?: (name: string) => string;
}

export type TypeNode = ts.InterfaceDeclaration | ts.TypeAliasDeclaration;

export interface IndividualType {
  typeNode: TypeNode;
  name: ts.Identifier;
  text: string;
}

export interface GenerateResult {
  fullText: string;
  individualTypes: IndividualType[];
}