export type Schema = ObjSchema | PrimitiveSchema | ArraySchema;
export type SchemaType = 'object' | 'boolean' | 'number' | 'string' | 'array';

interface BaseSchema {
  title: string;
  description?: string;
  type: SchemaType;
}

interface ObjSchema extends BaseSchema {
  type: 'object';
  properties: {
    [key: string]: Schema;
  };
}

interface PrimitiveSchema extends BaseSchema {
  type: 'boolean' | 'number' | 'string';
}

interface ArraySchema extends BaseSchema {
  type: 'array';
  items: Schema;
}
