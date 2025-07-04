/**
 * Complex ASN.1 type implementations
 */

import { Asn1Type, BER, EncodeError, DecodeError } from '../types';
import { encodeTag, encodeLength, decodeTag, decodeLength } from './encoding';
import { BaseType } from './types';

/**
 * ASN.1 SEQUENCE type
 */
export class SequenceType extends BaseType {
  private members: Array<{
    name: string;
    type: Asn1Type;
    optional?: boolean;
    defaultValue?: any;
  }>;

  constructor(name: string, members: Array<{ name: string; type: Asn1Type; optional?: boolean; defaultValue?: any }>) {
    super(name, BER.TAG.SEQUENCE);
    this.constructed = true;
    this.members = members;
  }

  encode(value: any): Uint8Array {
    if (!value || typeof value !== 'object') {
      throw new EncodeError(`SEQUENCE ${this.name}: expected object, got ${typeof value}`);
    }

    const encodedMembers: Uint8Array[] = [];

    for (const member of this.members) {
      const memberValue = value[member.name];

      if (memberValue === undefined || memberValue === null) {
        if (member.optional) {
          continue; // Skip optional members
        }
        if (member.defaultValue !== undefined) {
          // Use default value
          const encoded = member.type.encode(member.defaultValue);
          encodedMembers.push(encoded);
        } else {
          throw new EncodeError(`SEQUENCE ${this.name}: missing required member '${member.name}'`);
        }
      } else {
        const encoded = member.type.encode(memberValue);
        encodedMembers.push(encoded);
      }
    }

    // Concatenate all encoded members
    const totalLength = encodedMembers.reduce((sum, arr) => sum + arr.length, 0);
    const content = new Uint8Array(totalLength);
    let offset = 0;

    for (const encoded of encodedMembers) {
      content.set(encoded, offset);
      offset += encoded.length;
    }

    return this.encodeWithTag(content);
  }

  decode(data: Uint8Array, offset: number = 0): { value: any; length: number } {
    const { content, totalLength } = this.decodeWithTag(data, offset);
    
    const result: any = {};
    let contentOffset = 0;
    let memberIndex = 0;

    while (contentOffset < content.length && memberIndex < this.members.length) {
      const member = this.members[memberIndex];
      if (!member) {
        throw new DecodeError(`SEQUENCE ${this.name}: internal error - member at index ${memberIndex} not found`, offset);
      }
      
      try {
        const decoded = member.type.decode(content, contentOffset);
        result[member.name] = decoded.value;
        contentOffset += decoded.length;
        memberIndex++;
      } catch (error) {
        if (member.optional) {
          // Skip optional member that's not present
          memberIndex++;
          continue;
        }
        if (member.defaultValue !== undefined) {
          // Use default value
          result[member.name] = member.defaultValue;
          memberIndex++;
          continue;
        }
        throw new DecodeError(
          `SEQUENCE ${this.name}: failed to decode member '${member.name}': ${error instanceof Error ? error.message : String(error)}`,
          offset + contentOffset
        );
      }
    }

    // Check for missing required members
    while (memberIndex < this.members.length) {
      const member = this.members[memberIndex];
      if (!member) {
        throw new DecodeError(`SEQUENCE ${this.name}: internal error - member at index ${memberIndex} not found`, offset);
      }
      if (!member.optional && member.defaultValue === undefined) {
        throw new DecodeError(`SEQUENCE ${this.name}: missing required member '${member.name}'`, offset);
      }
      if (member.defaultValue !== undefined) {
        result[member.name] = member.defaultValue;
      }
      memberIndex++;
    }

    return { value: result, length: totalLength };
  }
}

/**
 * ASN.1 SEQUENCE OF type
 */
export class SequenceOfType extends BaseType {
  private elementType: Asn1Type;

  constructor(name: string, elementType: Asn1Type) {
    super(name, BER.TAG.SEQUENCE);
    this.constructed = true;
    this.elementType = elementType;
  }

