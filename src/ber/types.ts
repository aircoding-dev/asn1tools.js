/**
 * ASN.1 type implementations using BER encoding
 */

import { Asn1Type, BER, EncodeError, DecodeError } from '../types';
import { 
  encodeTag, 
  encodeLength, 
  decodeTag, 
  decodeLength, 
  encodeSignedInteger, 
  decodeSignedInteger,
  toSafeNumber 
} from './encoding';

/**
 * Base class for all ASN.1 types
 */
export abstract class BaseType implements Asn1Type {
  public name: string;
  public tag: number;
  protected constructed: boolean = false;

  constructor(name: string, tag: number) {
    this.name = name;
    this.tag = tag;
  }

  abstract encode(value: any): Uint8Array;
  abstract decode(data: Uint8Array, offset?: number): { value: any; length: number };

  protected encodeWithTag(content: Uint8Array): Uint8Array {
    const tagBytes = encodeTag(this.tag, this.constructed ? BER.ENCODING.CONSTRUCTED : BER.ENCODING.PRIMITIVE);
    const lengthBytes = encodeLength(content.length);
    
    const result = new Uint8Array(tagBytes.length + lengthBytes.length + content.length);
    let offset = 0;
    
    result.set(tagBytes, offset);
    offset += tagBytes.length;
    
    result.set(lengthBytes, offset);
    offset += lengthBytes.length;
    
    result.set(content, offset);
    
    return result;
  }

  protected decodeWithTag(data: Uint8Array, offset: number = 0): { content: Uint8Array; totalLength: number } {
    if (offset >= data.length) {
      throw new DecodeError(`Unexpected end of data while decoding ${this.name}`, offset);
    }

    const tagInfo = decodeTag(data, offset);
    let currentOffset = offset + tagInfo.length;

    // Verify tag matches expected
    if (tagInfo.tag !== this.tag) {
      throw new DecodeError(
        `Expected tag ${this.tag} for ${this.name}, got ${tagInfo.tag}`,
        offset
      );
    }

    const lengthInfo = decodeLength(data, currentOffset);
    currentOffset += lengthInfo.octets;

    if (currentOffset + lengthInfo.length > data.length) {
      throw new DecodeError(
        `Not enough data for ${this.name}: expected ${lengthInfo.length} bytes`,
        currentOffset
      );
    }

    const content = data.slice(currentOffset, currentOffset + lengthInfo.length);
    return {
      content,
      totalLength: tagInfo.length + lengthInfo.octets + lengthInfo.length
    };
  }
}

/**
 * ASN.1 INTEGER type
 */
export class IntegerType extends BaseType {
  constructor(name: string) {
    super(name, BER.TAG.INTEGER);
  }

  encode(value: any): Uint8Array {
    if (typeof value !== 'number' && typeof value !== 'bigint') {
      throw new EncodeError(`INTEGER ${this.name}: expected number or bigint, got ${typeof value}`);
    }

    const content = encodeSignedInteger(value);
    return this.encodeWithTag(content);
  }

  decode(data: Uint8Array, offset: number = 0): { value: number | bigint; length: number } {
    const { content, totalLength } = this.decodeWithTag(data, offset);
    
    if (content.length === 0) {
      throw new DecodeError(`INTEGER ${this.name}: empty content`, offset);
    }

    const bigintValue = decodeSignedInteger(content);
    const value = toSafeNumber(bigintValue);

    return { value, length: totalLength };
  }
}

/**
 * ASN.1 BOOLEAN type
 */
export class BooleanType extends BaseType {
  constructor(name: string) {
    super(name, BER.TAG.BOOLEAN);
  }

  encode(value: any): Uint8Array {
    if (typeof value !== 'boolean') {
      throw new EncodeError(`BOOLEAN ${this.name}: expected boolean, got ${typeof value}`);
    }

    const content = new Uint8Array([value ? 0xff : 0x00]);
    return this.encodeWithTag(content);
  }

