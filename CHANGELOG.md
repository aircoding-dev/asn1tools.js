# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-07-03
- First version

### Added

#### Core Features
- **ASN.1 Parser**: Complete ASN.1 grammar parser supporting modules, type definitions, and constraints
- **BER Codec**: Full implementation of Basic Encoding Rules (BER) for encoding/decoding
- **Type System**: Support for all major ASN.1 types:
  - `INTEGER` with automatic bigint handling for large numbers
  - `BOOLEAN` for true/false values
  - `OCTET STRING` for binary data (identifiers, checksums, signatures)
  - `NULL` for null values
  - `ENUMERATED` for named value sets
  - `SEQUENCE` for structured objects
  - `SEQUENCE OF` for arrays
  - `CHOICE` for union types with context-specific tagging

#### API
- `compileFiles()` function for compiling ASN.1 schema files
- `compileString()` function for compiling ASN.1 content from strings
- `Specification` class with `encode()` and `decode()` methods
- `hexToBytes()` and `bytesToHex()` utility functions
- TypeScript type definitions for all public APIs

#### Message Processing Support
- Full support for generic message processing workflows
- Compatible with existing Python `asn1tools` implementation
- Support for various message categories:
  - System messages (`PingRequest`, `SystemInfoRequest`)
  - Data management (`DataRequest`, `SubmitRequest`)
  - Authentication messages (`LoginRequest`, `SessionRequest`)
  - Status queries and responses

#### Testing & Quality
- Comprehensive test suite with >90% coverage
- Unit tests for all ASN.1 types
- Integration tests for complete message flows
- Compatibility tests with Python implementation
- Real-world message processing scenarios
- ESLint configuration with security-focused rules
- TypeScript strict mode enabled

#### Documentation
- Complete API documentation
- Usage examples for message processing integration
- Migration guide from Python `asn1tools`
- Performance optimization guidelines
- Security considerations for production applications

#### Build & Development
- TypeScript compilation with source maps
- Jest testing framework
- ESLint for code quality
- NPM package configuration

### Security
- Input validation for all encoding/decoding operations
- Bounds checking for all array and buffer operations
- Integer overflow protection using BigInt
- No use of `eval()` or other unsafe functions
- Memory-safe TypeScript implementation

### Performance
- Optimized for high-throughput message processing scenarios
- Minimal memory allocation during encoding/decoding
- Efficient buffer handling
- Fast ASN.1 parsing with single-pass compilation
- Type caching for repeated operations

### Compatibility
- Drop-in replacement for Python `asn1tools` in TypeScript/JavaScript projects
- Same API surface as Python version
- Compatible binary output format
- Support for the same ASN.1 schema files

---

## Future Releases

### [1.1.0] - Planned
- Support for additional ASN.1 encoding rules (DER, PER, UPER)
- Advanced constraint validation
- Schema validation and error reporting
- Performance optimizations
- Browser compatibility (currently Node.js only)

### [1.2.0] - Planned
- Support for ASN.1 modules with imports/exports
- Advanced type constraints (SIZE, range validation)
- Custom tag handling
- Streaming decode for large messages

### [2.0.0] - Future
- Full ASN.1 2021 standard support
- Object Identifier (OID) support
- Real number type support
- Parameterized types
- Breaking API changes if needed for standards compliance 
