const Validation = require('../../lib/core/Validation').default;
const { ValidationError } = require('../../lib/core/ValidationError');

describe('Validation', () => {
  const validSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name', 'age']
  };

  const validData = { name: 'Alice', age: 30 };
  const invalidData = { name: 'Bob' }; // Missing age

  it('should validate data against a schema object', () => {
    const validator = new Validation({}, validSchema);
    expect(() => validator.validateData(validData)).not.toThrow();
  });

  it('should throw ValidationError on invalid data', () => {
    const validator = new Validation({}, validSchema);
    expect(() => validator.validateData(invalidData)).toThrow(ValidationError);
    try {
      validator.validateData(invalidData);
    } catch (err) {
      expect(err.message).toMatch(/age/);
    }
  });

  it('should accept schema ID if schema is registered (mocked)', () => {
    const Ajv = require('ajv');
    const ajvInstance = new Ajv();

    // Register schema with ID
    const schemaId = 'http://example.com/schema';
    ajvInstance.addSchema(validSchema, schemaId);

    // Spy on Ajv and inject the schema registry
    jest.spyOn(require('ajv'), 'default').mockImplementation(() => ajvInstance);

    const validator = new Validation({}, schemaId);
    expect(() => validator.validateData(validData)).not.toThrow();
  });

  it('should throw if schema ID is not found', () => {
    expect(() => {
      new Validation({}, 'nonexistent-schema-id');
    }).toThrow(/not found/);
  });

  it('should throw for invalid schema input', () => {
    expect(() => {
      new Validation({}, 123); // not object or string
    }).toThrow(/Invalid schema/);
  });
});