  encode(value: any): Uint8Array {
    if (!Array.isArray(value)) {
      throw new EncodeError(`SEQUENCE OF ${this.name}: expected array, got ${typeof value}`);
    }

    const encodedElements: Uint8Array[] = [];

    for (let i = 0; i < value.length; i++) {
      try {
        const encoded = this.elementType.encode(value[i]);
        encodedElements.push(encoded);
      } catch (error) {
        throw new EncodeError(
          `SEQUENCE OF ${this.name}: failed to encode element ${i}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Concatenate all encoded elements
    const totalLength = encodedElements.reduce((sum, arr) => sum + arr.length, 0);
    const content = new Uint8Array(totalLength);
    let offset = 0;

    for (const encoded of encodedElements) {
      content.set(encoded, offset);
      offset += encoded.length;
    }

    return this.encodeWithTag(content);
  }

  decode(data: Uint8Array, offset: number = 0): { value: any[]; length: number } {
    const { content, totalLength } = this.decodeWithTag(data, offset);
    
    const result: any[] = [];
    let contentOffset = 0;

    while (contentOffset < content.length) {
      try {
        const decoded = this.elementType.decode(content, contentOffset);
        result.push(decoded.value);
        contentOffset += decoded.length;
      } catch (error) {
        throw new DecodeError(
          `SEQUENCE OF ${this.name}: failed to decode element ${result.length}: ${error instanceof Error ? error.message : String(error)}`,
          offset + contentOffset
        );
      }
    }

    return { value: result, length: totalLength };
  }
}

/**
 * ASN.1 CHOICE type
 */
export class ChoiceType extends BaseType {
  private choices: Map<string, { type: Asn1Type; tag?: number }>;
  private tagToChoice: Map<number, string>;

  constructor(name: string, choices: Array<{ name: string; type: Asn1Type; tag?: number }>) {
    super(name, BER.TAG.CHOICE); // Special marker tag
    this.choices = new Map();
    this.tagToChoice = new Map();

    for (const choice of choices) {
      const choiceObj: any = { type: choice.type };
      if (choice.tag !== undefined) {
        choiceObj.tag = choice.tag;
      }
      this.choices.set(choice.name, choiceObj);
      
      // Map tag to choice name for decoding
      const choiceTag = choice.tag ?? choice.type.tag;
      this.tagToChoice.set(choiceTag, choice.name);
    }
  }

  encode(value: any): Uint8Array {
    if (!value || typeof value !== 'object') {
      throw new EncodeError(`CHOICE ${this.name}: expected object with single property, got ${typeof value}`);
    }

    const keys = Object.keys(value);
    if (keys.length !== 1) {
      throw new EncodeError(`CHOICE ${this.name}: expected object with exactly one property, got ${keys.length}`);
    }

    const choiceName = keys[0];
    if (!choiceName) {
      throw new EncodeError(`CHOICE ${this.name}: invalid choice name`);
    }
    const choiceValue = value[choiceName];
    const choice = this.choices.get(choiceName);

    if (!choice) {
      throw new EncodeError(`CHOICE ${this.name}: unknown choice '${choiceName}'`);
    }

    // For CHOICE, we encode the selected alternative directly
    // If there's a context-specific tag, apply it
    if (choice.tag !== undefined) {
      // Apply context-specific tag
      const innerEncoded = choice.type.encode(choiceValue);
      const tagBytes = encodeTag(choice.tag, BER.CLASS.CONTEXT_SPECIFIC | BER.ENCODING.CONSTRUCTED);
      const lengthBytes = encodeLength(innerEncoded.length);
      
      const result = new Uint8Array(tagBytes.length + lengthBytes.length + innerEncoded.length);
      let offset = 0;
      
      result.set(tagBytes, offset);
      offset += tagBytes.length;
      
      result.set(lengthBytes, offset);
      offset += lengthBytes.length;
      
      result.set(innerEncoded, offset);
      
      return result;
    } else {
      return choice.type.encode(choiceValue);
    }
  }

  decode(data: Uint8Array, offset: number = 0): { value: any; length: number } {
    if (offset >= data.length) {
      throw new DecodeError(`CHOICE ${this.name}: unexpected end of data`, offset);
    }

    // Peek at the tag to determine which choice to decode
    const tagInfo = decodeTag(data, offset);
    const choiceName = this.tagToChoice.get(tagInfo.tag);

    if (!choiceName) {
      throw new DecodeError(`CHOICE ${this.name}: no choice found for tag ${tagInfo.tag}`, offset);
    }

    const choice = this.choices.get(choiceName);
    if (!choice) {
      throw new DecodeError(`CHOICE ${this.name}: internal error - choice '${choiceName}' not found`, offset);
    }

    // Decode using the appropriate choice type
    if (choice.tag !== undefined) {
      // Handle context-specific tagged choice
      const lengthInfo = decodeLength(data, offset + tagInfo.length);
      const contentStart = offset + tagInfo.length + lengthInfo.octets;
      const contentEnd = contentStart + lengthInfo.length;
      
      if (contentEnd > data.length) {
        throw new DecodeError(`CHOICE ${this.name}: not enough data for choice content`, offset);
      }
      
      const contentData = data.slice(contentStart, contentEnd);
      const decoded = choice.type.decode(contentData, 0);
      
      return {
        value: { [choiceName]: decoded.value },
        length: tagInfo.length + lengthInfo.octets + lengthInfo.length
      };
    } else {
      const decoded = choice.type.decode(data, offset);
      return {
        value: { [choiceName]: decoded.value },
        length: decoded.length
      };
    }
  }

  // Override the base class method since CHOICE doesn't have a fixed tag
  protected decodeWithTag(_data: Uint8Array, _offset: number = 0): { content: Uint8Array; totalLength: number } {
    throw new Error('CHOICE type should not use decodeWithTag - use decode directly');
  }

  protected encodeWithTag(_content: Uint8Array): Uint8Array {
    throw new Error('CHOICE type should not use encodeWithTag - use encode directly');
  }
} 