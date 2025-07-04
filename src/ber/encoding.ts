/**
 * BER (Basic Encoding Rules) encoding utilities
 */

import { EncodeError, DecodeError } from '../types';

/**
 * Encode a BER tag
 */
export function encodeTag(tagNumber: number, flags: number = 0): Uint8Array {
  if (tagNumber < 31) {
    return new Uint8Array([tagNumber | flags]);
  }
  
  // High tag number form
  const result: number[] = [0x1f | flags];
  const bytes: number[] = [];
  
  let temp = tagNumber;
  while (temp > 0) {
    bytes.unshift(temp & 0x7f);
    temp >>= 7;
  }
  
  // Set continuation bit for all but last byte
  for (let i = 0; i < bytes.length - 1; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      bytes[i] = byte | 0x80;
    }
  }
  
  return new Uint8Array([...result, ...bytes]);
}

/**
 * Encode BER length (definite form)
 */
export function encodeLength(length: number): Uint8Array {
  if (length < 0) {
    throw new EncodeError('Length cannot be negative');
  }
  
  if (length <= 127) {
    // Short form
    return new Uint8Array([length]);
  }
  
  // Long form
  const bytes: number[] = [];
  let temp = length;
  
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }
  
  if (bytes.length > 127) {
    throw new EncodeError('Length too large for BER encoding');
  }
  
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

/**
 * Decode BER tag
 */
export function decodeTag(data: Uint8Array, offset: number = 0): { tag: number; length: number; constructed: boolean } {
  if (offset >= data.length) {
    throw new DecodeError('Unexpected end of data while reading tag', offset);
  }
  
  const firstByte = data[offset];
  if (firstByte === undefined) {
    throw new DecodeError('Unexpected end of data while reading tag byte', offset);
  }
  
  const constructed = (firstByte & 0x20) !== 0;
  let tagNumber: number;
  let length: number;
  
  if ((firstByte & 0x1f) !== 0x1f) {
    // Low tag number form
    tagNumber = firstByte & 0x1f;
    length = 1;
  } else {
    // High tag number form
    tagNumber = 0;
    length = 1;
    
    while (length + offset < data.length) {
      const byte = data[offset + length];
      if (byte === undefined) {
        throw new DecodeError('Unexpected end of data while reading tag', offset + length);
      }
      
      length++;
      tagNumber = (tagNumber << 7) | (byte & 0x7f);
      
      if ((byte & 0x80) === 0) {
        break;
      }
      
      if (length > 6) { // Prevent infinite loops
        throw new DecodeError('Tag number too large', offset);
      }
    }
    
    if (offset + length > data.length) {
      throw new DecodeError('Unexpected end of data while reading high tag number', offset);
    }
  }
  
  return { tag: tagNumber, length, constructed };
}

/**
 * Decode BER length
 */
export function decodeLength(data: Uint8Array, offset: number): { length: number; octets: number } {
  if (offset >= data.length) {
    throw new DecodeError('Unexpected end of data while reading length', offset);
  }
  
  const firstByte = data[offset];
  if (firstByte === undefined) {
    throw new DecodeError('No data available for length', offset);
  }
  
  if ((firstByte & 0x80) === 0) {
    // Short form
    return { length: firstByte, octets: 1 };
  }
  
  // Long form
  const lengthOctets = firstByte & 0x7f;
  
  if (lengthOctets === 0) {
    throw new DecodeError('Indefinite length not supported in this context', offset);
  }
  
  if (lengthOctets > 4) {
    throw new DecodeError('Length too large', offset);
  }
  
  if (offset + lengthOctets >= data.length) {
    throw new DecodeError('Unexpected end of data while reading length', offset);
  }
  
  let length = 0;
  for (let i = 1; i <= lengthOctets; i++) {
    const byte = data[offset + i];
    if (byte === undefined) {
      throw new DecodeError(`Missing length byte at position ${offset + i}`, offset + i);
    }
    length = (length << 8) | byte;
  }
  
  return { length, octets: lengthOctets + 1 };
}

/**
 * Encode a signed integer in two's complement form
 */
export function encodeSignedInteger(value: number | bigint): Uint8Array {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new EncodeError('Value must be an integer');
    }
    value = BigInt(value);
  }
  
  if (value === 0n) {
    return new Uint8Array([0]);
  }
  
  const negative = value < 0n;
  let temp = negative ? -value - 1n : value;
  const bytes: number[] = [];
  
  // Calculate minimum number of bytes needed
  while (temp > 0n) {
    bytes.unshift(Number(temp & 0xffn));
    temp >>= 8n;
  }
  
  if (bytes.length === 0) {
    bytes.push(0);
  }
  
  // Adjust for sign bit
  if (negative) {
    // Two's complement
    let carry = 1;
    for (let i = bytes.length - 1; i >= 0; i--) {
      const byte = bytes[i];
      if (byte !== undefined) {
        bytes[i] = (~byte + carry) & 0xff;
        carry = bytes[i]! > 0xff ? 1 : 0;
      }
    }
    
    // Ensure sign bit is set
    const firstByte = bytes[0];
    if (firstByte !== undefined && (firstByte & 0x80) === 0) {
      bytes.unshift(0xff);
    }
  } else {
    // Ensure sign bit is not set for positive numbers
    const firstByte = bytes[0];
    if (firstByte !== undefined && (firstByte & 0x80) !== 0) {
      bytes.unshift(0x00);
    }
  }
  
  return new Uint8Array(bytes);
}

/**
 * Decode a signed integer from two's complement form
 */
export function decodeSignedInteger(data: Uint8Array): bigint {
  if (data.length === 0) {
    throw new DecodeError('Empty integer data');
  }
  
  const firstByte = data[0];
  if (firstByte === undefined) {
    throw new DecodeError('No data available for integer');
  }
  
  const negative = (firstByte & 0x80) !== 0;
  let result = 0n;
  
  if (negative) {
    // Two's complement decoding
    let borrow = 1;
    const bytes = Array.from(data);
    
    // Subtract 1 and invert
    for (let i = bytes.length - 1; i >= 0; i--) {
      const byte = bytes[i];
      if (byte !== undefined) {
        bytes[i] = byte - borrow;
        if (bytes[i]! < 0) {
          bytes[i] = bytes[i]! + 256;
          borrow = 1;
        } else {
          borrow = 0;
        }
        bytes[i] = (~bytes[i]!) & 0xff;
      }
    }
    
    for (const byte of bytes) {
      result = (result << 8n) | BigInt(byte);
    }
    
    return -result - 1n;
  } else {
    // Positive number
    for (const byte of data) {
      result = (result << 8n) | BigInt(byte);
    }
    
    return result;
  }
}

/**
 * Convert number to safe JavaScript number if possible, otherwise keep as bigint
 */
export function toSafeNumber(value: bigint): number | bigint {
  if (value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(value);
  }
  return value;
} 