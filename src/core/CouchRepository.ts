import Nano, { DocumentScope, MangoQuery, MangoSelector } from "nano";
import Validation from './Validation'; // Import the Validation class
import BaseEntity from './BaseEntity';
import { DocumentNotFoundError } from "./DocumentNotFoundError";
import DataSource from "./DataSource";
import ActiveRecordEntity from "./ActiveRecordEntity";
import DataMapperEntity from "./DataMapperEntity";

type MangoOptions = Omit<MangoQuery, 'selector'>;

// Type for the entity class constructor
type EntityClass = {
  fieldMap: Record<string, string>;
  new(data: Record<string, any>): BaseEntity;
  schemaOrSchemaId: string | object;
  type: string;
  [key: string]: any;
};

const validate = function (object: Object, validator: Validation) {
  // remove _id and _rev as they are implicitely required
  const objectToValidate = JSON.parse(JSON.stringify(object));
  delete objectToValidate._id;
  delete objectToValidate._rev;
  validator.validateData(objectToValidate);
}

// Mango operators
const LOGICAL_OPERATORS = new Set([
  '$and', '$or', '$not', '$nor', '$all', '$elemMatch', '$allMatch', '$keyMapMatch'
]);

const CONDITIONAL_OPERATORS = new Set([
  '$lt', '$lte', '$eq', '$ne', '$gte', '$gt', '$exists', '$type', '$in', '$nin',
  '$size', '$mod', '$regex', '$beginsWith'
]);

function translateSelector(
  selector: Record<string, any>,
  fieldMap: Record<string, string>
): Record<string, any> {
  const translatedSelector: Record<string, any> = {};

  for (const [key, value] of Object.entries(selector)) {
    if (LOGICAL_OPERATORS.has(key)) {
      // Logical operator (e.g., $and): recursively translate each sub-condition
      if (Array.isArray(value)) {
        translatedSelector[key] = value.map((subSelector) => translateSelector(subSelector, fieldMap));
      } else {
        translatedSelector[key] = translateSelector(value, fieldMap);
      }
    } else if (CONDITIONAL_OPERATORS.has(key)) {
      // Conditional operator (e.g., $eq): Keep the key and value as-is, no further translation needed
      translatedSelector[key] = value;
    } else {
      // Regular field name, so translate it using fieldMap
      const translatedField = fieldMap[key] || key;

      // If the value is an object and not a conditional operator, translate it recursively
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const innerKeys = Object.keys(value);
        const isConditional = innerKeys.every(k => CONDITIONAL_OPERATORS.has(k));

        // If all inner keys are conditional, translate the field name and keep conditions as-is
        if (isConditional) {
          translatedSelector[translatedField] = value;
        } else {
          // Otherwise, translate recursively
          translatedSelector[translatedField] = translateSelector(value, fieldMap);
        }
      } else {
        // Primitive or array value, assign directly
        translatedSelector[translatedField] = value;
      }
    }
  }

  return translatedSelector;
}


const transformToDocumentFormat = function (data: Record<string, any>, entityClass: EntityClass, fieldMap: Record<string, string>): Record<string, any> {

  const transformedData: Record<string, any> = {};

  data.type = entityClass.type; // add type

  // Map attributes to the document fields according to fieldMap
  for (const [attribute, field] of Object.entries(fieldMap)) {
    if (data.hasOwnProperty(attribute)) {
      // Handle dot notation for nested fields
      const fieldParts = field.split('.');

      // Create nested objects if necessary
      let current = transformedData;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!current[fieldParts[i]]) {
          current[fieldParts[i]] = {};  // Create a nested object if it doesn't exist
        }
        current = current[fieldParts[i]];  // Move down to the next level
      }

      // Set the value at the final part of the dot notation
      current[fieldParts[fieldParts.length - 1]] = data[attribute];
    }
  }

  // Add unmapped attributes directly to the transformed data
  for (const [attribute, value] of Object.entries(data)) {
    if (!fieldMap[attribute]) {
      transformedData[attribute] = value;
    }
  }

  return transformedData;
}


// utils
const inverseTransform = function (document: Record<string, any>, fieldMap: Record<string, string>): Record<string, any> {
  const originalData: Record<string, any> = {};

  // Iterate over the field map to map fields back to attributes
  for (const [attribute, fieldPath] of Object.entries(fieldMap)) {
    const fieldParts = fieldPath.split('.');  // Split the field path by dot notation

    // Navigate through the document to get the value of the nested field
    let value = document as any;
    for (const part of fieldParts) {
      if (value && value.hasOwnProperty(part)) {
        value = value[part];
      } else {
        value = undefined;
        break;
      }
    }

    // If a valid value is found, assign it to the originalData using the attribute name
    if (value !== undefined) {
      originalData[attribute] = value;
    }
  }

  // Add any unmapped fields directly to the original data
  for (const [field, value] of Object.entries(document)) {
    if (!Object.values(fieldMap).some(mappedField => field.startsWith(mappedField.split('.')[0]))) {
      originalData[field] = value;
    }
  }

  return originalData;
};


