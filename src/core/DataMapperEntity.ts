import BaseEntity from "./BaseEntity";

abstract class DataMapperEntity extends BaseEntity {
    // No other functionality for now
    constructor(data: { _id?: string; _rev?: string;[key: string]: any }) {
        super(data);
    }
}

export default DataMapperEntity;