import Nano, { MangoQuery, MangoSelector } from "nano";
import BaseEntity from './BaseEntity';
import DataSource from "./DataSource";
type MangoOptions = Omit<MangoQuery, 'selector'>;
type EntityClass = {
    fieldMap: Record<string, string>;
    new (data: Record<string, any>): BaseEntity;
    schemaOrSchemaId: string | object;
    type: string;
    [key: string]: any;
};
declare abstract class CouchRepository {
    private dataSource;
    private validator;
    private entityClass;
    private fieldMap;
    constructor(ds: DataSource, ajvOptions: any, entityClass: EntityClass);
    find(id: string): Promise<BaseEntity>;
    findOne(selector: MangoSelector, options?: MangoOptions): Promise<BaseEntity>;
    findMany(selector: MangoSelector, options?: MangoOptions): Promise<BaseEntity[]>;
    findAll(options?: MangoOptions): Promise<BaseEntity[]>;
    save(data: BaseEntity): Promise<BaseEntity>;
    delete(id: string): Promise<{
        message: string;
    }>;
    get dbConnection(): Nano.DocumentScope<Nano.MaybeDocument>;
    static getFieldNameFromFieldMap(fieldMap: Record<string, string>, entityAttr: string): string;
}
export default CouchRepository;
