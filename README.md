<img src="nosqlax.png" alt="drawing" width="400"/>

# NoSQLax 💤 - A Relaxed Repository for CouchDB
NoSQLax is a modern, lightweight JavaScript Object Document Mapper(ODM) library that makes working with CouchDB a breeze. Inspired by CouchDB’s “Relax” philosophy and the chill vibes of Snorlax, NoSQLax takes the hassle out of managing your data, offering a streamlined and intuitive repository pattern to handle CRUD operations effortlessly.

Inspired by Hibernate, Ottoman.js, and TypeORM, NoSQLax offers a powerful and intuitive developer experience for managing CouchDB documents using familiar patterns and standards.

Whether you're validating data, extending functionality, or simplifying database interactions, NoSQLax ensures your CouchDB experience is as laid-back as its motto.

## Key Features
- JSON Schema–Based Entity Modeling
Describe your data using JSON Schema and get automatic validation, structure, and introspection.
- Supports Both Active Record & Data Mapper Patterns
Choose the architectural pattern that suits your project — model-centric (Active Record) or repository-centric (Data Mapper).
- Field Mapping & Nested Property Flattening
Seamlessly map nested document structures into clean, flat JavaScript objects using field maps.
- Built-in Validation with Ajv
Ensure your data is always valid before it’s saved — with runtime validation powered by Ajv.
- Auto-Generated Getters & Setters
Access your fields via user.name or user.city, with schema-defined validation baked in.
- Extendable Repository System
Define reusable custom query methods on top of CouchDB’s Mango queries.

## Why Choose NoSQLax?
NoSQLax bridges the gap between CouchDB’s flexibility and the structure developers need. Whether you're building a lightweight application or scaling a robust API, NoSQLax gives you the tools to manage your data reliably without sacrificing simplicity or performance.
Take a deep breath, relax, and let NoSQLax handle the heavy lifting for your CouchDB operations.

## Installation
```npm install nosqlax```

