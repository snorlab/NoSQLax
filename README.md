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
Initialize a datasource (couchdb connection), create an entity using the helper method and use it right away!
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
    database: 'nosqlax-test',
    username: 'admin',
    password: 'password'
})

// Create the User class using the helper
const User = createActiveRecordEntity(
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

```
### 2. Choose between Data Mapper or Active Record pattern
Instead of passing a single schema directly, you can pass multiple schemas through AJV options and reference the one you want by ID.
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



```
### 3. Using AJV Options with Multiple Schemas (via schemaId)
Instead of passing a single schema directly, you can pass multiple schemas through AJV options and reference the one you want by ID.
```
// schemas/index.ts
export const ajvOptions = {
  schemas: [
    {
      $id: 'https://example.com/schemas/User',
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        address: {
          type: 'object',
          properties: {
            city: { type: 'string' }
          },
          required: ['city']
        }
      },
      required: ['name', 'email']
    },
    {
      $id: 'https://example.com/schemas/Other',
      type: 'object',
      properties: {
        field: { type: 'string' }
      }
    }
  ]
};

import { createActiveRecordEntity } from 'nosqlax';
import { ajvOptions } from '../schemas';
import dataSource from '../db';

const User = createActiveRecordEntity(
  'User',
  'user',
  'https://example.com/schemas/User', // schema ID
  dataSource,
  {
    ajvOptions,
    fieldMap: {
      name: 'name',
      email: 'email',
      city: 'address.city'
    }
  }
);

const user = new User({ name: 'Jane', email: 'jane@example.com', city: 'London' });
await user.save();
```
### 4. Relax and have fun!
