import fs from 'fs';
import path from 'path';
import { compileString } from '../src/index';

// Dynamically load every .asn schema in the ./schemas sub-folder and make
// sure the parser/compiler accepts them without throwing.
describe('Schema file compilation', () => {
  const schemaDir = path.join(__dirname, 'schemas');
  const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.asn'));

  if (schemaFiles.length === 0) {
    throw new Error('No .asn schema files found for the test.');
  }

  for (const filename of schemaFiles) {
    it(`compiles ${filename} without errors`, () => {
      const content = fs.readFileSync(path.join(schemaDir, filename), 'utf8');
      expect(() => compileString(content)).not.toThrow();
    });
  }
}); 