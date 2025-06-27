
type FieldMap = Record<string, string>;
import $RefParser from '@apidevtools/json-schema-ref-parser';

interface IBaseEntity {
  id?: string;
  rev?: string;

  // Allow dynamic properties
  [key: string]: any;

  // Convert entity to JSON object
  toJSON(): Record<string, any>;
}
import Ajv, { ValidateFunction, ErrorObject, AnySchema, AnySchemaObject } from 'ajv';

function resolveRef(ref: string, definitions: Record<string, any>): any {
  const match = ref.match(/^#\/definitions\/(.+)$/);
  if (!match) throw new Error(`Unsupported $ref format: ${ref}`);
  const key = match[1];
  const resolved = definitions[key];
  if (!resolved) throw new Error(`Could not resolve $ref: ${ref}`);
  return resolved;
}

function collectAndRemoveAllSchemas(
  schema: any,
  path: string[],
  key: string,
  results: any[],
  definitions: Record<string, any>
): void {
  if (!schema || typeof schema !== 'object') return;

  // 🔁 If it's a $ref, resolve it
  if (typeof schema === 'object' && schema.$ref) {
    schema = resolveRef(schema.$ref, definitions);
  }

  // Base case: found the key in properties
  if (path.length === 0 && schema.properties?.[key]) {
    let fieldSchema = schema.properties[key];


    results.push(fieldSchema);
    delete schema.properties[key];

    if (Array.isArray(schema.required)) {
      schema.required = schema.required.filter((r: string) => r !== key);
    }
    return;
  }

  const [next, ...rest] = path;

  // Dive into nested propertiess
  if (schema.properties?.[next]) {
    collectAndRemoveAllSchemas(schema.properties[next], rest, key, results, definitions);
  }

  // Dive into oneOf / anyOf / allOf
  for (const comb of ['oneOf', 'anyOf', 'allOf']) {
    if (Array.isArray(schema[comb])) {
      for (const subSchema of schema[comb]) {
        collectAndRemoveAllSchemas(subSchema, path, key, results, definitions);
      }
    }
  }
}

function restructureSchemaFromFieldMap(
  schema: AnySchemaObject,
  fieldMap: Record<string, string>
): AnySchemaObject {
  const cloned = JSON.parse(JSON.stringify(schema));
  const definitions = cloned.definitions || {};
  const toAdd: Record<string, any> = {};

  for (const [aliasName, fieldPath] of Object.entries(fieldMap)) {
    const parts = fieldPath.split('.');
    if (parts.length <= 1) continue;

    const propKey = parts.pop()!;
    const parentPath = parts;

    const collectedSchemas: any[] = [];
    collectAndRemoveAllSchemas(cloned, parentPath, propKey, collectedSchemas, definitions);

    if (collectedSchemas.length === 1) {
      toAdd[aliasName] = collectedSchemas[0];
    } else if (collectedSchemas.length > 1) {
      toAdd[aliasName] = { oneOf: collectedSchemas };
    }
  }

  cloned.properties = { ...(cloned.properties || {}), ...toAdd };
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
  static ajvOptions: any = {};

  private __data: WeakMap<any, Record<string, any>> = new WeakMap();
  private validators: Record<string, ValidateFunction> = {};

  // Index signature to allow dynamic properties
  [key: string]: any; // This allows dynamic fields to be assigned to the instance

  // Map from entity attributes to document fields, type is implicitly handled
  static fieldMap: Record<string, string> = { type: "type" };  // Default fieldMap, type is implicitly required

  constructor(data: { _id?: string; _rev?: string;[key: string]: any } = {}, ajvOptions: any = {}) {
    this._id = data._id;
    this._rev = data._rev;
    this.__data.set(this, {});

    const ctor = this.constructor as typeof BaseEntity;

    if (initializedClasses.has(ctor)) {
      this.initializeData(data);
      return;
    }

    const ajvOptionsCtor = ctor.ajvOptions || {};
    const ajv = new Ajv(ajvOptionsCtor);
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

    // compile to dereference the schema
    const validator = ajv.compile(rawSchema);
    const resolvedSchema = validator.schema as AnySchemaObject;
    restructureSchemaFromFieldMap(rawSchema, fieldMap);

    const schemaProperties = schema.properties || {};
    const schemaDefs: any = schema.definitions;

    for (const [schemaProp, schemaDef] of Object.entries(schemaProperties)) {
      const propName = reverseMap[schemaProp] || schemaProp;
      // Inject definitions into subschema if needed
      if (typeof schemaDef === 'object' && schemaDefs) {
        (schemaDef as any).definitions = schemaDefs;
      }

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
