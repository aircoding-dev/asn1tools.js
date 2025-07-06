/**
 * ASN.1 grammar parser
 */

import { ParsedType, ParsedModule, ParseError } from './types';

export class Asn1Parser {
  private input: string = '';
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  parse(content: string): ParsedModule[] {
    this.input = content;
    this.position = 0;
    this.line = 1;
    this.column = 1;

    const modules: ParsedModule[] = [];

    this.skipWhitespaceAndComments();
    while (!this.isAtEnd()) {
      const module = this.parseModule();
      modules.push(module);
      this.skipWhitespaceAndComments();
    }

    return modules;
  }

  private parseModule(): ParsedModule {
    // Parse module header: ModuleName DEFINITIONS ::= BEGIN
    const moduleName = this.parseIdentifier();
    this.expectKeyword('DEFINITIONS');
    this.expectToken('::=');
    this.expectKeyword('BEGIN');

    const types = new Map<string, ParsedType>();

    this.skipWhitespaceAndComments();
    while (!this.checkKeyword('END') && !this.isAtEnd()) {
      const typeAssignment = this.parseTypeAssignment();
      types.set(typeAssignment.name, typeAssignment);
      this.skipWhitespaceAndComments();
    }

    this.expectKeyword('END');

    return {
      name: moduleName,
      types
    };
  }

  private parseTypeAssignment(): ParsedType {
    const name = this.parseIdentifier();
    this.expectToken('::=');
    const type = this.parseType();
    return { ...type, name };
  }

  private parseType(): ParsedType {
    this.skipWhitespaceAndComments();
    let type: ParsedType;
    if (this.checkKeyword('INTEGER')) {
      type = this.parseIntegerType();
    } else if (this.checkKeyword('BOOLEAN')) {
      type = this.parseBooleanType();
    } else if (this.checkKeyword('OCTET')) {
      type = this.parseOctetStringType();
    } else if (this.checkKeyword('SEQUENCE')) {
      type = this.parseSequenceType();
    } else if (this.checkKeyword('CHOICE')) {
      type = this.parseChoiceType();
    } else if (this.checkKeyword('ENUMERATED')) {
      type = this.parseEnumeratedType();
    } else if (this.checkKeyword('NULL')) {
      type = this.parseNullType();
    } else {
      // Handle defined types (references to other types)
      this.skipWhitespaceAndComments();
      if (!this.isAlpha(this.peek())) {
        this.error('Expected type reference (identifier)');
      }
      const typeName = this.parseIdentifier();
      type = {
        name: '',
        type: 'DEFINED',
        constraints: { definedType: typeName }
      };
    }
    // After parsing any type, check for constraints
    this.skipWhitespaceAndComments();
    if (this.check('(')) {
      const constraints = this.parseConstraints();
      type = { ...type, constraints: { ...(type.constraints || {}), ...constraints } };
    }
    return type;
  }

  private parseIntegerType(): ParsedType {
    this.expectKeyword('INTEGER');
    return {
      name: '',
      type: 'INTEGER'
    };
  }

  private parseBooleanType(): ParsedType {
    this.expectKeyword('BOOLEAN');
    return {
      name: '',
      type: 'BOOLEAN'
    };
  }

  private parseOctetStringType(): ParsedType {
    this.expectKeyword('OCTET');
    this.skipWhitespaceAndComments();
    this.expectKeyword('STRING');
    return {
      name: '',
      type: 'OCTET_STRING'
    };
  }

  private parseNullType(): ParsedType {
    this.expectKeyword('NULL');
    return {
      name: '',
      type: 'NULL'
    };
  }

  private parseSequenceType(): ParsedType {
    this.expectKeyword('SEQUENCE');
    this.expectToken('{');

    const members: ParsedType[] = [];
    
    while (!this.check('}') && !this.isAtEnd()) {
      const member = this.parseSequenceMember();
      members.push(member);
      
      if (this.check(',')) {
        this.expectToken(',');
      }
    }

    this.expectToken('}');

    return {
      name: '',
      type: 'SEQUENCE',
      members
    };
  }

  private parseSequenceMember(): ParsedType {
    const name = this.parseIdentifier();
    let tag;
    this.skipWhitespaceAndComments();
    if (this.check('[')) {
      tag = this.parseTag();
      this.skipWhitespaceAndComments();
    }
    let type = this.parseType();
    let optional = false;
    let defaultValue;

    this.skipWhitespaceAndComments();
    if (this.checkKeyword('OPTIONAL')) {
      this.expectKeyword('OPTIONAL');
      optional = true;
    } else if (this.checkKeyword('DEFAULT')) {
      this.expectKeyword('DEFAULT');
      defaultValue = this.parseValue();
    }

    return {
      ...type,
      name,
      tag,
      optional,
      default: defaultValue
    };
  }

  private parseChoiceType(): ParsedType {
    this.expectKeyword('CHOICE');
    this.expectToken('{');

    const choices: ParsedType[] = [];
    
    while (!this.check('}') && !this.isAtEnd()) {
      const choice = this.parseChoiceAlternative();
      choices.push(choice);
      
      if (this.check(',')) {
        this.expectToken(',');
      }
    }

    this.expectToken('}');

    return {
      name: '',
      type: 'CHOICE',
      choices
    };
  }

