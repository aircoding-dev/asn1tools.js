/**
 * Example generic message processing client using asn1tools-js
 * This demonstrates message encoding/decoding capabilities
 */

import { compileString, hexToBytes, bytesToHex } from '../src/index';

/**
 * Helper function to convert large numbers to signed representation
 */
function normalizeNumber(longInt: number): number {
  if (longInt >= 0x8000_0000_0000_0000) {
    return longInt - 0x1_0000_0000_0000_0000;
  }
  return longInt;
}

/**
 * Mock network client for demonstration
 */
class MockNetworkClient {
  private mockResponses: Map<string, any> = new Map();

  // Set up mock responses for demonstration
  constructor() {
    this.mockResponses.set('systemInfoRequest', {
      systemInfoResponse: {
        messageId: 123,
        status: 0,
        serverId: 1,
        version: 1000,
        timestamp: 9999999999,
        nonce: 32
      }
    });

    this.mockResponses.set('dataRequest', {
      dataResponse: {
        messageId: 124,
        status: 0
      }
    });

    this.mockResponses.set('submitRequest', {
      submitResponse: {
        messageId: 889966,
        recordId: hexToBytes('123456789012345678'),
        status: 0
      }
    });
  }

  async connect(): Promise<void> {
    console.log('Connected to mock network service');
  }

  async sendMessage(data: Uint8Array): Promise<void> {
    console.log(`Sent message: ${bytesToHex(data)}`);
  }

  async receiveMessage(requestType: string, messageSpec: any): Promise<Uint8Array> {
    const response = this.mockResponses.get(requestType);
    if (!response) {
      throw new Error(`No mock response for ${requestType}`);
    }

    // In a real implementation, this would come from the server
    // For demo purposes, we'll encode the mock response
    return messageSpec.encode('ResponseMessage', response);
  }
}

/**
 * Create the message specification
 */
function createMessageSpec(): any {
  const genericAsn1 = `
    Messages DEFINITIONS ::= BEGIN
      SHORT ::= INTEGER (-32768..32767)
      INT ::= INTEGER (-2147483648..2147483647)
      LONG ::= INTEGER (-9223372036854775808..9223372036854775807)

      PingRequest ::= SEQUENCE {
        messageId LONG
      }

      PingResponse ::= SEQUENCE {
        messageId LONG,
        status INT
      }

      SystemInfoRequest ::= SEQUENCE {
        messageId LONG
      }

      SystemInfoResponse ::= SEQUENCE {
        messageId LONG,
        status INT,
        serverId INT,
        version INT,
        timestamp LONG,
        nonce SHORT
      }

      DataRequest ::= SEQUENCE {
        messageId LONG,
        version INT,
        category SHORT,
        size LONG,
        identifier OCTET STRING(SIZE(20)),
        checksum OCTET STRING(SIZE(32))
      }

      DataResponse ::= SEQUENCE {
        messageId LONG,
        status INT
      }

      SubmitRequest ::= SEQUENCE {
        messageId LONG,
        deadline INT,
        type SHORT,
        priority BOOLEAN,
        value LONG,
        count LONG,
        userId OCTET STRING(SIZE(20)),
        signature OCTET STRING(SIZE(33))
      }

      SubmitResponse ::= SEQUENCE {
        messageId LONG,
        recordId OCTET STRING(SIZE(18)),
        status INT
      }

      RequestMessage ::= CHOICE {
        pingRequest [1] PingRequest,
        systemInfoRequest [4] SystemInfoRequest,
        dataRequest [6] DataRequest,
        submitRequest [14] SubmitRequest
      }

      ResponseMessage ::= CHOICE {
        pingResponse [1] PingResponse,
        systemInfoResponse [4] SystemInfoResponse,
        dataResponse [6] DataResponse,
        submitResponse [14] SubmitResponse
      }
    END
  `;

  return compileString(genericAsn1);
}

/**
 * Main example function demonstrating the message processing client
 */
