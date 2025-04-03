declare class VertexDb {
    constructor(config?: {
        logging?: boolean | (msg: string) => void;
        timestamps?: boolean;
        softDelete?: boolean;
    });

    static AUTO_INCREMENT: string;
    static OPERATORS: {
        EQ: string;
        GT: string;
        LT: string;
        GTE: string;
        LTE: string;
        NEQ: string;
        LIKE: string;
        IN: string;
    };

    setLogging(enable: boolean | (msg: string) => void): VertexDb;
    setTable(tableName: string, data?: any[], schema?: object): VertexDb;
    createTable(tableName: string, schema?: object): VertexDb;
    dropTable(tableName: string): VertexDb;
    createTrigger(tableName: string, triggerName: string, trigger: ({ operation: 'insert' | 'update' | 'delete', OLD: object, NEW: object}) => boolean | void): VertexDb;
    dropTrigger(tableName: string, triggerName: string): VertexDb;
    exists(tableName: string): boolean;
    addColumn(tableName: string, columnName: string, defaultValue?: any): VertexDb;
    dropColumn(tableName: string, columnName: string): VertexDb;
    setRelation(tableName: string, relatedTable: string, type: string, foreignKey: string): VertexDb;
    get(tableName: string): any[];
    getOne(tableName: string): any | null;
    search(conditions: object): VertexDb;
    orderBy(column: string, direction?: 'ASC' | 'DESC'): VertexDb;
    limit(limit: number, offset?: number): VertexDb;
    whereOperator(field: string, operator: string, value: any): VertexDb;
    where(field: string, value: any, operator?: string): VertexDb;
    orWhere(field: string, value: any): VertexDb;
    whereIn(field: string, values: any[]): VertexDb;
    whereLike(field: string, pattern: string): VertexDb;
    count(tableName: string): number;
    distinct(tableName: string, column: string): any[];
    avg(tableName: string, column: string): number;
    sum(tableName: string, column: string): number;
    min(tableName: string, column: string): any;
    max(tableName: string, column: string): any;
    groupBy(tableName: string, column: string): object;
    insert(tableName: string, data: object): VertexDb;
    getLastInsertId(): number | null;
    bulkInsert(tableName: string, dataArray: object[]): VertexDb;
    update(tableName: string, data: object): VertexDb;
    delete(tableName: string): VertexDb;
    toJSON(tableName: string): string;
    fromJSON(tableName: string, jsonData: string): VertexDb;
    getLastError(): Error | null;
    backup(): object;
    restore(backup: object): VertexDb;
    join(table1: string, table2: string, key1: string, key2: string): any[];
    transaction(callback: (db: VertexDb) => void): VertexDb;
    createIndex(tableName: string, columns: string[]): VertexDb;
    getStats(): object;
    paginate(tableName: string, page?: number, perPage?: number): object;
    raw(tableName: string, filterFn: (row: any) => boolean): any[];
    truncate(tableName: string): VertexDb;
    getSchema(tableName: string): object | null;
    updateSchema(tableName: string, schema: object): VertexDb;
}

export = VertexDb;
