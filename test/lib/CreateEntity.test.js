const { createActiveRecordEntity, createDataMapperEntity } = require('../../lib/core/CreateEntity');
const ActiveRecordEntity = require('../../lib/core/ActiveRecordEntity').default;
const DataMapperEntity = require('../../lib/core/DataMapperEntity').default;
const DataSource = require('../../lib/core/DataSource').default;

describe('Entity Creation Utilities', () => {
  const mockSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
  };

  const mockSchema2 = {
    type: 'object',
    definitions: {
      prop: {
        type: 'object', properties: {
          name: { type: 'string' },
        }
      }
    },
    oneOf: [
      {
        properties: {
          prop: {
            "$ref": "#/definitions/prop"
          }
        }
      }
    ]
  };

  const mockDataSource = {
    connection: {},
  };

  beforeEach(() => {
    // Clear static maps if needed
    jest.clearAllMocks();
  });

  describe('createActiveRecordEntity', () => {
    it('should create a class extending ActiveRecordEntity with expected static props', async () => {
      // Mock attachDataSource
      ActiveRecordEntity.attachDataSource = jest.fn();

      const CustomEntity = await createActiveRecordEntity(
        'UserEntity',
        'user',
        mockSchema,
        mockDataSource,
        {
          fieldMap: { name: 'name' },
          ajvOptions: { allErrors: true },
          methods: {
            findByName(name) {
              return `Found: ${name}`;
            },
          },
        }
      );

      expect(CustomEntity.prototype instanceof ActiveRecordEntity).toBe(true);
      expect(CustomEntity.type).toBe('user');
      expect(CustomEntity.schemaOrSchemaId).toBe(mockSchema);
      expect(CustomEntity.fieldMap).toEqual({ name: 'name' });

      // Test that custom static method was attached
      expect(CustomEntity.findByName('Alice')).toBe('Found: Alice');

      // Test attachDataSource was called
      expect(ActiveRecordEntity.attachDataSource).toHaveBeenCalledWith(mockDataSource, { allErrors: true });
    });
  });

  describe('createDataMapperEntity', () => {
    it('should create a class extending DataMapperEntity with correct config', async () => {
      const CustomDataMapper = await createDataMapperEntity(
        'ProductEntity',
        'product',
        mockSchema2,
        {
          fieldMap: { name: 'prop.name' },
          ajvOptions: { strict: false },
        }
      );

      const entity = new CustomDataMapper({name: "Test"});

      expect(CustomDataMapper.prototype instanceof DataMapperEntity).toBe(true);
      expect(CustomDataMapper.type).toBe('product');
      expect(CustomDataMapper.schemaOrSchemaId).toBe(mockSchema2);
      expect(CustomDataMapper.fieldMap).toEqual({ name: 'prop.name' });
      expect(entity.name).toBe("Test")
      
      expect(() => {
        entity.name = 123;
      }).toThrow('Validation failed for "name":');
      

    });
  });
});
