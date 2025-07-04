/**
 * ASN.1 Tools for TypeScript/JavaScript
 * Main entry point providing the public API
 */

import * as fs from 'fs';
import { Asn1Parser } from './parser';
import { Asn1Compiler, Specification } from './compiler';
import { CompileOptions, CompileError } from './types';

export * from './types';
export { Specification } from './compiler';

/**
 * Compile ASN.1 files into a specification object
 * 
 * @param filenames Array of ASN.1 file paths to compile
 * @param options Compilation options
 * @returns Compiled specification object
 * 
 * @example
 * ```typescript
 * import { compileFiles } from 'asn1tools-js';
 * 
 * const spec = compileFiles(['messages.asn']);
 * const encoded = spec.encode('MessageRequest', data);
 * const decoded = spec.decode('MessageResponse', encoded);
 * ```
 */
export function compileFiles(filenames: string[], options: CompileOptions = {}): Specification {
  // Suppress unused parameter warning for now - options will be used in future versions
  void options;
  
  if (filenames.length === 0) {
    throw new CompileError('No files provided');
  }

  const contents: string[] = [];
  
  for (const filename of filenames) {
    if (!fs.existsSync(filename)) {
      throw new CompileError(`File not found: ${filename}`);
    }
    
    try {
      const content = fs.readFileSync(filename, 'utf-8');
      contents.push(content);
    } catch (error) {
      throw new CompileError(`Failed to read file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return compileString(contents.join('\n\n'));
}

/**
 * Compile ASN.1 string content into a specification object
 * 
 * @param content ASN.1 content as string
 * @param options Compilation options
 * @returns Compiled specification object
 */
export function compileString(content: string, options: CompileOptions = {}): Specification {
  // Suppress unused parameter warning for now - options will be used in future versions
  void options;
  
  try {
    const parser = new Asn1Parser();
    const parsedModules = parser.parse(content);
    
    const compiler = new Asn1Compiler();
    const specification = compiler.compile(parsedModules);
    
    return new Specification(specification);
  } catch (error) {
    if (error instanceof CompileError) {
      throw error;
    }
    throw new CompileError(`Compilation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Utility function to convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  
  return bytes;
}

/**
 * Utility function to convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Default export providing same interface as Python asn1tools
 */
export default {
  compileFiles,
  compileString,
  hexToBytes,
  bytesToHex,
  Specification
}; 