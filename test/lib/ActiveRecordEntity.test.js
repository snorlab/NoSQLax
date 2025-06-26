const ActiveRecordEntity = require('../../lib/core/ActiveRecordEntity').default;

const mockFind = jest.fn();
const mockFindOne = jest.fn();
const mockFindMany = jest.fn();
const mockFindAll = jest.fn();
const mockSave = jest.fn();
const mockDelete = jest.fn();

jest.mock('../../lib/core/CreateRepository', () => {
  return () => ({
    find: mockFind,
    findOne: mockFindOne,
    findMany: mockFindMany,
    findAll: mockFindAll,
    save: mockSave,
    delete: mockDelete,
    dataSource: { connection: 'mockConnection' }
  });
});

const DataSource = require('../../lib/core/DataSource').default;

describe('ActiveRecordEntity', () => {
  let TestEntity;

  beforeEach(() => {
    jest.clearAllMocks();

    class Test extends ActiveRecordEntity {
      static type = 'test';
      static schemaOrSchemaId = {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      };
      static fieldMap = { name: 'name' };
    }

    TestEntity = Test;
    TestEntity.attachDataSource(new DataSource({
      url: 'http://localhost:5984',
      database: 'test'
    }), {});
  });

  test('should call find by ID', async () => {
    const mockResult = { id: '123', name: 'Alice' };
    mockFind.mockResolvedValueOnce(mockResult);

    const result = await TestEntity.find('123');
    expect(mockFind).toHaveBeenCalledWith('123');
    expect(result).toEqual(mockResult);
  });

  test('should call findOne with selector and options', async () => {
    const selector = { name: { $eq: 'Alice' } };
    const options = { limit: 1 };
    const mockResult = { id: 'abc', name: 'Alice' };
    mockFindOne.mockResolvedValueOnce(mockResult);

    const result = await TestEntity.findOne(selector, options);
    expect(mockFindOne).toHaveBeenCalledWith(selector, options);
    expect(result).toEqual(mockResult);
  });

  test('should call findMany with selector and options', async () => {
    const selector = { name: { $exists: true } };
    const options = { limit: 10 };
    const docs = [{ id: '1' }, { id: '2' }];
    mockFindMany.mockResolvedValueOnce(docs);

    const result = await TestEntity.findMany(selector, options);
    expect(mockFindMany).toHaveBeenCalledWith(selector, options);
    expect(result).toEqual(docs);
  });

  test('should call findAll', async () => {
    const docs = [{ id: '1' }, { id: '2' }];
    mockFindAll.mockResolvedValueOnce(docs);

    const result = await TestEntity.findAll();
    expect(mockFindAll).toHaveBeenCalled();
    expect(result).toEqual(docs);
  });

  test('should call save (instance method)', async () => {
    const entity = new TestEntity({ name: 'Alice' });
    mockSave.mockResolvedValueOnce(entity);

    const result = await entity.save();
    expect(mockSave).toHaveBeenCalledWith(entity);
    expect(result).toEqual(entity);
  });

  test('should call save (static method)', async () => {
    const entity = new TestEntity({ name: 'Bob' });
    mockSave.mockResolvedValueOnce(entity);

    const result = await TestEntity.save(entity);
    expect(mockSave).toHaveBeenCalledWith(entity);
    expect(result).toEqual(entity);
  });

  test('should call delete (instance method)', async () => {
    const entity = new TestEntity({ _id: 'id123', _rev: '1-xyz' });
    entity._id = 'id123';
    mockDelete.mockResolvedValueOnce({ message: 'deleted' });

    const result = await entity.delete();
    expect(mockDelete).toHaveBeenCalledWith('id123');
    expect(result.message).toBe('deleted');
  });

  test('should throw if deleting instance with no id', async () => {
    const entity = new TestEntity({});
    await expect(entity.delete()).rejects.toThrow('Document does not exist');
  });

  test('should call delete (static method)', async () => {
    mockDelete.mockResolvedValueOnce({ message: 'deleted' });

    const result = await TestEntity.delete('id123');
    expect(mockDelete).toHaveBeenCalledWith('id123');
    expect(result.message).toBe('deleted');
  });

  test('should expose dataSource via static getter', () => {
    const ds = TestEntity.dataSource;
    expect(ds).toEqual({ connection: 'mockConnection' });
  });

  test('should throw if repo not attached before use', async () => {
    class BrokenEntity extends ActiveRecordEntity {
      static type = 'broken';
      static schemaOrSchemaId = {};
      static fieldMap = {};
    }

    await expect(() => BrokenEntity.find('abc')).rejects.toThrow(/Repository not initialized/);
  });

  test('should support extending static methods', () => {
    const spy = jest.fn().mockReturnValue('custom-method');

    TestEntity.extend({
      custom: spy
    });

    expect(typeof TestEntity.custom).toBe('function');
    expect(TestEntity.custom()).toBe('custom-method');
  });
});
