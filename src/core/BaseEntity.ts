
type FieldMap = Record<string, string>;
import $RefParser, { dereference } from '@apidevtools/json-schema-ref-parser';
import path from 'path';

import { parse, stringify } from 'flatted';



interface IBaseEntity {
  id?: string;
  rev?: string;

  // Allow dynamic properties
  [key: string]: any;

  // Convert entity to JSON object
  toJSON(): Record<string, any>;
}
import Ajv, { ValidateFunction, ErrorObject, AnySchema, AnySchemaObject } from 'ajv';
import { ResolverOptions, FileInfo } from '@apidevtools/json-schema-ref-parser';

function createAjvResolver(ajv: Ajv): ResolverOptions {
  return {
    order: 2,
    canRead: true, // Accept all refs (you can narrow with a RegExp or custom logic)

    async read(file: FileInfo): Promise<string> {
      const refPath = path.basename(file.url); // remove fragment part
      let schema: AnySchema | undefined;

      // Try full ID match
      const fullSchemaFn = ajv.getSchema(refPath);
      schema = fullSchemaFn?.schema as AnySchema;

      // If not found, try suffix match
      if (!schema) {
        const allSchemas = Object.values(ajv.schemas || {});
        for (const schemaObj of allSchemas) {
          // `schemaObj` can be just a schema or {schema, meta, ...} depending on AJV version
          const candidateSchema = (schemaObj as any)?.schema || (schemaObj as AnySchema);
          const id = (candidateSchema as any)?.$id || (candidateSchema as any)?.id;
          if (id && id.endsWith(refPath)) {
            schema = candidateSchema;
            break;
          }
        }
      }

      if (!schema) {
        throw new Error(`Schema not found for ref: ${file.url}`);
      }

      return JSON.stringify(schema);
    },
  };
}



function collectAndRemoveAllSchemas(
  schema: any,
  path: string[],
  key: string,
  results: any[]
): void {
  if (!schema || typeof schema !== 'object') return;

  // remaining $ref only are circular refs after dereferencings
  if (schema.$ref && typeof schema.$ref === 'string') return;

  // Base case: match at current level
  if (path.length === 0 && schema.properties?.[key]) {
    results.push(schema.properties[key]);
    delete schema.properties[key];

    if (Array.isArray(schema.required)) {
      schema.required = schema.required.filter((r: string) => r !== key);
    }
  }

  const [next, ...rest] = path;

  // Traverse normal nested object
  if (schema.properties?.[next]) {
    collectAndRemoveAllSchemas(schema.properties[next], rest, key, results);
  }

  // Traverse any combinator keywords
  for (const comb of ['oneOf', 'anyOf', 'allOf']) {
    if (Array.isArray(schema[comb])) {
      for (const subSchema of schema[comb]) {
        collectAndRemoveAllSchemas(subSchema, path, key, results);
      }
    }
  }
}

function flattenRootCombinatorProperties(schema: AnySchemaObject): Record<string, AnySchemaObject> {
  const combinators = ['oneOf', 'anyOf', 'allOf'];
  const merged: Record<string, AnySchemaObject> = {};

  for (const comb of combinators) {
    if (!Array.isArray(schema[comb])) continue;

    for (const variant of schema[comb]) {
      if (!variant?.properties) continue;

      for (const [key, value] of Object.entries(variant.properties)) {
        const schemaVal = value as AnySchemaObject;

        if (merged[key]) {
          const existing = merged[key];
          if (
            !existing.anyOf ||
            !Array.isArray(existing.anyOf) ||
            !existing.anyOf.find((e) => JSON.stringify(e) === JSON.stringify(schemaVal))
          ) {
            merged[key] = {
              anyOf: [
                ...(existing.oneOf || [existing]),
                schemaVal
              ]
            };
          }
        } else {
          merged[key] = schemaVal;
        }
      }

    }
  }

  return merged;
}

