// src/BaseEntity.ts
abstract class BaseEntity {
  private _id?: string; 
  private _rev?: string;

  static type: string;  
  static schemaOrSchemaId: string | object;
  
  // Map from entity attributes to document fields, type is implicitly handled
  static fieldMap: Record<string, string> = { type: "type" };  // Default fieldMap, type is implicitly required

  constructor(data: { _id?: string; _rev?: string; [key: string]: any }) {
    this._id = data._id; 
    this._rev = data._rev;

    // Ensure schemaOrSchemaId is defined
    if ((this.constructor as typeof BaseEntity).schemaOrSchemaId === undefined) {
      throw new Error(`${this.constructor.name} must define schemaOrSchemaId`);
    }
    if ((this.constructor as typeof BaseEntity).type === undefined) {
      throw new Error(`${this.constructor.name} must define type`);
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
