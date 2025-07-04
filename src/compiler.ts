/**
 * ASN.1 compiler - converts parsed types into executable type objects
 */

import { Asn1Type, Asn1Specification, Asn1Module, ParsedType, ParsedModule, CompileError } from './types';
import { 
  IntegerType, 
  BooleanType, 
  OctetStringType, 
  NullType, 
  EnumeratedType 
} from './ber/types';
import { 
  SequenceType, 
  SequenceOfType, 
  ChoiceType 
} from './ber/complex-types';

export class Asn1Compiler {
  private modules: Map<string, Asn1Module> = new Map();
  private globalTypes: Map<string, Asn1Type> = new Map();
  private resolving: Set<string> = new Set(); // For circular reference detection

  compile(parsedModules: ParsedModule[]): Asn1Specification {
    this.modules.clear();
    this.globalTypes.clear();
    this.resolving.clear();

    // First pass: create all modules and collect type names
    for (const parsedModule of parsedModules) {
      const module: Asn1Module = {
        name: parsedModule.name,
        types: new Map()
      };
      this.modules.set(parsedModule.name, module);
    }

    // Second pass: compile all types
    for (const parsedModule of parsedModules) {
      const module = this.modules.get(parsedModule.name);
      if (!module) {
        throw new CompileError(`Module ${parsedModule.name} not found`);
      }

      for (const [typeName, parsedType] of parsedModule.types) {
        const compiledType = this.compileType(parsedType, parsedModule.name);
        module.types.set(typeName, compiledType);
        
        // Add to global types if unique
        if (this.globalTypes.has(typeName)) {
          // Type name collision - remove from global types
          this.globalTypes.delete(typeName);
        } else {
          this.globalTypes.set(typeName, compiledType);
        }
      }
    }

    return {
      modules: this.modules,
      types: this.globalTypes
    };
  }

  private compileType(parsedType: ParsedType, moduleName: string): Asn1Type {
    const typeName = parsedType.name || 'Anonymous';
    const fullName = `${moduleName}.${typeName}`;

    // Detect circular references
    if (this.resolving.has(fullName)) {
      throw new CompileError(`Circular reference detected for type ${fullName}`);
    }

    try {
      this.resolving.add(fullName);
      return this.compileTypeInternal(parsedType, moduleName);
    } finally {
      this.resolving.delete(fullName);
    }
  }

  private compileTypeInternal(parsedType: ParsedType, moduleName: string): Asn1Type {
    const typeName = parsedType.name || 'Anonymous';

    switch (parsedType.type) {
      case 'INTEGER':
        return this.compileIntegerType(typeName);
      
      case 'BOOLEAN':
        return new BooleanType(typeName);
      
      case 'OCTET_STRING':
        return this.compileOctetStringType(typeName);
      
      case 'NULL':
        return new NullType(typeName);
      
      case 'ENUMERATED':
        return this.compileEnumeratedType(typeName, parsedType);
      
      case 'SEQUENCE':
        return this.compileSequenceType(typeName, parsedType, moduleName);
      
      case 'SEQUENCE_OF':
        return this.compileSequenceOfType(typeName, parsedType, moduleName);
      
      case 'CHOICE':
        return this.compileChoiceType(typeName, parsedType, moduleName);
      
      case 'DEFINED':
        return this.resolveDefinedType(typeName, parsedType, moduleName);
      
      default:
        throw new CompileError(`Unsupported type: ${parsedType.type} for ${typeName}`);
    }
  }

  private compileIntegerType(typeName: string): Asn1Type {
    // For now, just create a basic integer type
    // TODO: Add range constraint validation
    return new IntegerType(typeName);
  }

  private compileOctetStringType(typeName: string): Asn1Type {
    // For now, just create a basic octet string type
    // TODO: Add size constraint validation
    return new OctetStringType(typeName);
  }

