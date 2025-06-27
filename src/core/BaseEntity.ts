
type FieldMap = Record<string, string>;

interface IBaseEntity {
  id?: string;
  rev?: string;

  // Allow dynamic properties
  [key: string]: any;

  // Convert entity to JSON object
  toJSON(): Record<string, any>;
}
import Ajv, { ValidateFunction, ErrorObject, AnySchema, AnySchemaObject } from 'ajv';


function restructureSchemaFromFieldMap(
  schema: AnySchemaObject,
  fieldMap: Record<string, string>
): AnySchemaObject {
  const cloned = JSON.parse(JSON.stringify(schema)); // Deep clone to avoid mutating the original
  const topLevelProps = cloned.properties || {};
  const toAdd: Record<string, any> = {};

  for (const [aliasName, fieldPath] of Object.entries(fieldMap)) {
    const parts = fieldPath.split('.');
    if (parts.length <= 1) continue; // Only process nested fields

    const propKey = parts.pop()!;
    let current = cloned;
    let found = true;

    for (const part of parts) {
      if (
        current &&
        typeof current === 'object' &&
        current.properties &&
        current.properties[part] &&
        current.properties[part].type === 'object'
      ) {
        current = current.properties[part];
      } else {
        found = false;
        break;
      }
    }

    if (found && current?.properties?.[propKey]) {
      const fieldSchema = current.properties[propKey];

      // Add it to top-level properties with the alias name
      toAdd[aliasName] = fieldSchema;

      // Remove the property from its original nested location
      delete current.properties[propKey];

      // Also remove from required, if applicable
      if (Array.isArray(current.required)) {
        current.required = current.required.filter((r:String) => r !== propKey);
      }
    }
  }

  // Add extracted properties to top-level schema
  cloned.properties = { ...topLevelProps, ...toAdd };

  return cloned;
}

// Used to avoid redefining getters/setters for the same subclass
const initializedClasses = new WeakSet<Function>();

// src/BaseEntity.ts
abstract class BaseEntity implements IBaseEntity {
  private _id?: string;
  private _rev?: string;

  static type: string;
  static schemaOrSchemaId: string | object;
  private __data: WeakMap<any, Record<string, any>> = new WeakMap();
  private validators: Record<string, ValidateFunction> = {};


  // Index signature to allow dynamic properties
  [key: string]: any; // This allows dynamic fields to be assigned to the instance

  // Map from entity attributes to document fields, type is implicitly handled
  static fieldMap: Record<string, string> = { type: "type" };  // Default fieldMap, type is implicitly required



  constructor(data: { _id?: string; _rev?: string;[key: string]: any } = {}) {
    this._id = data._id;
    this._rev = data._rev;
    this.__data.set(this, {});

    const ctor = this.constructor as typeof BaseEntity;

    if (initializedClasses.has(ctor)) {
      this.initializeData(data);
      return;
    }

    const ajv = new Ajv({});
    let schema: any;

    if (typeof ctor.schemaOrSchemaId === 'string') {
      const validateFn = ajv.getSchema(ctor.schemaOrSchemaId);
      schema =
        validateFn?.schema && typeof validateFn.schema === 'object'
          ? validateFn.schema as AnySchema
          : undefined;
      if (!schema) {
        throw new Error(`Schema with ID "${ctor.schemaOrSchemaId}" not found or invalid`);
      }
    } else if (typeof ctor.schemaOrSchemaId === 'object') {
      schema = ctor.schemaOrSchemaId as AnySchema;
    } else {
      throw new Error('Invalid schema or schema ID provided');
    }
      

    // Replace with actual restructuring if you support it
    const rawSchema = schema;
    
    const fieldMap = ctor.fieldMap || {};
    const reverseMap: Record<string, string> = {};
    for (const [alias, path] of Object.entries(fieldMap)) {
      reverseMap[path] = alias;
    }

    schema = restructureSchemaFromFieldMap(rawSchema, fieldMap);

    const schemaProperties = schema.properties || {};

    for (const [schemaProp, schemaDef] of Object.entries(schemaProperties)) {
      const propName = reverseMap[schemaProp] || schemaProp;

      const validator: ValidateFunction | undefined =
        typeof schemaDef === 'object' ? ajv.compile(schemaDef as object) : undefined;
      if (validator) this.validators[propName] = validator;

      Object.defineProperty(ctor.prototype, propName, {
        get: function () {
          return this.__data.get(this)?.[propName];
        },
        set: function (value: any) {
          const validator = this.validators[propName];
          if (validator && !validator(value)) {
            const errors = (validator.errors as ErrorObject[] | null | undefined)
              ?.map((err) => `${err.instancePath} ${err.message}`)
              .join(', ');
            throw new Error(`Validation failed for "${propName}": ${errors}`);
          }
          const dataStore = this.__data.get(this) || {};
          dataStore[propName] = value;
          this.__data.set(this, dataStore);
        },
        enumerable: true,
        configurable: false,
      });
    }

    initializedClasses.add(ctor);

    this.initializeData(data);
  }

  toJSON() {
    const data = { ...(this.__data.get(this) || {}) };
    if (this._id) data._id = this._id;
    if (this._rev) data._rev = this._rev;
    return data;
  }

  private initializeData(data: Record<string, any>) {
    const fieldMap = (this.constructor as typeof BaseEntity).fieldMap || {};
    const reverseMap: Record<string, string> = {};
    for (const [alias, path] of Object.entries(fieldMap)) {
      reverseMap[path] = alias;
    }

    for (const [key, value] of Object.entries(data)) {
      try {
        (this as any)[key] = value;
      } catch {
        // Skip properties without setters (e.g., unknown fields)
      }
    }
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
