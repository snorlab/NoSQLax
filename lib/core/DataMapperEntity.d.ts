import BaseEntity from "./BaseEntity";
declare abstract class DataMapperEntity extends BaseEntity {
    constructor(data: {
        _id?: string;
        _rev?: string;
        [key: string]: any;
    });
}
export default DataMapperEntity;
