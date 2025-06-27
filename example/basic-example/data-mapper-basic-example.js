

const { createDataMapperEntity, DataSource, createRepository } = require('nosqlax');

const schema = {
    "$id": "my-schema",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "definitions": {
        "address": {
            "type": "object",
            "properties": {
                "city": { "type": "string" }
            }
        }
    },
    "properties": {
        "name": { "type": "string" },
        "address": {
            "$ref": "#/definitions/address"
        }
    }
}

// Datasource (connexion)
const ds = new DataSource({
    url: 'http://localhost:5984',
    database: 'nosqlax-test'
})

// Create the User class using the helper
const User = createDataMapperEntity(
    "User",
    "user",
    schema,
    {})

// Instanciate a user
const user = new User({ name: "John" });
user.address = { "city": "Lyon" }

// { name: 'John', address: { city: 'Lyon' } }
console.log(user.toJSON())

const userRepository = createRepository(
    User,
    ds,
    {
        methods: {
            async findByName(name) {
                return this.findOne({ name: { $eq: name } });
            },
            async getViewA(options) {
                return this.dbConnection.view('design', 'view', options)
                // you can also process view results here to return User entities
            }
        }
    }
)


// Define a service class user your repo
class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async saveUser(userData) {
        // Create a new user using the UserRepository
        return await this.userRepository.save(userData);
    }

    async findUserByName(name) {
        return await this.userRepository.findByName(name);
    }

    async findUserByEmailAndName(email, name) {
        return await this.userRepository.findOne({
            "$and": [
                { "name": name },
                { "email": email }
            ]
        }
        )

    }

    async getUserById(id) {
        // Fetch a user by ID
        return await this.userRepository.find(id);
    }

    async deleteUser(id) {
        // Delete a user by ID
        return await this.userRepository.delete(id);
    }
}

// instantiate service

const myService = new UserService(userRepository);


async function main() {
    await myService.saveUser(user);
    // Document like this will be created in DB:
    /* {
        "_id": "f9d62b31017e03b71fb0a84a5e000a08",
            "_rev": "1-8d43f9216da5ae302f393886daa52765",
                "name": "John",
                    "address": {
            "city": "Lyon"
        },
        "type": "user"
    } */

    const found = await myService.findUserByName("John");
    console.log(found.toJSON());
    /*     {
            name: 'John',
            address: { city: 'Lyon' },
            _id: 'f9d62b31017e03b71fb0a84a5e000a08',
            _rev: '1-8d43f9216da5ae302f393886daa52765'
          } */
}

main();