async function main(): Promise<void> {
  console.log('Starting ASN.1 Message Processing Client Example...');

  try {
    // Compile the ASN.1 message definitions
    console.log('Compiling ASN.1 schema...');
    const messageSpec = createMessageSpec();

    // Create mock network client
    const networkClient = new MockNetworkClient();
    await networkClient.connect();

    // 1. System Info Request
    console.log('\n--- System Info Request ---');
    const systemInfoRequest = {
      messageId: 123
    };

    const systemInfoMessage = {
      systemInfoRequest
    };

    const encodedSystemInfo = messageSpec.encode('RequestMessage', systemInfoMessage);
    console.log(`Encoded request: ${bytesToHex(encodedSystemInfo)}`);

    await networkClient.sendMessage(encodedSystemInfo);
    const systemInfoResponseData = await networkClient.receiveMessage('systemInfoRequest', messageSpec);
    
    const systemInfoResponse = messageSpec.decode('ResponseMessage', systemInfoResponseData);
    console.log('System Info Response:', systemInfoResponse);

    const serverId = systemInfoResponse.systemInfoResponse.serverId;
    console.log(`Server ID: ${serverId}`);

    // 2. Data Request
    console.log('\n--- Data Request ---');
    const dataRequest = {
      messageId: 124,
      version: 0,
      category: 1,
      size: 1000,
      identifier: hexToBytes('973539beb5008a29ca866b178ce99f2782b5e39a'),
      checksum: hexToBytes('2c8a0426b8a6cf115894cd81135c08fea8f611dfe365bd543dc9443043fea187')
    };

    const dataMessage = {
      dataRequest
    };

    const encodedData = messageSpec.encode('RequestMessage', dataMessage);
    console.log(`Encoded data request: ${bytesToHex(encodedData)}`);

    await networkClient.sendMessage(encodedData);
    const dataResponseData = await networkClient.receiveMessage('dataRequest', messageSpec);
    
    const dataResponse = messageSpec.decode('ResponseMessage', dataResponseData);
    console.log('Data Response:', dataResponse);

    // 3. Submit Request
    console.log('\n--- Submit Request ---');
    const messageId = normalizeNumber((serverId << 52) + 889966);
    console.log(`Calculated message ID: ${messageId}`);

    const submitRequest = {
      messageId,
      deadline: 99,
      type: 1,
      priority: false,
      value: 100,
      count: 10,
      userId: hexToBytes('973539beb5008a29ca866b178ce99f2782b5e39a'),
      signature: hexToBytes('3df5d272230f8d815f21064622fc7951a73adcca4789b143a8ed7c8a4e013b7366')
    };

    const submitMessage = {
      submitRequest
    };

    const encodedSubmit = messageSpec.encode('RequestMessage', submitMessage);
    console.log(`Encoded submit request: ${bytesToHex(encodedSubmit)}`);

    await networkClient.sendMessage(encodedSubmit);
    const submitResponseData = await networkClient.receiveMessage('submitRequest', messageSpec);
    
    const submitResponse = messageSpec.decode('ResponseMessage', submitResponseData);
    console.log('Submit Response:', submitResponse);
    console.log(`Record ID: ${bytesToHex(submitResponse.submitResponse.recordId)}`);

    // 4. Ping Request
    console.log('\n--- Ping Request ---');
    const pingRequest = {
      messageId: 125
    };

    const pingMessage = {
      pingRequest
    };

    const encodedPing = messageSpec.encode('RequestMessage', pingMessage);
    console.log(`Encoded ping: ${bytesToHex(encodedPing)}`);

    console.log('\n--- Example completed successfully! ---');

  } catch (error) {
    console.error('Error in message processing client example:', error);
    process.exit(1);
  }
}

/**
 * Utility function to demonstrate hex/binary data handling
 */
function demonstrateDataHandling(): void {
  console.log('\n--- Data Handling Examples ---');

  // Working with identifiers (20 bytes)
  const identifier = '973539beb5008a29ca866b178ce99f2782b5e39a';
  const identifierBytes = hexToBytes(identifier);
  console.log(`Identifier: ${identifier}`);
  console.log(`Identifier bytes length: ${identifierBytes.length}`);
  console.log(`Identifier bytes: [${Array.from(identifierBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);

  // Working with checksums (32 bytes)
  const checksum = '2c8a0426b8a6cf115894cd81135c08fea8f611dfe365bd543dc9443043fea187';
  const checksumBytes = hexToBytes(checksum);
  console.log(`\nChecksum: ${checksum}`);
  console.log(`Checksum bytes length: ${checksumBytes.length}`);
  console.log(`Converted back: ${bytesToHex(checksumBytes)}`);

  // Working with large numbers
  const largeValue = BigInt('1000000000000000000');
  console.log(`\nLarge value: ${largeValue}`);
  console.log(`As number (if safe): ${Number(largeValue)}`);
}

/**
 * Performance test function
 */
function performanceTest(): void {
  console.log('\n--- Performance Test ---');

  const iterations = 1000;
  const testData = hexToBytes('973539beb5008a29ca866b178ce99f2782b5e39a'.repeat(10));

  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const hex = bytesToHex(testData);
    const bytes = hexToBytes(hex);
    // Verify round-trip
    if (bytes.length !== testData.length) {
      throw new Error('Round-trip failed');
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  const opsPerSecond = (iterations * 2) / (duration / 1000); // 2 ops per iteration

  console.log(`Completed ${iterations} round-trips in ${duration}ms`);
  console.log(`Performance: ${opsPerSecond.toFixed(0)} operations/second`);
}

// Run the example if this file is executed directly
if (require.main === module) {
  demonstrateDataHandling();
  performanceTest();
  main().catch(console.error);
} 