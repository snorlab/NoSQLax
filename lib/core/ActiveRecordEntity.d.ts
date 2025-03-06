import BaseEntity from "./BaseEntity";
import DataSource from "./DataSource";
import { MangoQuery, MangoSelector } from "nano";
type MangoOptions = Omit<MangoQuery, 'selector'>;
declare abstract class ActiveRecordEntity extends BaseEntity {
    private static repoMap;
    constructor(data: {
        _id?: string;
        _rev?: string;
        [key: string]: any;
    });
    protected static attachDataSource(dataSource: DataSource, ajvOptions: any): void;
    private static getRepo;
    static find(id: string): Promise<BaseEntity>;
    static findOne(selector: MangoSelector, options?: MangoOptions): Promise<BaseEntity>;
    static get dataSource(): DataSource;
    static findMany(selector: MangoSelector, options?: MangoOptions): Promise<BaseEntity[]>;
    static findAll(options?: MangoOptions): Promise<BaseEntity[]>;
    static save(data: BaseEntity): Promise<BaseEntity>;
    save(): Promise<BaseEntity>;
    static delete(id: string): Promise<{
        message: string;
    }>;
    delete(): Promise<{
        message: string;
    }>;
}
export default ActiveRecordEntity;