  decode(data: Uint8Array, offset: number = 0): { value: boolean; length: number } {
    const { content, totalLength } = this.decodeWithTag(data, offset);

    if (content.length !== 1) {
      throw new DecodeError(`BOOLEAN ${this.name}: expected 1 byte content, got ${content.length}`, offset);
    }

    const value = content[0] !== 0;
    return { value, length: totalLength };
  }
}

/**
 * ASN.1 OCTET STRING type
 */
export class OctetStringType extends BaseType {
  constructor(name: string) {
    super(name, BER.TAG.OCTET_STRING);
  }

  encode(value: any): Uint8Array {
    let content: Uint8Array;

    if (value instanceof Uint8Array) {
      content = value;
    } else if (value instanceof ArrayBuffer) {
      content = new Uint8Array(value);
    } else if (Array.isArray(value)) {
      content = new Uint8Array(value);
    } else if (typeof value === 'string') {
      // Assume hex string
      const hex = value.replace(/[^0-9a-fA-F]/g, '');
      if (hex.length % 2 !== 0) {
        throw new EncodeError(`OCTET STRING ${this.name}: hex string must have even length`);
      }
      content = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        content[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
    } else {
      throw new EncodeError(`OCTET STRING ${this.name}: expected Uint8Array, ArrayBuffer, number[], or hex string, got ${typeof value}`);
    }

    return this.encodeWithTag(content);
  }

  decode(data: Uint8Array, offset: number = 0): { value: Uint8Array; length: number } {
    const { content, totalLength } = this.decodeWithTag(data, offset);
    return { value: content, length: totalLength };
  }
}

/**
 * ASN.1 NULL type
 */
export class NullType extends BaseType {
  constructor(name: string) {
    super(name, BER.TAG.NULL);
  }

  encode(value: any): Uint8Array {
    if (value !== null && value !== undefined) {
      throw new EncodeError(`NULL ${this.name}: expected null or undefined, got ${typeof value}`);
    }

    const content = new Uint8Array(0);
    return this.encodeWithTag(content);
  }

  decode(data: Uint8Array, offset: number = 0): { value: null; length: number } {
    const { content, totalLength } = this.decodeWithTag(data, offset);

    if (content.length !== 0) {
      throw new DecodeError(`NULL ${this.name}: expected empty content, got ${content.length} bytes`, offset);
    }

    return { value: null, length: totalLength };
  }
}

/**
 * ASN.1 ENUMERATED type
 */
export class EnumeratedType extends BaseType {
  private valueMap: Map<string, number>;
  private nameMap: Map<number, string>;

  constructor(name: string, values: Array<[string, number]>) {
    super(name, BER.TAG.ENUMERATED);
    
    this.valueMap = new Map();
    this.nameMap = new Map();
    
    for (const [valueName, valueNumber] of values) {
      this.valueMap.set(valueName, valueNumber);
      this.nameMap.set(valueNumber, valueName);
    }
  }

  encode(value: any): Uint8Array {
    let enumValue: number;

    if (typeof value === 'string') {
      const mappedValue = this.valueMap.get(value);
      if (mappedValue === undefined) {
        throw new EncodeError(`ENUMERATED ${this.name}: unknown value '${value}'`);
      }
      enumValue = mappedValue;
    } else if (typeof value === 'number') {
      if (!this.nameMap.has(value)) {
        throw new EncodeError(`ENUMERATED ${this.name}: unknown numeric value ${value}`);
      }
      enumValue = value;
    } else {
      throw new EncodeError(`ENUMERATED ${this.name}: expected string or number, got ${typeof value}`);
    }

    const content = encodeSignedInteger(enumValue);
    return this.encodeWithTag(content);
  }

  decode(data: Uint8Array, offset: number = 0): { value: string; length: number } {
    const { content, totalLength } = this.decodeWithTag(data, offset);

    if (content.length === 0) {
      throw new DecodeError(`ENUMERATED ${this.name}: empty content`, offset);
    }

    const bigintValue = decodeSignedInteger(content);
    const numericValue = Number(bigintValue);

    const name = this.nameMap.get(numericValue);
    if (name === undefined) {
      throw new DecodeError(`ENUMERATED ${this.name}: unknown value ${numericValue}`, offset);
    }

    return { value: name, length: totalLength };
  }
} 