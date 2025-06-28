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


    async findUserByCity(name) {
        return await this.UserClass.findByCity(name);
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
        schema,
        ds,
        {

            methods: {
                async findByCity(city) {
                    return this.findOne({ city: { $eq: city } });
                },
                async getViewA(options) {
                    return this.dbConnection.view('design', 'view', options)
                    // you can also process view results here to return User entities
                }
            },
            fieldMap: {
                type: "doctype",
                city: "address.city"
            }

        })

    // Instanciate a user
    const user = new User({ name: "John Custom Field" });
    user.city = "Lyon"

    // { name: 'John Custom Field', city: 'Lyon' }
    console.log(user.toJSON())


    // instantiate service

    const myService = new UserService(User);

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

    const found = await myService.findUserByCity("Lyon");
    console.log(found.toJSON());
    /*     {
  city: 'Lyon',
  name: 'John Custom Field',
  _id: 'f9d62b31017e03b71fb0a84a5e00f512',
  _rev: '1-2b06619c969d53f4afb28765595b9a5f'
}
   */
}

main();
