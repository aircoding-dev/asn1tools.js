import { compileString, hexToBytes } from '../src/index';

describe('Constraint whitespace tolerance', () => {
  const schemaWithSpaces = `
    Test DEFINITIONS ::= BEGIN
      SHORT ::= INTEGER ( -1..1 )
      Bytes ::= OCTET STRING  ( SIZE ( 4 ) )
      Complex ::= SEQUENCE {
        id INTEGER,
        data OCTET STRING ( SIZE ( 4 ) )
      }
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

// -----------------------------------------------------------------------------
// Additional whitespace test originally in message-processing-whitespace.test.ts
// -----------------------------------------------------------------------------

describe('OCTET STRING constraint whitespace in SEQUENCE', () => {
  it('compiles and encodes DataRequest with space before constraint', () => {
    const genericAsn1WithSpaces = `
      Messages DEFINITIONS ::= BEGIN
        SHORT ::= INTEGER ( -32768..32767 )
        INT ::= INTEGER ( -2147483648..2147483647 )
        LONG ::= INTEGER (-9223372036854775808..9223372036854775807) 

        DataRequest ::= SEQUENCE {
          messageId LONG,
          version INT,
          category SHORT,
          size LONG,
          identifier OCTET STRING ( SIZE ( 20 ) ),
          checksum OCTET STRING(SIZE(32))
        }
      END
    `;

    const spec = compileString(genericAsn1WithSpaces);

    const dataRequest = {
      messageId: 1,
      version: 0,
      category: 2,
      size: 500,
      identifier: hexToBytes('973539beb5008a29ca866b178ce99f2782b5e39a'),
      checksum: hexToBytes('2c8a0426b8a6cf115894cd81135c08fea8f611dfe365bd543dc9443043fea187')
    };

    const encoded = spec.encode('DataRequest', dataRequest);
    const decoded = spec.decode('DataRequest', encoded);

    expect(decoded.messageId).toBe(1);
    expect(decoded.identifier.length).toBe(20);
    expect(decoded.checksum.length).toBe(32);
  });
}); 