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
    findOne(selector: MangoSelector, options?: MangoOptions): Promise<BaseEntity>;
    findMany(selector: MangoSelector, options?: MangoOptions): Promise<BaseEntity[]>;
    findAll(options?: MangoOptions): Promise<BaseEntity[]>;
    save(): Promise<BaseEntity>;
    delete(): Promise<{
        message: string;
    }>;
}
export default ActiveRecordEntity;