  private parseChoiceAlternative(): ParsedType {
    const name = this.parseIdentifier();
    let tag;
    this.skipWhitespaceAndComments();
    if (this.check('[')) {
      tag = this.parseTag();
      this.skipWhitespaceAndComments();
    }
    let type = this.parseType();
    return {
      ...type,
      name,
      tag
    };
  }

  private parseEnumeratedType(): ParsedType {
    this.expectKeyword('ENUMERATED');
    this.expectToken('{');

    const values: Array<[string, number]> = [];
    let autoValue = 0;
    
    while (!this.check('}') && !this.isAtEnd()) {
      const name = this.parseIdentifier();
      let value = autoValue;
      
      if (this.check('(')) {
        this.expectToken('(');
        value = this.parseNumber();
        this.expectToken(')');
      }
      
      values.push([name, value]);
      autoValue = value + 1;
      
      if (this.check(',')) {
        this.expectToken(',');
      }
    }

    this.expectToken('}');

    return {
      name: '',
      type: 'ENUMERATED',
      constraints: { values }
    };
  }

  private parseTag(): number {
    this.expectToken('[');
    const tagNumber = this.parseNumber();
    this.expectToken(']');
    return tagNumber;
  }

  private parseConstraints(): any {
    this.expectToken('(');
    
    const constraints: any = {};
    
    if (this.checkKeyword('SIZE')) {
      this.expectKeyword('SIZE');
      this.expectToken('(');
      const size = this.parseNumber();
      this.expectToken(')');
      constraints.size = size;
    } else {
      // Range constraint
      const min = this.parseNumber();
      if (this.check('.')) {
        this.expectToken('.');
        this.expectToken('.');
        const max = this.parseNumber();
        constraints.range = [min, max];
      } else {
        constraints.value = min;
      }
    }
    
    this.expectToken(')');
    return constraints;
  }

  private parseValue(): any {
    this.skipWhitespaceAndComments();
    
    if (this.checkNumber()) {
      return this.parseNumber();
    }
    if (this.check('"')) {
      return this.parseString();
    }
    if (this.checkKeyword('TRUE')) {
      this.expectKeyword('TRUE');
      return true;
    }
    if (this.checkKeyword('FALSE')) {
      this.expectKeyword('FALSE');
      return false;
    }
    if (this.checkKeyword('NULL')) {
      this.expectKeyword('NULL');
      return null;
    }
    
    return this.parseIdentifier();
  }

  private parseIdentifier(): string {
    this.skipWhitespaceAndComments();
    if (!this.isAlpha(this.peek())) {
      this.error('Expected identifier');
    }
    const start = this.position;
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }
    return this.input.substring(start, this.position);
  }

  private parseNumber(): number {
    this.skipWhitespaceAndComments();
    
    let negative = false;
    if (this.check('-')) {
      negative = true;
      this.advance();
    }
    
    if (!this.isDigit(this.peek())) {
      this.error('Expected number');
    }
    
    const start = this.position;
    while (this.isDigit(this.peek())) {
      this.advance();
    }
    
    const value = parseInt(this.input.substring(start, this.position), 10);
    return negative ? -value : value;
  }

  private parseString(): string {
    this.expectToken('"');
    const start = this.position;
    
    while (!this.check('"') && !this.isAtEnd()) {
      this.advance();
    }
    
    const value = this.input.substring(start, this.position);
    this.expectToken('"');
    return value;
  }

  private skipWhitespaceAndComments(): void {
    while (true) {
      const char = this.peek();
      
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n') {
        this.line++;
        this.column = 1;
        this.advance();
      } else if (char === '-' && this.peekNext() === '-') {
        // Skip line comment
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private checkKeyword(keyword: string): boolean {
    if (this.position + keyword.length > this.input.length) {
      return false;
    }
    
    const slice = this.input.substring(this.position, this.position + keyword.length);
    const nextChar = this.position + keyword.length < this.input.length 
      ? this.input[this.position + keyword.length] 
      : ' ';
      
    return slice === keyword && !this.isAlphaNumeric(nextChar || ' ');
  }

  private expectKeyword(keyword: string): void {
    this.skipWhitespaceAndComments();
    if (!this.checkKeyword(keyword)) {
      this.error(`Expected keyword '${keyword}'`);
    }
    this.position += keyword.length;
  }

  private expectToken(token: string): void {
    this.skipWhitespaceAndComments();
    if (!this.check(token)) {
      this.error(`Expected '${token}'`);
    }
    this.position += token.length;
  }

  private check(expected: string): boolean {
    if (this.position + expected.length > this.input.length) {
      return false;
    }
    return this.input.substring(this.position, this.position + expected.length) === expected;
  }

  private checkNumber(): boolean {
    return this.isDigit(this.peek()) || (this.peek() === '-' && this.isDigit(this.peekNext()));
  }

  private advance(): string {
    if (!this.isAtEnd()) {
      this.column++;
      return this.input[this.position++] || '\0';
    }
    return '\0';
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position] || '\0';
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1] || '\0';
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private error(message: string): never {
    throw new ParseError(`${message} at line ${this.line}, column ${this.column}`);
  }
} 