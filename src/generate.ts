import { ArrayJsonSchema, JsonSchema, Schema, ArraySchema, ObjSchema, GenerateResult, TypeNode, StringSchema, NumberSchema } from './types';
import ts, { factory as tsFactory } from 'typescript';
import { groupBy, upperFirst } from 'lodash';
import { isPlural, singular } from 'pluralize';

interface GenerateContext {
  result: TypeNode[];
}

export function generateTypes(schema: JsonSchema | ArrayJsonSchema): GenerateResult {
  let result: TypeNode[] = [];
  switch (schema.type) {
    case 'object':
      generateObjSchema(schema, {result});
    case 'array':
      generateArraySchema(schema as ArrayJsonSchema, {result});
  }
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const resultFile = ts.createSourceFile(schema.name + ".ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

  ({result} = checkDuplicates({result}));
  const individualTypes = result.reverse().map((rint) => {
    return {
      typeNode: rint,
      name: rint.name,
      text: printer.printNode(ts.EmitHint.Unspecified, rint, resultFile)
    }
  });
  const fullText = individualTypes.map((type) => type.text).join('\n\n');
  return { fullText, individualTypes };
}

function generateArraySchema(schema: ArrayJsonSchema, context: GenerateContext) {
  const itemSchema = (schema as ArrayJsonSchema).items;
  itemSchema.key = checkPlural(schema.name);
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

  const properySignatures = schema.properties.map((property) => {
    return generatePropertySignature(property, context);
  }).filter((property): property is ts.PropertySignature => property !== undefined);

  const interfaceDeclaration = tsFactory.createInterfaceDeclaration(
    [tsFactory.createModifier(ts.SyntaxKind.ExportKeyword)],
    (schema as JsonSchema).name ? (schema as JsonSchema).name : upperFirst((schema as ObjSchema).key),
    undefined,
    undefined,
    properySignatures
  );

  context.result.push(interfaceDeclaration);
  return interfaceDeclaration;
}

function generatePropertySignature(schema: Schema, context: GenerateContext) {
  let typeNode: ts.KeywordTypeNode | ts.TypeReferenceNode | undefined = undefined;
  let isArray = false;
  let isEnum = false;
  switch (schema.type) {
    case 'number':
    case 'string':
      if (schema.enum) {
        isEnum = true;
        break;
      }
    case 'boolean':
    case 'object':
      typeNode = generateTypeKeyword(schema, context);
      break;
    case 'array':
      const itemSchema = (schema as ArraySchema).items;
      if (itemSchema.type === 'object') itemSchema.key = checkPlural(schema.key as string);
      typeNode = generateTypeKeyword(itemSchema, context);
      isArray = true;
      break;
  }
  if (!typeNode) throw new Error(`Unknown type: ${schema.type}`);
  const unionTypes: ts.TypeNode[] = [];
  if (isEnum) {
    unionTypes.push(...generateEnumType(schema as NumberSchema | StringSchema));
  }
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

export function generateEnumType(schema: NumberSchema | StringSchema): ts.LiteralTypeNode[] {
  return schema?.enum?.map((enumValue: string | number) => {
    if (schema.type === 'number') {
      return tsFactory.createLiteralTypeNode(tsFactory.createNumericLiteral(enumValue));
    } else {
      return tsFactory.createLiteralTypeNode(tsFactory.createStringLiteral(enumValue as string));
    }
  }) || [];
}

export function generateTypeKeyword(schema: Schema, context: GenerateContext): ts.KeywordTypeNode | ts.TypeReferenceNode {
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

export function checkPlural(name: string) {
  if (isPlural(name)) return singular(name);
  return name + 'Item';
}

function checkDuplicates({result}: GenerateContext) {
  const nameMap = groupBy(result, (type) => {
    const vals = [type.name.text];
    type.typeParameters?.forEach((param) => {
      vals.push(param.name.text);
    });
    return vals.join('|');
  });

  const namesToRemove: {[k: string]: number} = {};

  Object.keys(nameMap).forEach((name) => {
    if (nameMap[name].length > 1) {
      namesToRemove[name] = nameMap[name].length - 1;
    }
  });

  result = result.filter((type) => {
    if (namesToRemove[type.name.text] && namesToRemove[type.name.text] > 0) {
      namesToRemove[type.name.text]--;
      return false;
    }
    return true;
  });

  return {result};
}


