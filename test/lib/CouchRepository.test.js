const CouchRepository = require('../../lib/core/CouchRepository').default;
const DataSource = require('../../lib/core/DataSource').default;
const ActiveRecordEntity = require('../../lib/core/ActiveRecordEntity').default;
const { DocumentNotFoundError } = require('../../lib/core/DocumentNotFoundError');

// Mock external dependencies
jest.mock('../../lib/core/Validation', () => {
    return jest.fn().mockImplementation(() => ({
        validateData: jest.fn()
    }));
});

const mockInsert = jest.fn();
const mockFind = jest.fn();
const mockDestroy = jest.fn();

jest.mock('../../lib/core/DataSource', () => {
    return {
        __esModule: true, // ensures .default works
        default: jest.fn().mockImplementation(() => ({
            connection: {
                insert: jest.fn(),
                find: jest.fn(),
                destroy: jest.fn()
            }
        }))
    };
});

describe('CouchRepository (JS test)', () => {
    let repo;

    class TestEntity extends ActiveRecordEntity {
        static type = 'test';
        static schemaOrSchemaId = {
            type: 'object',
            properties: {
                name: { type: 'string' },
                nested: {
                    type: 'object',
                    properties: {
                        city: { type: 'string' }
                    }
                }
            },
            required: ['name']
        };
        static fieldMap = {
            name: 'name',
            city: 'nested.city'
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        const ds = new DataSource({ url: 'http://localhost', database: 'test' });
        repo = new CouchRepository(ds, {}, TestEntity);
    });

    test('findOne returns an entity', async () => {
        mockFind.mockResolvedValueOnce({ docs: [{ _id: '1', name: 'Alice', nested: { city: 'Paris' } }] });

        const result = await repo.findOne({ name: { $eq: 'Alice' } });

        expect(result).toBeInstanceOf(TestEntity);
        expect(result.getName()).toBe('Alice');
        expect(result.getCity()).toBe('Paris');
    });

    test('findOne throws when no docs found', async () => {
        mockFind.mockResolvedValueOnce({ docs: [] });

        await expect(repo.findOne({ name: 'Missing' })).rejects.toThrow(DocumentNotFoundError);
    });

    test('findMany returns multiple entities', async () => {
        mockFind.mockResolvedValueOnce({
            docs: [
                { _id: '1', name: 'Alice', nested: { city: 'Paris' } },
                { _id: '2', name: 'Bob', nested: { city: 'Berlin' } }
            ]
        });

        const result = await repo.findMany({});

        expect(result.length).toBe(2);
        expect(result[0]).toBeInstanceOf(TestEntity);
    });

    test('save inserts new document', async () => {
        const entity = new TestEntity({ name: 'Alice', city: 'Paris' });

        mockInsert.mockResolvedValueOnce({ id: 'abc', rev: '1-x' });
        mockFind.mockResolvedValueOnce({ docs: [{ _id: 'abc', name: 'Alice', nested: { city: 'Paris' } }] });

        const saved = await repo.save(entity);

        expect(mockInsert).toHaveBeenCalled();
        expect(saved.getCity()).toBe('Paris');
    });

    test('delete removes document', async () => {
        const mockEntity = new TestEntity({ _id: 'del-id', _rev: '1-x', name: 'T', city: 'Z' });

        mockFind.mockResolvedValueOnce(mockEntity);
        mockDestroy.mockResolvedValueOnce({ ok: true });

        const result = await repo.delete('del-id');

        expect(result).toEqual({ message: 'Document deleted successfully' });
        expect(mockDestroy).toHaveBeenCalledWith('del-id', '1-x');
    });

    test('getFieldNameFromFieldMap returns correct value', () => {
        const map = { city: 'nested.city' };

        const field = CouchRepository.getFieldNameFromFieldMap(map, 'city');
        expect(field).toBe('nested.city');

        const defaultField = CouchRepository.getFieldNameFromFieldMap(map, 'unknown');
        expect(defaultField).toBe('unknown');
    });
});
