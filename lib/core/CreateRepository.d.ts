import BaseEntity from "./BaseEntity";
import DataSource from "./DataSource";
import CouchRepository from "./CouchRepository";
type EntityClass = {
    fieldMap: Record<string, string>;
    new (data: Record<string, any>): BaseEntity;
    schemaOrSchemaId: string | object;
    type: string;
    [key: string]: any;
};
export default function createRepository(ds: DataSource, ajvOptions: any, entityClass: EntityClass): CouchRepository;
export {};
