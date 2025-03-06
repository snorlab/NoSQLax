import BaseEntity from "./BaseEntity";
import ActiveRecordEntity from "./ActiveRecordEntity";

// Type for the entity class constructor
type EntityClass = {
    fieldMap: Record<string, string>;
    new(data: Record<string, any>): BaseEntity;
    schemaOrSchemaId: string | object;
    type: string;
    [key: string]: any;
};

export default function createActiveRecordEntity(data: { _id?: string; _rev?: string;[key: string]: any }): ActiveRecordEntity {
    return new (class extends ActiveRecordEntity { })(data);
}