import ActiveRecordEntity from "./ActiveRecordEntity";
import BaseEntity from "./BaseEntity";
import DataMapperEntity from "./DataMapperEntity";
import DataSource from "./DataSource";
import Ajv, { AnySchema, Options, ValidateFunction, AnySchemaObject } from 'ajv'; // Import Ajv types


type DataMapperEntityConfig = {
  ajvOptions?: any; // Optional
  fieldMap?: Record<string, string>;
};

type EntityConfig = {
  methods?: Record<string, Function>; // Optional
  ajvOptions?: any; // Optional
  fieldMap?: Record<string, string>;
};

type Constructor<T = {}> = new (...args: any[]) => T;

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

function createEntityBase(
  name: string,
  type: string,
  schemaOrSchemaId: string | object,
  config: EntityConfig,
  EntityClass: typeof ActiveRecordEntity | typeof DataMapperEntity
) {
  const { methods, ajvOptions = {}, fieldMap = {} } = config;

  const ajv = new Ajv(ajvOptions);

  // Resolve the schema
  let schema: AnySchemaObject | undefined;

  if (typeof schemaOrSchemaId === 'string') {
    const validateFn = ajv.getSchema(schemaOrSchemaId);
    schema =
      validateFn?.schema && typeof validateFn.schema === 'object'
        ? (validateFn.schema as AnySchemaObject)
        : undefined;
    if (!schema) {
      throw new Error(`Schema with ID "${schemaOrSchemaId}" not found or invalid`);
    }
  } else if (typeof schemaOrSchemaId === 'object') {
    schema = schemaOrSchemaId as AnySchemaObject;
  } else {
    throw new Error('Invalid schema or schema ID provided');
  }

  const rawSchema = schema; // 
  schema = restructureSchemaFromFieldMap(rawSchema, fieldMap);

  const reverseMap: Record<string, string> = {};
  for (const [alias, path] of Object.entries(fieldMap)) {
    reverseMap[path] = alias;
  }

  const validators: Record<string, ValidateFunction> = {};

  // Dynamically define class
  const DynamicEntityClass = class extends EntityClass {
    static type = type;
    static schemaOrSchemaId = schemaOrSchemaId;
    static fieldMap = fieldMap;
    static schema = schema;

    private __data: Record<string, any> = {};

    constructor(data: Record<string, any>) {
      super(data);

      // Initialize values using defined setters
      for (const [key, value] of Object.entries(data)) {
        const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
        const setter = (this as any)[setterName];

        if (typeof setter === 'function') {
          setter.call(this, value);
        }
        // else ignore silently
      }
    }

    toJSON() {
      const base = super.toJSON ? super.toJSON() : {};
      const json: Record<string, any> = { ...base };

      for (const [schemaProp, schemaDef] of Object.entries(schema.properties || {})) {
        const propName = reverseMap[schemaProp] || schemaProp;
        json[schemaProp] = this.__data[propName];
      }

      return json;
    }
  };

  // Define get/set methods based on schema
  for (const [schemaProp, schemaDef] of Object.entries(schema.properties || {})) {
    const propName = reverseMap[schemaProp] || schemaProp;
    const getterName = `get${capitalize(propName)}`;
    const setterName = `set${capitalize(propName)}`;

    const validator = typeof schemaDef === 'object' ? ajv.compile(schemaDef as object) : undefined;
    if (validator) validators[propName] = validator;

    (DynamicEntityClass.prototype as any)[getterName] = function () {
      return this.__data[propName];
    };

    (DynamicEntityClass.prototype as any)[setterName] = function (value: any) {
      if (validator && !validator(value)) {
        const errors = validator.errors?.map(err => `${err.instancePath} ${err.message}`).join(', ');
        throw new Error(`Validation failed for "${propName}": ${errors}`);
      }
      this.__data[propName] = value;
    };
  }

  // Attach custom static methods
  if (methods) {
    Object.assign(DynamicEntityClass, methods);
  }

  Object.defineProperty(DynamicEntityClass, 'name', { value: name });

  return DynamicEntityClass as unknown;
}



export function createActiveRecordEntity(
  name: string,
  type: string,
  schemaOrSchemaId: string | object,
  dataSource: DataSource,
  config: EntityConfig
) {
  // Explicitly type the EntityClass as typeof ActiveRecordEntity
  let EntityClass = createEntityBase(name, type, schemaOrSchemaId, config, ActiveRecordEntity) as typeof ActiveRecordEntity;

  // Automatically attach the dataSource with optional ajvOptions
  EntityClass['attachDataSource'](dataSource, config.ajvOptions || {});

  return EntityClass as typeof ActiveRecordEntity;
}



export function createDataMapperEntity(
  name: string,
  type: string,
  schemaOrSchemaId: string | object,
  config: DataMapperEntityConfig
) {
  // Use the shared base function for creating the class
  const EntityClass = createEntityBase(name, type, schemaOrSchemaId, config, DataMapperEntity) as typeof DataMapperEntity;


  return EntityClass as typeof DataMapperEntity;
}
