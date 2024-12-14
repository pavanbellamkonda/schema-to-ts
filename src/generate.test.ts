import {describe, expect, test} from '@jest/globals';
import ts, { factory as tsFactory } from 'typescript';
import { checkPlural, generateTypeKeyword } from './generate';

describe('checkPlural', () => {
  test('should return the singular form of a word if it is plural', () => {
    expect(checkPlural('users')).toBe('user');
  });

  test('should add Item to the end of the word if it is not plural', () => {
    expect(checkPlural('user')).toBe('userItem');
  });
});

describe('generateTypeKeyword', () => {
  test('should return number keyword for number type', () => {
    expect(generateTypeKeyword({type: 'number'}, {result: []})).toEqual(tsFactory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword));
  });

  test('should return string keyword for string type', () => {
    expect(generateTypeKeyword({type: 'string'}, {result: []})).toEqual(tsFactory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword));
  });

  test('should return boolean keyword for boolean type', () => {
    expect(generateTypeKeyword({type: 'boolean'}, {result: []})).toEqual(tsFactory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword));
  });

  // test('should return any keyword for unknown type', () => {
  //   expect(generateTypeKeyword({type: 'unknown'}, {result: []})).toBe(tsFactory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
  // });
});


