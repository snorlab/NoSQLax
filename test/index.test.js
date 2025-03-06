/**
* @jest-environment node
*/

import { jest } from '@jest/globals';

import CouchRepository from '../lib/core/CouchRepository';
import DataMapperEntity from '../lib/core/DataMapperEntity';
import ActiveRecordEntity from '../lib/core/ActiveRecordEntity';
import DataSource from '../lib/core/DataSource';
import createActiveRecordEntity from '../lib/core/CreateActiveRecordEntity'


/* jest.mock('nano', () => jest.fn(() => ({
    use: jest.fn().mockReturnValue({
        insert: jest.fn(),
        find: jest.fn(),
        destroy: jest.fn(),
        view: jest.fn(),
    }),
})));
 */
// Define mockConnection globally
const mockConnection = {
    insert: jest.fn(),
    find: jest.fn(),
    destroy: jest.fn(),
    view: jest.fn(),
    use: jest.fn(() => mockConnection), // Ensure nested `use` calls return the mock
};

// Mock the nano library to return mockConnection
jest.mock('nano', () => jest.fn(() => ({
    use: jest.fn(() => mockConnection),
})));


const schema = {
    $id: "schema1",
    type: 'object',
    properties: {
        doctype: {
            "type": "string"
        },
        name_field: { type: 'string' },
        age: { type: 'number' },
        address: {
            type: 'object',
            properties: {
                city: {
                    'type': 'string'
                }
            },
            additionalProperties: false
        }
    },
    additionalProperties: false,
    required: ['name_field', 'age', 'address'],
}

const fieldMap = {
    name: 'name_field',
    city: 'address.city',
    type: 'doctype',
    age: 'age'
};



