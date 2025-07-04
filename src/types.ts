/**
 * Core type definitions for ASN.1 tools TypeScript implementation
 */

export interface Asn1Value {
  [key: string]: any;
}

export interface Asn1Type {
  name: string;
  tag: number;
  encode(value: any): Uint8Array;
  decode(data: Uint8Array, offset?: number): { value: any; length: number };
}

export interface Asn1Module {
  name: string;
  types: Map<string, Asn1Type>;
}

export interface Asn1Specification {
  modules: Map<string, Asn1Module>;
  types: Map<string, Asn1Type>;
}

export interface ParsedType {
  name: string;
  type: string;
  tag?: number | undefined;
  optional?: boolean | undefined;
  default?: any;
  constraints?: any;
  members?: ParsedType[] | undefined;
  elementType?: ParsedType | undefined;
  choices?: ParsedType[] | undefined;
}

export interface ParsedModule {
  name: string;
  types: Map<string, ParsedType>;
}

export interface CompileOptions {
  codec?: 'ber' | 'der' | 'per' | 'uper';
  checkConstraints?: boolean;
}

// BER encoding constants
export const BER = {
  CLASS: {
    UNIVERSAL: 0x00,
    APPLICATION: 0x40,
    CONTEXT_SPECIFIC: 0x80,
    PRIVATE: 0xc0
  },
  
  ENCODING: {
    PRIMITIVE: 0x00,
    CONSTRUCTED: 0x20
  },
  
  TAG: {
    BOOLEAN: 0x01,
    INTEGER: 0x02,
    BIT_STRING: 0x03,
    OCTET_STRING: 0x04,
    NULL: 0x05,
    OBJECT_IDENTIFIER: 0x06,
    ENUMERATED: 0x0a,
    SEQUENCE: 0x10,
    SET: 0x11,
    PRINTABLE_STRING: 0x13,
    IA5_STRING: 0x16,
    UTC_TIME: 0x17,
    GENERALIZED_TIME: 0x18,
    CHOICE: 0xff // Special marker for CHOICE types
  }
} as const;

export type BerTag = typeof BER.TAG[keyof typeof BER.TAG];

// Error classes
export class Asn1Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Asn1Error';
  }
}

export class EncodeError extends Asn1Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncodeError';
  }
}

export class DecodeError extends Asn1Error {
  public offset?: number | undefined;
  
  constructor(message: string, offset?: number | undefined) {
    super(message);
    this.name = 'DecodeError';
    if (offset !== undefined) {
      this.offset = offset;
    }
  }
}

export class ParseError extends Asn1Error {
  public line?: number | undefined;
  public column?: number | undefined;
  
  constructor(message: string, line?: number | undefined, column?: number | undefined) {
    super(message);
    this.name = 'ParseError';
    if (line !== undefined) {
      this.line = line;
    }
    if (column !== undefined) {
      this.column = column;
    }
  }
}

export class CompileError extends Asn1Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompileError';
  }
} 