function restructureSchemaFromFieldMap(
  schema: AnySchemaObject,
  fieldMap: Record<string, string>
): AnySchemaObject {

  const cloned = parse(stringify(schema)); // safe circular clone
  const toAdd: Record<string, any> = {};

  // 1. Flatten all top-level combinator properties (even if not mapped)
  const combinatorProps = flattenRootCombinatorProperties(cloned);

  // 2. Handle fieldMap-mapped fields and extract them
  for (const [aliasName, fieldPath] of Object.entries(fieldMap)) {
    const parts = fieldPath.split('.');
    if (parts.length <= 1) continue;

    const propKey = parts.pop()!;
    const parentPath = parts;

    const collectedSchemas: any[] = [];

    collectAndRemoveAllSchemas(cloned, parentPath, propKey, collectedSchemas);

    if (collectedSchemas.length === 1) {
      toAdd[aliasName] = collectedSchemas[0];
    } else if (collectedSchemas.length > 1) {
      toAdd[aliasName] = { anyOf: collectedSchemas };
    }
  }

  // 3. Merge root + combinator-flattened + mapped fields
  cloned.properties = {
    ...(cloned.properties || {}),
    ...combinatorProps,
    ...toAdd
  };

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
  static validators: Record<string, ValidateFunction> = {};

  // Index signature to allow dynamic properties
  [key: string]: any; // This allows dynamic fields to be assigned to the instance

  // Map from entity attributes to document fields, type is implicitly handled
  static fieldMap: Record<string, string> = { type: "type" };  // Default fieldMap, type is implicitly required

  constructor(data: { _id?: string; _rev?: string;[key: string]: any } = {}) {
    this._id = data._id;
    this._rev = data._rev;
    this.__data.set(this, {});



    this.initializeData(data);
  }

  static async initialize(): Promise<void> {
    if (initializedClasses.has(this)) return;

    const ctor = this as typeof BaseEntity;

    const ajvOptionsCtor = ctor.ajvOptions || {};
    const ajv = new Ajv(ajvOptionsCtor);
    let schema: any;

    if (typeof ctor.schemaOrSchemaId === 'string') {
      const validateFn = ajv.getSchema(ctor.schemaOrSchemaId.split("#/definitions/")[0]); // we get base schema with its deifnitions for the dereferencing
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


    // 3. Dereference local $ref (like "#/definitions/...")
    // dereference local ref from ajv schemas
    const options = {
      resolve: {
        ajv: createAjvResolver(ajv),
      },
      dereference: {
        circular: 'ignore'
      }
    } as const;
    const dereferencedSchema2 = await $RefParser.bundle(rawSchema, options);

    let restructured;

    if (typeof ctor.schemaOrSchemaId === 'object') {
      // schema passedas object so it's necessarely the whole object
      restructured = restructureSchemaFromFieldMap(dereferencedSchema2, fieldMap);
    }
    else {
      const ajv = new Ajv({ strict: false, schemas: [dereferencedSchema2] });

      const validateFn = ajv.getSchema(ctor.schemaOrSchemaId);

      if (!validateFn?.schema) {
        throw new Error(`Schema not found in AJV for ID: ${ctor.schemaOrSchemaId}`);
      }

      const finalSchema = validateFn.schema;

      /*       if (ctor.schemaOrSchemaId.split("#/definitions/").length > 1) {
              (finalSchema as any).definitions = {
                ...(finalSchema as any).definitions,
                ...dereferencedSchema2.definitions
              }
            } */

      // todo : get schema using $id with new ajv instance or validator or else
      restructured = restructureSchemaFromFieldMap(finalSchema as AnySchemaObject, fieldMap);

      if (ctor.schemaOrSchemaId.split("#/definitions/").length > 1) {
        (restructured as any).definitions = {
          ...(restructured as any).definitions,
          ...dereferencedSchema2.definitions
        }
      }
    }

    const schemaProperties = restructured.properties || {};
    const schemaDefs: any = restructured.definitions;

    for (const [schemaProp, schemaDef] of Object.entries(schemaProperties)) {
      const propName = reverseMap[schemaProp] || schemaProp;

      // Inject definitions into subschema if needed
      if (typeof schemaDef === 'object' && schemaDefs) {
        (schemaDef as any).definitions = {
          ...(schemaDef as any).definitions,
          ...schemaDefs
        }
      }

      // Protect _id and _rev from being overridden
      if (propName === '_id' || propName === '_rev') {
        continue;
      }

      const ajvProp = new Ajv({
        strict: false
      });
      const propValidator = ajvProp.compile(schemaDef as object);

      Object.defineProperty(ctor.prototype, propName, {
        get() {
          return this.__data.get(this)?.[propName];
        },
        set(value: any) {
          if (!this.validators) this.validators = {};
          if (!this.validators[propName]) {
            this.validators[propName] = propValidator;
          }
          if (!propValidator(value)) {
            const errors = (propValidator.errors as ErrorObject[] | null | undefined)
              ?.map(err => `${err.instancePath} ${err.message}`)
              .join(', ');
            throw new Error(`Validation failed for "${propName}": ${errors}`);
          }

          const dataStore = this.__data.get(this) || {};
          dataStore[propName] = value;
          this.__data.set(this, dataStore);
        },
        enumerable: true,
        configurable: false
      });
    }

    initializedClasses.add(ctor);

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
