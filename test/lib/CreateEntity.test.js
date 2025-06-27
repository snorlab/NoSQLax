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

  const mockDataSource = {
    connection: {},
  };

  beforeEach(() => {
    // Clear static maps if needed
    jest.clearAllMocks();
  });

  describe('createActiveRecordEntity', () => {
    it('should create a class extending ActiveRecordEntity with expected static props', () => {
      // Mock attachDataSource
      ActiveRecordEntity.attachDataSource = jest.fn();

      const CustomEntity = createActiveRecordEntity(
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
    it('should create a class extending DataMapperEntity with correct config', () => {
      const CustomDataMapper = createDataMapperEntity(
        'ProductEntity',
        'product',
        mockSchema,
        {
          fieldMap: { name: 'name' },
          ajvOptions: { strict: false },
        }
      );

      expect(CustomDataMapper.prototype instanceof DataMapperEntity).toBe(true);
      expect(CustomDataMapper.type).toBe('product');
      expect(CustomDataMapper.schemaOrSchemaId).toBe(mockSchema);
      expect(CustomDataMapper.fieldMap).toEqual({ name: 'name' });
    });
  });
});
