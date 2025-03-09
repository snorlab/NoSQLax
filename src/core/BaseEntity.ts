
type FieldMap = Record<string, string>;
interface IBaseEntity {
  id?: string;
  rev?: string;

  // Allow dynamic properties
  [key: string]: any;

  // Convert entity to JSON object
  toJSON(): Record<string, any>;
}
import Ajv, { } from 'ajv'; // Import Ajv types

// src/BaseEntity.ts
abstract class BaseEntity implements IBaseEntity {
  private _id?: string;
  private _rev?: string;

  static type: string;
  static schemaOrSchemaId: string | object;

  // Store private values in a WeakMap
  private privateData: WeakMap<any, any>;

  // Index signature to allow dynamic properties
  [key: string]: any; // This allows dynamic fields to be assigned to the instance

  // Map from entity attributes to document fields, type is implicitly handled
  static fieldMap: Record<string, string> = { type: "type" };  // Default fieldMap, type is implicitly required

  constructor(data: { _id?: string; _rev?: string;[key: string]: any }) {
    this._id = data._id;
    this._rev = data._rev;

    this.privateData = new WeakMap();
    this.privateData.set(this, {});

    // Ensure schemaOrSchemaId is defined
    if ((this.constructor as typeof BaseEntity).schemaOrSchemaId === undefined) {
      throw new Error(`${this.constructor.name} must define schemaOrSchemaId`);
    }
    if ((this.constructor as typeof BaseEntity).type === undefined) {
      throw new Error(`${this.constructor.name} must define type`);
    }

    // Initialize the AJV instance with options
    const ajv = new Ajv({});
    let schema: any = this.schemaOrSchemaId;

    // If schemaOrSchemaId is a string (schema ID), fetch the schema
    if (typeof schema === "string") {
      schema = ajv.getSchema(schema)?.schema; // Retrieve the schema
      if (!schema) {
        throw new Error(`Schema with ID ${schema} not found.`);
      }
    }

    const schemaProperties = schema?.properties || {};

    // Dynamically add getters and setters based on schema
    Object.keys(schemaProperties).forEach(property => {
      Object.defineProperty(this, property, {
        get() {
          return this.privateData.get(this)[property];  // Retrieve the field value
        },
        set(value) {
          this.privateData.get(this)[property] = value;  // Assign value to internal variable
        },
        enumerable: true,
        configurable: true
      });
    });

    // Initialize properties from schema
    Object.keys(schemaProperties).forEach(property => {
      this.privateData.get(this)[property] = data[property];
    });

  }

  toJSON() {
    const data = { ...this.privateData.get(this) };
    if (this._id) data._id = this._id;
    if (this._rev) data._rev = this._rev;
    return data;
  }

  static extractFieldMapFromSchema(schemaOrSchemaId: any, ajvOptions: any): Record<string, string> {

    const fieldMap: Record<string, string> = {};

    // Initialize the AJV instance with options
    const ajv = new Ajv(ajvOptions || {});
    let schema: any = schemaOrSchemaId;


    // If schemaOrSchemaId is a string (schema ID), fetch the schema
    if (typeof schemaOrSchemaId === "string") {
      schema = ajv.getSchema(schemaOrSchemaId); // Retrieve the schema
      if (!schema) {
        throw new Error(`Schema with ID ${schemaOrSchemaId} not found.`);
      }
    }

    if (schema && schema.properties) {
      // Only consider top-level properties from the schema
      for (const key in schema.properties) {
        fieldMap[key] = key; // Field name matches property name by default
      }
    }

    return fieldMap;

  }


  // Getter for id
  get id(): string | undefined {
    return this._id;
  }

  // Getter for rev
  get rev(): string | undefined {
    return this._rev;
  }

  // Static method to get field map for the current entity
  static getFieldMap(): Record<string, string> {
    return this.fieldMap;
  }
}

// Export the class as default
export default BaseEntity;
