const { default: DataMapperEntity } = require('../../lib/core/DataMapperEntity');

const createRepository = require('../../lib/core/CreateRepository').default;
const CouchRepository = require('../../lib/core/CouchRepository').default;
const BaseEntity = require('../../lib/core/BaseEntity').default;

// Mock DataSource
const mockDataSource = {
  connection: {},
};

// Dummy EntityClass
class FakeEntity extends DataMapperEntity {
  static type = 'fake';
  static schemaOrSchemaId = {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
  };
  static fieldMap = { name: 'name', type: 'type' };
}

describe('createRepository', () => {
  it('should return a CouchRepository instance configured with entityClass', () => {
    const repo = createRepository(FakeEntity, mockDataSource, {
      ajvOptions: { allErrors: true },
    });

    expect(repo).toBeInstanceOf(CouchRepository);
    expect(repo.dataSource).toEqual(mockDataSource);
  });

  it('should attach custom methods if provided', () => {
    const customMethods = {
      findByName: jest.fn(() => 'mocked'),
    };

    const repo = createRepository(FakeEntity, mockDataSource, {
      methods: customMethods,
    });

    expect(typeof repo.findByName).toBe('function');
    expect(repo.findByName()).toBe('mocked');
  });
});
