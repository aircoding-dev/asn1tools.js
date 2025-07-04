# ASN.1 Tools for TypeScript/JavaScript

A TypeScript implementation of ASN.1 (Abstract Syntax Notation One) encoding and decoding library, designed to be compatible with the Python `asn1tools` library. This library provides comprehensive support for message encoding/decoding in distributed systems and network protocols.

## 🚀 Features

- **Full TypeScript Support**: Written entirely in TypeScript with complete type definitions
- **BER Encoding**: Implements Basic Encoding Rules (BER) for ASN.1 encoding/decoding
- **Python Compatibility**: API designed to match Python `asn1tools` for easy migration
- **High Performance**: Optimized for high-throughput message processing
- **Comprehensive Testing**: Extensive test coverage for reliability
- **Security Focused**: Built with security and reliability in mind for production applications

## 📦 Installation

```bash
npm install asn1tools-js
```

## 🔧 Quick Start

### Basic Usage

```typescript
import { compileString } from 'asn1tools-js';

// Define ASN.1 schema
const asn1Schema = `
  Messages DEFINITIONS ::= BEGIN
    DataRequest ::= SEQUENCE {
      messageId INTEGER,
      version INTEGER,
      category INTEGER,
      size INTEGER
    }
  END
`;

// Compile the schema
const spec = compileString(asn1Schema);

// Encode a message
const messageData = {
  messageId: 123,
  version: 1,
  category: 2,
  size: 500
};
const encoded = spec.encode('DataRequest', messageData);

// Decode a message
const decoded = spec.decode('DataRequest', encoded);
console.log(decoded); // Original message data
```

### Working with Binary Data

```typescript
import { hexToBytes, bytesToHex } from 'asn1tools-js';

// Convert hex string to bytes (for identifiers, checksums, etc.)
const identifier = hexToBytes('973539beb5008a29ca866b178ce99f2782b5e39a');
const checksum = hexToBytes('2c8a0426b8a6cf115894cd81135c08fea8f611dfe365bd543dc9443043fea187');

// Convert bytes back to hex
const hexString = bytesToHex(identifier);
```

## 🏗️ Architecture

The library consists of several key components:

### Core Components

- **Parser**: Parses ASN.1 schema definitions
- **Compiler**: Converts parsed schemas into executable type objects
- **BER Codec**: Implements Basic Encoding Rules for encoding/decoding
- **Type System**: Supports all major ASN.1 types

### Supported ASN.1 Types

| ASN.1 Type | TypeScript Mapping | Description |
|------------|-------------------|-------------|
| `INTEGER` | `number \| bigint` | Signed integers with automatic bigint handling |
| `BOOLEAN` | `boolean` | True/false values |
| `OCTET STRING` | `Uint8Array` | Binary data, identifiers, checksums |
| `NULL` | `null` | Null values |
| `ENUMERATED` | `string` | Named enumeration values |
| `SEQUENCE` | `object` | Structured data objects |
| `SEQUENCE OF` | `Array<T>` | Arrays of elements |
| `CHOICE` | `object` | Union types with single active member |

## 📋 API Reference

### Main Functions

#### `compileFiles(filenames: string[], options?: CompileOptions): Specification`

Compiles ASN.1 files into a specification object.

```typescript
const spec = compileFiles(['messages.asn', 'types.asn']);
```

#### `compileString(content: string, options?: CompileOptions): Specification`

Compiles ASN.1 content from a string.

```typescript
const asnContent = `
  MyModule DEFINITIONS ::= BEGIN
    MyMessage ::= SEQUENCE {
      id INTEGER,
      data OCTET STRING
    }
  END
`;
const spec = compileString(asnContent);
```

### Specification Methods

#### `encode(typeName: string, value: any): Uint8Array`

Encodes a value using the specified type.

#### `decode(typeName: string, data: Uint8Array): any`

Decodes binary data using the specified type.