## Getting started
### 1. Basic usage
```
const { createActiveRecordEntity, DataSource } = require('nosqlax');

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




// Define a service class using your entity
class UserService {

    constructor(UserClass) {
        this.UserClass = UserClass;
    }


    async findUserByName(name) {
        return await this.UserClass.findByName(name);
    }

    async findUserByEmailAndName(email, name) {
        return await this.UserClass.findOne({
            "$and": [
                { "name": name },
                { "email": email }
            ]
        }
        )

    }

    async getUserById(id) {
        // Fetch a user by ID
        return await this.UserClass.find(id);
    }

    async deleteUser(id) {
        // Delete a user by ID
        return await this.UserClass.delete(id);
    }
}




async function main() {

    // Create the User class using the helper
    const User = await createActiveRecordEntity(
        "User", // class name
        "user", // type
        schema, // Schema or schema ID
        ds, // Data source
        { // additional query methods

            methods: {
                async findByName(name) {
                    return this.findOne({ name: { $eq: name } });
                },
                async getViewA(options) {
                    return this.dbConnection.view('design', 'view', options)
                    // you can also process view results here to return User entities
                }
            }

        })

    // Instanciate a user
    const user = new User({ name: "John Active" });
    user.address = { "city": "Lyon" }

    // { name: 'John', address: { city: 'Lyon' } }
    console.log(user.toJSON())

    await user.save();
    // Document like this will be created in DB:
    /* {
        "_id": "f9d62b31017e03b71fb0a84a5e000a08",
            "_rev": "1-8d43f9216da5ae302f393886daa52765",
                "name": "John Active",
                    "address": {
            "city": "Lyon"
        },
        "type": "user"
    } */
    // instantiate service

    const myService = new UserService(User);
    const found = await myService.findUserByName("John Active");
    console.log(found.toJSON());
    /*     {
            name: 'John Active',
            address: { city: 'Lyon' },
            _id: 'f9d62b31017e03b71fb0a84a5e000a08',
            _rev: '1-8d43f9216da5ae302f393886daa52765'
          } */
}

main();

```
### 2. Choose between Data Mapper or Active Record pattern
If you prefer the DataMapper pattern, use createRepository and createDataMapperEntity to create an entity and an associated repository
```


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


async function main() {
    // Create the User class using the helper
    const User = await createDataMapperEntity(
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

    // instantiate service

    const myService = new UserService(userRepository);

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
```
### 3. Using AJV Options with Multiple Schemas (via schemaId)
Instead of passing a single schema directly, you can pass multiple schemas through AJV options and reference the one you want by ID.
```
const coreSch = {
    "$id": "core.schema.json",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "Core",
    "definitions": {
        "spineTypeInOut": {
            "$id": "#spineTypeInOut",
            "description": "SPINE Type",
            "type": "string"
        }
    }
}


const wfSchema =
{
    "$id": "workflow.schema.json",
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "SPINE Workflow schemas",
    "definitions": {
        "name": {
            "description": "Name",
            "type": "string"
        }
    },
    "anyOf": [
        {
            "type": "object",
            "properties": {
                "name": {
                    "description": "Workflow name",
                    "type": "string"
                },
                "input": { "type": 'number' }
            }
        },
        {
            "type": "object",
            "properties": {
                "name": {
                    "$ref": "#/definitions/name"
                },
                "input": {
                    "oneOf": [
                        {
                            "type": "object",
                            "properties": {
                                "type": {
                                    "$ref": "core.schema.json#/definitions/spineTypeInOut"
                                }
                            }
                        },
                        { "type": 'string' }

                    ]
                }
            }
        }
    ]
}

const { createActiveRecordEntity, DataSource } = require('nosqlax');

const ajvOptions = {
    schemas: [
        coreSch,
        wfSchema
    ],
    allErrors: true
};

// Datasource (connexion)
const ds = new DataSource({
    url: 'http://localhost:5984',
    database: 'nosqlax-test'
})




// Define a service class using your entity
class UserService {

    constructor(UserClass) {
        this.UserClass = UserClass;
    }


    async findUserByType(t) {
        return await this.UserClass.findByType(t);
    }

    async findUserByEmailAndName(email, name) {
        return await this.UserClass.findOne({
            "$and": [
                { "name": name },
                { "email": email }
            ]
        }
        )

    }

    async getUserById(id) {
        // Fetch a user by ID
        return await this.UserClass.find(id);
    }

    async deleteUser(id) {
        // Delete a user by ID
        return await this.UserClass.delete(id);
    }
}




async function main() {
    // Create the User class using the helper
    const User = await createActiveRecordEntity(
        "User",
        "user",
        "workflow.schema.json", // passing id of schema and passing schema in the ajvoption with dependencies
        ds,
        {
            ajvOptions,
            methods: {
                async findByType(t) {
                    return this.findOne({ inputType: { $eq: t } });
                },
                async getViewA(options) {
                    return this.dbConnection.view('design', 'view', options)
                    // you can also process view results here to return User entities
                }
            },
            fieldMap: {
                type: "doctype",
                inputType: "input.type"
            }

        })

    // Instanciate a user
    const user = new User({ name: "John Custom Field" });
    user.inputType = "TypeA"

    // { name: 'John Custom Field', inputType: 'TypeA' }
    console.log(user.toJSON())

    await user.save();
    // Document like this will be created in DB:
    /* {
  "_id": "f9d62b31017e03b71fb0a84a5e01a8bd",
  "_rev": "1-b570d2de4279b4d9d2432cb0f4036e8c",
  "doctype": "user",
  "input": {
    "type": "TypeA"
  },
  "name": "John Custom Field"
} */
    // instantiate service

    const myService = new UserService(User);
    const found = await myService.findUserByType("TypeA");
    console.log(found.toJSON());
    /*     {
  inputType: 'TypeA',
  name: 'John Custom Field',
  _id: 'f9d62b31017e03b71fb0a84a5e01a8bd',
  _rev: '1-b570d2de4279b4d9d2432cb0f4036e8c'
}
   */
}

main();


```
### 4. Relax and have fun!