describe('NoSQLax Testing Suite', () => {

    const dataSource = new DataSource({
        url: 'http://localhost:5984',
        database: 'test-db',
    });

    // Creating the entity class with mandatory `schemaOrSchemaId`, and `dataSource`
    const TestEntity = createActiveRecordEntity(
        "TestEntity",
        "TestEntity",
        schema,
        dataSource,
        {
        fieldMap: fieldMap, 
        ajvOptions: { }, 
        methods: { // methods
            async findOrFailByAgeGreaterThanAndbByNameAndByCity(age, name, city) {
                return await this.findOne({ name: { $eq: name }, age: { $gte: age }, city: { $eq: city } })
            }
        }
    });

    // Now you can call the `extend` method to add more methods dynamically
    TestEntity.extend({
        async getAllByAgeGreaterThanAndbByNameAndByCity(age, name, city) {
            return await this.findMany({ "$and": [{ "$or": [{ name: { $eq: name } }] }, { "$not": { age: { $lt: age } } }], city: { $beginsWith: city } })
        },

        async getViewA(options) {
            return await this.dataSource.connection.view('design', 'view', options)
        }
    });

    class TestEntitySchemaId extends ActiveRecordEntity {

        static type = 'TestEntity';

        static schemaOrSchemaId = "schema1";

        static fieldMap = fieldMap;

        name;
        age;
        city;

        constructor(data) {
            super(data);
            this.name = data.name;
            this.age = data.age;
            this.city = data.city;
        }


        static async findOrFailByAgeGreaterThanAndbByNameAndByCity(age, name, city) {
            return await this.findOne({ name: { $eq: name }, age: { $gte: age }, city: { $eq: city } })
        }

        static async getAllByAgeGreaterThanAndbByNameAndByCity(age, name, city) {
            return await this.findMany({ "$and": [{ "$or": [{ name: { $eq: name } }] }, { "$not": { age: { $lt: age } } }], city: { $beginsWith: city } })
        }

        static async getViewA(options) {
            return await this.dataSource.connection.view('design', 'view', options)
        }
    };




    class TestService {

        async save(testEntity) {
            return await testEntity.save();
        }

        static async save(testEntity) {
            return await TestEntity.save(testEntity);
        }

        // async findUserByName(name) {
        //   return await this.userRepository.findByName(name);
        // }

        // async findUserByEmailName(email, name) {
        //   return await this.userRepository.findByEmailName(email, name);
        // }

        async getEntityById(id) {
            // Fetch a user by ID
            return await TestEntity.find(id)
        }

        async getAllByAgeGreaterThanAndbByNameAndByCity(age, name, city) {
            return await TestEntity.getAllByAgeGreaterThanAndbByNameAndByCity(age, name, city)
        }

        async findOneOrFailById(id) {
            return await TestEntity.find(id)
        }

        async findOrFailByAgeGreaterThanAndbByNameAndByCity(age, name, city) {
            return await TestEntity.findOrFailByAgeGreaterThanAndbByNameAndByCity(age, name, city)
        }

        async delete(id) {
            return await TestEntity.delete(id)
        }

        async getViewA(options) {
            return TestEntity.getViewA(options);
        }

        async findAll() {
            return TestEntity.findAll();
        }

    }

    class TestServiceSchemaId {

        async save(testEntity) {
            return await testEntity.save();
        }

        // async findUserByName(name) {
        //   return await this.userRepository.findByName(name);
        // }

        // async findUserByEmailName(email, name) {
        //   return await this.userRepository.findByEmailName(email, name);
        // }

        async getEntityById(id) {
            // Fetch a user by ID
            return await TestEntitySchemaId.find(id)
        }

        async getAllByAgeGreaterThanAndbByNameAndByCity(age, name, city) {
            return await TestEntitySchemaId.getAllByAgeGreaterThanAndbByNameAndByCity(age, name, city)
        }

        async findOneOrFailById(id) {
            return await TestEntitySchemaId.find(id)
        }

        async findOrFailByAgeGreaterThanAndbByNameAndByCity(age, name, city) {
            return await TestEntitySchemaId.findOrFailByAgeGreaterThanAndbByNameAndByCity(age, name, city)
        }

        async delete(id) {
            return await TestEntitySchemaId.delete(id)
        }

        async getViewA(options) {
            return TestEntitySchemaId.getViewA(options);
        }

        async findAll() {
            return TestEntitySchemaId.findAll();
        }

    }



    // Attach the datasource to test entity
    TestEntitySchemaId.attachDataSource(dataSource, {
        schemas: [schema],
        allErrors: true
    });

    let testService;
    let testServiceSchemaId;

    beforeEach(() => {
        // Reset mock functions and create a new instance of the repository
        jest.clearAllMocks();
        testService = new TestService();
        testServiceSchemaId = new TestServiceSchemaId()
    });

    it('should Check that repository are initialized with a valid Entity', async () => {
        const invalidEntity = { name: 'Jane Doe', age: 25 };
        // Expect the constructor to throw an error
        expect(() => new CouchRepository(dataSource, {}, invalidEntity)).toThrow('entityClass must extend ActiveRecordEntity or DataMapperEntity');
    })

    describe('Save functionality', () => {

        it('should correctly construct a document from an entity with field mapping and save it', async () => {
            const testEntity = new TestEntity({ name: 'John Doe', age: 30, city: 'Lyon' });
            mockConnection.insert.mockResolvedValue({ id: '12345', rev: '1-abc' });
            mockConnection.find.mockResolvedValue({ docs: [{ _id: '12345', _rev: '1-abc', name_field: 'John Doe', age: 30, address: { city: 'Lyon' } }] });

            const savedEntity = await testService.save(testEntity);

            expect(mockConnection.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    name_field: 'John Doe',
                    age: 30,
                    doctype: 'TestEntity',
                    address: {
                        city: 'Lyon'
                    }
                })
            );

            expect(savedEntity).toBeInstanceOf(TestEntity);
            expect(savedEntity.id).toBe('12345');
            expect(savedEntity.rev).toBe('1-abc');
            expect(savedEntity.name).toBe('John Doe');
            expect(savedEntity.city).toBe('Lyon');
            expect(savedEntity.age).toBe(30);
        });

        it('should throw an error if the entity is not an instance of the entity class', async () => {
            const invalidEntity = { name: 'Jane Doe', age: 25 };
            await expect(TestService.save(invalidEntity)).rejects.toThrow('Data must be an instance of TestEntity');
        });

        it('should correctly construct a document from an entity with field mapping and update it', async () => {

            const testEntity = new TestEntitySchemaId({ _id: '12345', _rev: '1-abc', name: 'John Smith', age: 30, city: 'Paris' });
            mockConnection.insert.mockResolvedValue({ id: '12345', rev: '2-abc' });
            mockConnection.find
                .mockResolvedValueOnce({ docs: [{ _id: '12345', _rev: '1-abc', name_field: 'John Doe', age: 30, address: { city: 'Lyon' } }] })
                .mockResolvedValueOnce({ docs: [{ _id: '12345', _rev: '2-abc', name_field: 'John Smith', age: 30, address: { city: 'Paris' } }] });

            const savedEntity = await testServiceSchemaId.save(testEntity);
            expect(mockConnection.find).toHaveBeenCalledTimes(2);
            expect(mockConnection.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    name_field: 'John Smith',
                    age: 30,
                    _id: '12345',
                    _rev: '1-abc',
                    doctype: 'TestEntity',
                    address: {
                        city: 'Paris'
                    }
                })
            );

            expect(savedEntity).toBeInstanceOf(TestEntitySchemaId);
            expect(savedEntity.id).toBe('12345');
            expect(savedEntity.rev).toBe('2-abc');
            expect(savedEntity.name).toBe('John Smith');
            expect(savedEntity.city).toBe('Paris');
            expect(savedEntity.age).toBe(30);
        });
    });

    describe('Retrieve functionality', () => {

        it('should retrieve an entity by ID and correctly transform the document', async () => {
            const mockDoc = { _id: '12345', _rev: '1-abc', name_field: 'John Doe', age: 30, city: 'Lyon' };
            mockConnection.find.mockResolvedValue({ docs: [mockDoc] });

            const retrievedEntity = await testService.getEntityById('12345');

            expect(mockConnection.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    selector: expect.objectContaining({ _id: '12345', doctype: 'TestEntity' }),
                })
            );

            expect(retrievedEntity).toBeInstanceOf(TestEntity);
            expect(retrievedEntity.id).toBe('12345');
            expect(retrievedEntity.rev).toBe('1-abc');
            expect(retrievedEntity.name).toBe('John Doe');
            expect(retrievedEntity.city).toBe('Lyon');
            expect(retrievedEntity.age).toBe(30);
        });

        it('should build the correct Mango query with translated fields', async () => {
            const mockDoc = { _id: '12345', _rev: '1-abc', name_field: 'John Doe', age: 30, city: 'Lyon' };
            mockConnection.find.mockResolvedValue({ docs: [mockDoc] });

            const entities = await testService.getAllByAgeGreaterThanAndbByNameAndByCity(18, 'John Doe', 'Lyon')

            expect(mockConnection.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    "selector": {
                        "$and": [{ "$or": [{ "name_field": { "$eq": "John Doe" } }] },
                        { "$not": { "age": { "$lt": 18 } } }], "address.city": { "$beginsWith": "Lyon" }, "doctype": "TestEntity"
                    }
                })
            );

            console.log(entities)
            expect(entities.length).toBe(1);
            expect(entities[0]).toBeInstanceOf(TestEntity);
            expect(entities[0].city).toBe('Lyon');
            expect(entities[0].age).toBe(30);
            expect(entities[0].name).toBe('John Doe');
        });

        it('should throw an error if no document is found for findOrFail', async () => {
            mockConnection.find.mockResolvedValue({ docs: [] });

            await expect(testService.findOneOrFailById('nonexistent-id')).rejects.toThrow('Document not found');
        });

        it('should throw an error in not found for the given criteria', async () => {

            mockConnection.find.mockResolvedValue({ docs: [] });
            await expect(testService.findOrFailByAgeGreaterThanAndbByNameAndByCity(18, 'John Doe', 'Lyon')).rejects.toThrow('Document not found');
        });

        it('should find all', async () => {
            mockConnection.find.mockResolvedValue({ docs: [{ _id: '12345', _rev: '1-abc', name_field: 'John Doe', age: 30, city: 'Lyon' }] });

            const entities = await testService.findAll();

            expect(mockConnection.find).toHaveBeenCalledWith(
                expect.objectContaining({ "selector": { "doctype": "TestEntity" } })
            );

            expect(entities.length).toBe(1);
            expect(entities[0]).toBeInstanceOf(TestEntity);
            expect(entities[0].city).toBe('Lyon');
            expect(entities[0].age).toBe(30);
            expect(entities[0].name).toBe('John Doe');

        })
    });

    describe('Delete functionality', () => {
        it('should delete the targetted entity', async () => {
            const mockDoc = { _id: '12345', _rev: '1-abc', name_field: 'John Doe', age: 30, city: 'Lyon' };
            mockConnection.find.mockResolvedValue({ docs: [mockDoc] });
            await testService.delete('12345')
            expect(mockConnection.destroy).toHaveBeenCalledWith(
                '12345', '1-abc'
            );
        });
    })

    describe('View functionality', () => {
        it('should call the proper view with options', async () => {

            mockConnection.view.mockResolvedValue({
                rows: [
                    { key: "key1", value: "value1", doc: { id: "doc1" } },
                    { key: "key2", value: "value2", doc: { id: "doc2" } },
                ],
            });
            const response = await testService.getViewA({ "key": "key" })
            expect(response.rows).toHaveLength(2);
            await expect(mockConnection.view).toHaveBeenCalledWith(
                'design', 'view', { "key": "key" }
            );
        });
    })
});