  private compileEnumeratedType(typeName: string, parsedType: ParsedType): Asn1Type {
    if (!parsedType.constraints?.values) {
      throw new CompileError(`ENUMERATED type ${typeName} missing values`);
    }

    return new EnumeratedType(typeName, parsedType.constraints.values);
  }

  private compileSequenceType(typeName: string, parsedType: ParsedType, moduleName: string): Asn1Type {
    if (!parsedType.members) {
      throw new CompileError(`SEQUENCE type ${typeName} missing members`);
    }

    const members = parsedType.members.map(member => {
      const memberObj: any = {
        name: member.name,
        type: this.compileType(member, moduleName)
      };
      
      if (member.optional !== undefined) {
        memberObj.optional = member.optional;
      }
      
      if (member.default !== undefined) {
        memberObj.defaultValue = member.default;
      }
      
      return memberObj;
    });

    return new SequenceType(typeName, members);
  }

  private compileSequenceOfType(typeName: string, parsedType: ParsedType, moduleName: string): Asn1Type {
    if (!parsedType.elementType) {
      throw new CompileError(`SEQUENCE OF type ${typeName} missing element type`);
    }

    const elementType = this.compileType(parsedType.elementType, moduleName);
    return new SequenceOfType(typeName, elementType);
  }

  private compileChoiceType(typeName: string, parsedType: ParsedType, moduleName: string): Asn1Type {
    if (!parsedType.choices) {
      throw new CompileError(`CHOICE type ${typeName} missing choices`);
    }

    const choices = parsedType.choices.map(choice => {
      const choiceObj: any = {
        name: choice.name,
        type: this.compileType(choice, moduleName)
      };
      
      if (choice.tag !== undefined) {
        choiceObj.tag = choice.tag;
      }
      
      return choiceObj;
    });

    return new ChoiceType(typeName, choices);
  }

  private resolveDefinedType(typeName: string, parsedType: ParsedType, moduleName: string): Asn1Type {
    const definedTypeName = parsedType.constraints?.definedType;
    if (!definedTypeName) {
      throw new CompileError(`Defined type ${typeName} missing reference`);
    }

    // First try to find in current module
    const currentModule = this.modules.get(moduleName);
    if (currentModule) {
      const typeInModule = currentModule.types.get(definedTypeName);
      if (typeInModule) {
        return typeInModule;
      }
    }

    // Then try global types
    const globalType = this.globalTypes.get(definedTypeName);
    if (globalType) {
      return globalType;
    }

    // Try to find the parsed type and compile it
    // Note: This is simplified - a full implementation would need better resolution
    throw new CompileError(`Undefined type reference: ${definedTypeName} in ${typeName}`);
  }
}

/**
 * Specification class that provides the main API
 */
export class Specification {
  private modules: Map<string, Asn1Module>;
  private types: Map<string, Asn1Type>;

  constructor(specification: Asn1Specification) {
    this.modules = specification.modules;
    this.types = specification.types;
  }

  /**
   * Encode a value using the specified type
   */
  encode(typeName: string, value: any): Uint8Array {
    const type = this.types.get(typeName);
    if (!type) {
      throw new CompileError(`Type '${typeName}' not found`);
    }

    return type.encode(value);
  }

  /**
   * Decode data using the specified type
   */
  decode(typeName: string, data: Uint8Array): any {
    const type = this.types.get(typeName);
    if (!type) {
      throw new CompileError(`Type '${typeName}' not found`);
    }

    const result = type.decode(data, 0);
    return result.value;
  }

  /**
   * Get available type names
   */
  getTypeNames(): string[] {
    return Array.from(this.types.keys());
  }

  /**
   * Get available module names
   */
  getModuleNames(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Get types from a specific module
   */
  getModuleTypes(moduleName: string): string[] {
    const module = this.modules.get(moduleName);
    if (!module) {
      throw new CompileError(`Module '${moduleName}' not found`);
    }
    return Array.from(module.types.keys());
  }
} 