#### `getTypeNames(): string[]`

Returns all available type names.

#### `getModuleNames(): string[]`

Returns all available module names.

## 🔄 Message Processing

This library is designed for reliable message processing in distributed systems. Here's how it's typically used:

### Message Flow

1. **Client** encodes application messages into ASN.1 binary format
2. **Transport** layer carries the binary-encoded messages
3. **Server** decodes and processes the messages
4. **Responses** are encoded by the server and decoded by the client

### Example: Generic Message Processing

```typescript
// Define message schema
const messageSchema = `
  Messages DEFINITIONS ::= BEGIN
    RequestMessage ::= CHOICE {
      pingRequest [1] PingRequest,
      dataRequest [2] DataRequest
    }
    
    PingRequest ::= SEQUENCE {
      messageId INTEGER
    }
    
    DataRequest ::= SEQUENCE {
      messageId INTEGER,
      category INTEGER,
      size INTEGER,
      identifier OCTET STRING(SIZE(20))
    }
  END
`;

const spec = compileString(messageSchema);

// Client encoding
const dataRequest = {
  messageId: 12345,
  category: 1,
  size: 1000,
  identifier: hexToBytes('973539beb5008a29ca866b178ce99f2782b5e39a')
};

const requestMessage = {
  dataRequest: dataRequest
};

const encoded = spec.encode('RequestMessage', requestMessage);
// Send encoded over network...
```

### Message Types

The library supports various message categories:

- **System Messages**: `PingRequest`, `SystemInfoRequest`
- **Data Management**: `DataRequest`, `SubmitRequest`
- **Authentication**: `LoginRequest`, `SessionRequest`
- **Status Queries**: Various status and info requests

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

The library includes comprehensive tests:

- **Unit Tests**: Individual type encoding/decoding
- **Integration Tests**: Full message compilation and processing
- **Compatibility Tests**: Ensuring compatibility with Python implementation
- **Real-world Tests**: Complex message processing scenarios

## 🔍 Example: Complete Message Processing

```typescript
import { compileString, hexToBytes, bytesToHex } from 'asn1tools-js';

// Load message definitions
const spec = compileString(messageSchema);

// Process a system info request
const systemInfoRequest = {
  messageId: 123
};

// Encode the request
const encoded = spec.encode('RequestMessage', {
  systemInfoRequest: systemInfoRequest
});

console.log('Encoded message:', bytesToHex(encoded));

// Simulate server response
const systemResponse = {
  messageId: 123,
  status: 0,
  serverId: 1,
  version: 1000,
  timestamp: Date.now(),
  nonce: 32
};

const responseEncoded = spec.encode('ResponseMessage', {
  systemInfoResponse: systemResponse
});

// Decode the response
const decoded = spec.decode('ResponseMessage', responseEncoded);
console.log('Decoded response:', decoded);
```

## 🚨 Security Considerations

This library is designed for production use with security in mind:

- **Input Validation**: All inputs are validated before processing
- **Memory Safety**: TypeScript provides compile-time safety
- **No Dynamic Evaluation**: No use of `eval()` or similar unsafe functions
- **Bounds Checking**: All array and buffer accesses are bounds-checked
- **Integer Overflow Protection**: Automatic handling of large integers using BigInt

## 📈 Performance

The library is optimized for high-throughput scenarios:

- **Zero-Copy Operations**: Minimal data copying during encoding/decoding
- **Efficient Memory Usage**: Reuses buffers where possible
- **Fast Parsing**: Optimized ASN.1 parser
- **Type Caching**: Compiled types are cached for repeated use

## 🤝 Contributing

We welcome contributions! Please feel free to submit issues and enhancement requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related Projects

- [asn1tools](https://github.com/eerimoq/asn1tools) - Python ASN.1 library (inspiration for this project)
- [asn1js](https://github.com/PeculiarVentures/ASN1.js) - Alternative JavaScript ASN.1 implementation 