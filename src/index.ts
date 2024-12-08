import { ArrayJsonSchema, JsonSchema, Schema, ArraySchema, ObjSchema } from './types';
import ts, { factory as tsFactory } from 'typescript';
import { upperFirst } from 'lodash';
// import { isPlural, plural } from 'pluralize';

interface GenerateContext {
  result: (ts.InterfaceDeclaration | ts.TypeAliasDeclaration)[];
}

export function generateTs(schema: JsonSchema | ArrayJsonSchema) {
  let result: ts.InterfaceDeclaration[] = [];
  switch (schema.type) {
    case 'object':
      generateObjSchema(schema, {result});
    case 'array':
      generateArraySchema(schema as ArrayJsonSchema, {result});
  }
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const resultFile = ts.createSourceFile(schema.name + ".ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

  if (result) {
    return result.reverse().map((rint) => printer.printNode(ts.EmitHint.Unspecified, rint, resultFile)).join('\n\n');
  }
}

function generateArraySchema(schema: ArrayJsonSchema, context: GenerateContext) {
  const itemSchema = (schema as ArrayJsonSchema).items;
  itemSchema.key = schema.name;
  const interfaceDeclaration = generateObjSchema(itemSchema as ObjSchema, context);
  const arrayType = tsFactory.createTypeAliasDeclaration(
    [tsFactory.createModifier(ts.SyntaxKind.ExportKeyword)],
    schema.name,
    undefined,
    tsFactory.createArrayTypeNode(
      tsFactory.createTypeReferenceNode(interfaceDeclaration.name)
    )
  );
  context.result.push(arrayType);
  return arrayType;
}

function generateObjSchema(schema: JsonSchema | ObjSchema, context: GenerateContext) {

  const interfaceDeclaration = tsFactory.createInterfaceDeclaration(
    [tsFactory.createModifier(ts.SyntaxKind.ExportKeyword)],
    (schema as JsonSchema).name ? (schema as JsonSchema).name : upperFirst((schema as ObjSchema).key),
    undefined,
    undefined,
    schema.properties.map((property) => {
      return generatePropertySignature(property, context);
    }).filter((property): property is ts.PropertySignature => property !== undefined)
  );

  context.result.push(interfaceDeclaration);
  return interfaceDeclaration;
}

function generatePropertySignature(schema: Schema, context: GenerateContext) {
  let typeNode: ts.KeywordTypeNode | ts.TypeReferenceNode | undefined = undefined;
  let isArray = false;
  switch (schema.type) {
    case 'number':
    case 'string':
    case 'boolean':
    case 'object':
      typeNode = generateTypeKeyword(schema, context);
      break;
    case 'array':
      const itemSchema = (schema as ArraySchema).items;
      if (itemSchema.type === 'object') itemSchema.key = schema.key;
      console.log(itemSchema);
      typeNode = generateTypeKeyword(itemSchema, context);
      isArray = true;
      break;
  }
  if (!typeNode) throw new Error(`Unknown type: ${schema.type}`);
  const unionTypes: ts.TypeNode[] = [];
  if (isArray) {
    unionTypes.push(tsFactory.createArrayTypeNode(typeNode));
  } else {
    unionTypes.push(typeNode);
  }
  if (schema.nullable) {
    unionTypes.push(tsFactory.createLiteralTypeNode(tsFactory.createNull()));
  }
  return tsFactory.createPropertySignature(
    undefined,
    schema.key ?? "",
    schema.optional ? tsFactory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
    tsFactory.createUnionTypeNode(unionTypes)
  );
  
}

function generateTypeKeyword(schema: Schema, context: GenerateContext): ts.KeywordTypeNode | ts.TypeReferenceNode {
  switch (schema.type) {
    case 'number':
      return tsFactory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'string':
      return tsFactory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case 'boolean':
      return tsFactory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    case 'object':
      const interfaceDeclaration = generateObjSchema(schema as ObjSchema, context);
      return tsFactory.createTypeReferenceNode(
        interfaceDeclaration.name
      );
  }
  throw new Error(`Unknown type: ${schema.type}`);
}

const arraySchema: ArrayJsonSchema = {
  type: 'array',
  name: 'UserList',
  items: {
    type: 'object',
    properties: [
      { key: 'id', type: 'string' },
      { key: 'name', type: 'string' }
    ]
  }
};

console.log(generateTs(arraySchema));