const findUsingMango = async function (selector: Nano.MangoSelector = {}, options: MangoOptions = {}, entityClass: EntityClass, connection: DocumentScope<Nano.MaybeDocument>, fieldMap: Record<string, any>): Promise<Nano.MangoResponse<Nano.MaybeDocument>> {
  try {


    let query: MangoQuery = {
      ...options,  // Spread the properties from MangoOptions
      selector,    // Add the selector
    };

    // add type
    query.selector[CouchRepository.getFieldNameFromFieldMap(fieldMap, 'type')] = entityClass.type;


    // Execute the query
    return await connection.find(query);
  } catch (err) {
    throw err;
  }
}

abstract class CouchRepository {

  private _dataSource: DataSource; // Type from nano library
  private validator: Validation;
  private entityClass: EntityClass;
  private fieldMap: Record<string, string>;

  constructor(ds: DataSource, ajvOptions: any, entityClass: EntityClass) {
    // Check if entityClass extends BaseEntity
    if (!(entityClass.prototype instanceof ActiveRecordEntity) && !(entityClass.prototype instanceof DataMapperEntity)) {
      throw new Error(`entityClass must extend ActiveRecordEntity or DataMapperEntity`);
    }

    this._dataSource = ds;
    this.entityClass = entityClass;
    this.validator = new Validation(ajvOptions, this.entityClass.schemaOrSchemaId);

    // Get the fieldMap from the entity class, but filter out _id and _rev
    const entityFieldMap = entityClass.fieldMap;

    // Create a new fieldMap by excluding _id and _rev as keys and values
    this.fieldMap = Object.entries(entityFieldMap)
      .filter(([key, value]) => key !== '_id' && key !== '_rev' && value !== '_id' && value !== '_rev')
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

  }

  get dataSource() {
    return this._dataSource;
  }

  // 1. Find a document by its ID
  async find(id: string): Promise<BaseEntity> {
    try {
      if (!id) {
        throw new Error("ID must be provided");
      }

      const res = this.findOne({ _id: id })

      return res;
    } catch (err) {
      throw err;
    }
  }


  // 2. Find one document using a Mango selector
  async findOne(selector: MangoSelector, options: MangoOptions = {}): Promise<BaseEntity> {
    try {

      const res = await findUsingMango(
        translateSelector(selector, this.fieldMap),
        options,
        this.entityClass,
        this.dataSource.connection,
        this.fieldMap);

      if (res.docs.length === 0) {
        throw new DocumentNotFoundError(selector);
      }

      return new this.entityClass(inverseTransform(res.docs[0], this.fieldMap));
    } catch (err) {
      throw err;
    }
  }

  // 4. Find many documents using a Mango selector
  async findMany(selector: MangoSelector, options: MangoOptions = {}): Promise<BaseEntity[]> {
    try {
      const res = await findUsingMango(
        translateSelector(selector, this.fieldMap),
        options,
        this.entityClass, this.dataSource.connection, this.fieldMap);

      return res.docs.map((doc) => new this.entityClass(inverseTransform(doc, this.fieldMap)));
    } catch (err) {
      throw err;
    }
  }

  // 5. Find all documents for the entity type
  async findAll(options: MangoOptions = {}): Promise<BaseEntity[]> {
    try {
      const res = await findUsingMango({}, options, this.entityClass, this.dataSource.connection, this.fieldMap);

      return res.docs.map((doc) => new this.entityClass(inverseTransform(doc, this.fieldMap)));
    } catch (err) {
      throw err;
    }
  }

  async save(data: BaseEntity): Promise<BaseEntity> {
    try {
      if (!(data instanceof this.entityClass)) {
        throw new Error(`Data must be an instance of ${this.entityClass.name}`);
      }

      let existingDoc: any = null;

      // Check if this is an update (document exists)
      if (data.id) {
        try {
          existingDoc = await this.find(data.id);
        } catch (error) {
          if (!(error instanceof DocumentNotFoundError)) {
            throw error; // Only suppress "not found" errors
          }
        }
      }

      // Merge existing data with new data
      const transformedData = transformToDocumentFormat(
        { ...existingDoc, ...data },
        this.entityClass,
        this.fieldMap
      );

      // Validate the transformed data
      validate(transformedData, this.validator);

      // Keep `_id` and `_rev` only if updating
      if (existingDoc) {
        transformedData._id = existingDoc.id;
        transformedData._rev = existingDoc.rev;
      }

      // Insert/update the document
      const response = await this.dataSource.connection.insert(transformedData);

      // Return the newly created/updated entity
      return this.find(response.id);
    } catch (err) {
      throw err;
    }
  }

  // 8. Delete a document by ID
  async delete(id: string): Promise<{ message: string }> {
    try {
      const existingDoc = await this.find(id);
      if (existingDoc === null) {
        throw new Error("Document does not exists")
      }
      await this.dataSource.connection.destroy(id, existingDoc.rev as string);
      return { message: "Document deleted successfully" };
    } catch (err) {
      throw err;
    }
  }

  // expose the connection
  get dbConnection() {
    return this.dataSource.connection;
  }


  static getFieldNameFromFieldMap(fieldMap: Record<string, string>, entityAttr: string): string {

    // If a custom mapping exists in the fieldMap, return it
    if (fieldMap[entityAttr]) {
      return fieldMap[entityAttr];
    }

    // If no custom mapping, return the entity attribute name as the field name
    return entityAttr;
  }

}

export default CouchRepository;
