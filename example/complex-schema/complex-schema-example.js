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

// Create the User class using the helper
const User = createActiveRecordEntity(
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

// instantiate service

const myService = new UserService(User);


async function main() {
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

