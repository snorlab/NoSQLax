import Nano, { DocumentScope } from 'nano';
interface DataSourceConfig {
    url: string;
    username?: string;
    password?: string;
    database: string;
}
declare class DataSource {
    private _connection;
    constructor(config: DataSourceConfig);
    /**
     * Get the database connection
     */
    get connection(): DocumentScope<Nano.MaybeDocument>;
}
export default DataSource;
