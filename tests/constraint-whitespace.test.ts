import { compileString } from '../src/index';

describe('Constraint whitespace tolerance', () => {
  const schemaWithSpaces = `
    Test DEFINITIONS ::= BEGIN
      SHORT ::= INTEGER (-1..1)
      Bytes ::= OCTET STRING (SIZE(4))
    END
  `;
  const schemaWithoutSpaces = schemaWithSpaces.replace(/\s+\(/g, '(');

  it('compiles with space before parenthesis', () => {
    expect(() => compileString(schemaWithSpaces)).not.toThrow();
  });

  it('compiles without space before parenthesis', () => {
    expect(() => compileString(schemaWithoutSpaces)).not.toThrow();
  });
}); 