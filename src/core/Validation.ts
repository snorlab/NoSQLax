import Ajv, { Options, ValidateFunction } from 'ajv'; // Import Ajv types
import { ValidationError } from './ValidationError';

class Validation {
  private ajv: Ajv;
  validate: ValidateFunction;

  constructor(ajvOptions: Options, schemaOrSchemaId: object | string) {
    // Initialize the AJV instance with options
    this.ajv = new Ajv(ajvOptions);

    // Check if the schemaOrSchemaId is an object (schema) or a string (schema ID)
    if (typeof schemaOrSchemaId === 'object') {
      // Compile the schema if it's an object
      this.validate = this.ajv.compile(schemaOrSchemaId);
    } else if (typeof schemaOrSchemaId === 'string') {
      // Retrieve the schema if it's a string
      this.validate = this.ajv.getSchema(schemaOrSchemaId) as ValidateFunction;

      // Throw an error if the schema is not found
      if (!this.validate) {
        throw new Error(`Schema with ID "${schemaOrSchemaId}" not found`);
      }
    } else {
      throw new Error('Invalid schema or schema ID provided');
    }
  }

  validateData(data: any): void {

    const valid = this.validate(data); // Validate the data

    if (!valid) {
      const errorDetails = this.validate.errors
        ?.map((err) => JSON.stringify(err).replace(/\"/g, ''))
        .join(', ');

      // Throwing custom validation error with detailed error message
      throw new ValidationError(errorDetails || 'Unknown validation error');
    }
  }
}

export default Validation;
