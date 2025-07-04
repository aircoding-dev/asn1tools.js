/**
 * Basic functionality tests for asn1tools-js
 */

import { compileString, hexToBytes, bytesToHex } from '../src/index';
import { IntegerType, BooleanType, OctetStringType } from '../src/ber/types';

describe('Basic ASN.1 Types', () => {
  describe('INTEGER', () => {
    test('should encode and decode positive integers', () => {
      const intType = new IntegerType('testInt');
      
      const encoded = intType.encode(42);
      const decoded = intType.decode(encoded);
      
      expect(decoded.value).toBe(42);
    });

    test('should encode and decode negative integers', () => {
      const intType = new IntegerType('testInt');
      
      const encoded = intType.encode(-42);
      const decoded = intType.decode(encoded);
      
      expect(decoded.value).toBe(-42);
    });

    test('should encode and decode zero', () => {
      const intType = new IntegerType('testInt');
      
      const encoded = intType.encode(0);
      const decoded = intType.decode(encoded);
      
      expect(decoded.value).toBe(0);
    });

    test('should handle large integers', () => {
      const intType = new IntegerType('testInt');
      
      const largeInt = 2147483647; // Max 32-bit signed integer
      const encoded = intType.encode(largeInt);
      const decoded = intType.decode(encoded);
      
      expect(decoded.value).toBe(largeInt);
    });
  });

  describe('BOOLEAN', () => {
    test('should encode and decode true', () => {
      const boolType = new BooleanType('testBool');
      
      const encoded = boolType.encode(true);
      const decoded = boolType.decode(encoded);
      
      expect(decoded.value).toBe(true);
    });

    test('should encode and decode false', () => {
      const boolType = new BooleanType('testBool');
      
      const encoded = boolType.encode(false);
      const decoded = boolType.decode(encoded);
      
      expect(decoded.value).toBe(false);
    });
  });

  describe('OCTET STRING', () => {
    test('should encode and decode Uint8Array', () => {
      const octetType = new OctetStringType('testOctet');
      const testData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      
      const encoded = octetType.encode(testData);
      const decoded = octetType.decode(encoded);
      
      expect(decoded.value).toEqual(testData);
    });

    test('should encode and decode hex string', () => {
      const octetType = new OctetStringType('testOctet');
      const hexString = '01020304';
      
      const encoded = octetType.encode(hexString);
      const decoded = octetType.decode(encoded);
      
      expect(bytesToHex(decoded.value)).toBe(hexString.toLowerCase());
    });

    test('should encode and decode number array', () => {
      const octetType = new OctetStringType('testOctet');
      const numberArray = [1, 2, 3, 4];
      
      const encoded = octetType.encode(numberArray);
      const decoded = octetType.decode(encoded);
      
      expect(Array.from(decoded.value)).toEqual(numberArray);
    });
  });
});

describe('Utility Functions', () => {
  describe('hexToBytes', () => {
    test('should convert hex string to bytes', () => {
      const hex = '01020304';
      const expected = new Uint8Array([1, 2, 3, 4]);
      
      expect(hexToBytes(hex)).toEqual(expected);
    });

    test('should handle uppercase hex', () => {
      const hex = 'ABCDEF';
      const expected = new Uint8Array([0xAB, 0xCD, 0xEF]);
      
      expect(hexToBytes(hex)).toEqual(expected);
    });

    test('should ignore non-hex characters', () => {
      const hex = '01-02:03 04';
      const expected = new Uint8Array([1, 2, 3, 4]);
      
      expect(hexToBytes(hex)).toEqual(expected);
    });
  });

  describe('bytesToHex', () => {
    test('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      const expected = '01020304';
      
      expect(bytesToHex(bytes)).toBe(expected);
    });

    test('should handle large values', () => {
      const bytes = new Uint8Array([0xAB, 0xCD, 0xEF]);
      const expected = 'abcdef';
      
      expect(bytesToHex(bytes)).toBe(expected);
    });
  });
});

describe('Simple ASN.1 Compilation', () => {
  test('should compile simple integer type', () => {
    const asn1Content = `
      Test DEFINITIONS ::= BEGIN
        SimpleInt ::= INTEGER
      END
    `;
    
    const spec = compileString(asn1Content);
    
    expect(spec.getTypeNames()).toContain('SimpleInt');
    
    const encoded = spec.encode('SimpleInt', 42);
    const decoded = spec.decode('SimpleInt', encoded);
    
    expect(decoded).toBe(42);
  });

  test('should compile simple boolean type', () => {
    const asn1Content = `
      Test DEFINITIONS ::= BEGIN
        SimpleBool ::= BOOLEAN
      END
    `;
    
    const spec = compileString(asn1Content);
    
    expect(spec.getTypeNames()).toContain('SimpleBool');
    
    const encoded = spec.encode('SimpleBool', true);
    const decoded = spec.decode('SimpleBool', encoded);
    
    expect(decoded).toBe(true);
  });
}); 