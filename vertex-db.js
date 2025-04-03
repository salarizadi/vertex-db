/**
 *  Copyright (c) 2025
 *  @Version : 1.0.0
 *  @Author  : https://salarizadi.ir
 */

;(function (root, factory) {
    // AMD
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    }
    // CommonJS (Node.js)
    else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    }
    // Browser global
    else {
        root.VertexDB = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    class VertexDB {

        constructor (config = {}) {
            this._tables = new Map();
            this._triggers = new Map();
            this._whereConditions = [];
            this._operator = 'AND';
            this._orderBy = null;
            this._limit = null;
            this._offset = 0;
            this._searchConditions = [];
            this._relationships = new Map();
            this._logger = config.logging || false;
            this._timestamps = config.timestamps || false;
            this._softDelete = config.softDelete || false;
            this._lastError = null;
        }

        /**
         * Enable or disable logging
         * @param {boolean or logger function} enable
         * @returns {VertexDB}
         */
        setLogging (enable) {
            this._logger = enable;
            return this;
        }

        /**
         * Log an operation if logging is enabled
         * @param {string} operation
         * @param {Object} details
         */
        _log (operation, details) {
            if (typeof this._logger === 'function') {
                this._logger(`[${new Date().toISOString()}] ${operation}: ${JSON.stringify(details)}`);
            }
            else if (this._logger) {
                console.log(`[${new Date().toISOString()}] ${operation}:`, details);
            }
        }

        /**
         * Fire triggers
         * @param {string} tableName
         * @param {string} operation
         * @param {Object} OLD
         * @param {Object} NEW
         */
        _trigger (tableName, operation, OLD = null, NEW = null) {
            let shouldCommit = true
            for (const [triggerName, trigger] of (this._triggers.get(tableName)?.entries() || [])) {
                try {
                    if (trigger({ operation, OLD, NEW }) === false) shouldCommit = false
                }
                catch (err) {
                    this._log(`${operation} trigger`, { tableName, triggerName, error: err, OLD, NEW });
                }
            }
            return shouldCommit
        }

        /**
         * Create or update a table with schema validation
         * @param {string} tableName
         * @param {Array} data
         * @param {Object} schema
         * @returns {VertexDB}
         */
        setTable (tableName, data = [], schema = null) {
            if (!Array.isArray(data)) {
                throw new Error('Data must be an array');
            }

            if (schema) {
                this._validateSchema(data, schema);
            }

            if (this._timestamps) {
                data = data.map(row => ({
                    ...row,
                    created_at: row.created_at || new Date().toISOString(),
                    updated_at: row.updated_at || new Date().toISOString()
                }));
            }

            this._tables.set(tableName, data);
            this._log('setTable', {tableName, rowCount: data.length});
            return this;
        }

        /**
         * Create a new trigger
         * @param {string} tableName
         * @param {string} triggerName
         * @param {function({operation: string, OLD: *, NEW: *}): void} trigger
         */
        createTrigger (tableName, triggerName, trigger) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }
            if (!this._triggers.has(tableName)) this._triggers.set(tableName, new Map);
            if (this._triggers.get(tableName).has(triggerName)) {
                throw new Error(`Trigger '${triggerName}' already exists`);
            }
            this._triggers.get(tableName).set(triggerName, trigger);
            return this;
        }

        /**
         * Drop a trigger
         * @param {string} tableName
         * @param {string} triggerName
         */
        dropTrigger (tableName, triggerName) {
            if (!this._triggers.has(tableName) || !this._triggers.get(tableName).has(triggerName)) {
                throw new Error(`Trigger '${triggerName} on table '${tableName}' does not exist`);
            }
            this._triggers.delete(tableName);
            return this;
        }
            

        /**
         * Create a new table with schema
         * @param {string} tableName
         * @param {Object} schema
         * @returns {VertexDB}
         */
        createTable (tableName, schema = null) {
            if (this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' already exists`);
            }

            this._tables.set(tableName, []);
            if (schema) {
                this._schemas = this._schemas || new Map();
                this._schemas.set(tableName, schema);
            }

            this._log('createTable', {tableName, hasSchema: !!schema});
            return this;
        }

        /**
         * Drop a table
         * @param {string} tableName
         * @returns {VertexDB}
         */
        dropTable (tableName) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            this._tables.delete(tableName);
            this._triggers.delete(tableName);

            if (this._schemas) {
                this._schemas.delete(tableName);
            }
            if (this._relationships) {
                this._relationships.delete(tableName);
            }
            if (this._indexes) {
                for (const key of this._indexes.keys()) {
                    if (key.startsWith(`${tableName}:`)) {
                        this._indexes.delete(key);
                    }
                }
            }

            this._log('dropTable', {tableName});
            return this;
        }

        /**
         * Check if a record exists
         * @param {string} tableName
         * @returns {boolean}
         */
        exists (tableName) {
            return this.count(tableName) > 0;
        }

        /**
         * Add column to existing table
         * @param {string} tableName
         * @param {string} columnName
         * @param {*} defaultValue
         * @returns {VertexDB}
         */
        addColumn (tableName, columnName, defaultValue = null) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            const table = this._tables.get(tableName);
            const updatedTable = table.map(row => ({
                ...row,
                [columnName]: defaultValue
            }));

            this._tables.set(tableName, updatedTable);
            this._log('addColumn', {tableName, columnName});
            return this;
        }

        /**
         * Remove column from table
         * @param {string} tableName
         * @param {string} columnName
         * @returns {VertexDB}
         */
        dropColumn (tableName, columnName) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            const table = this._tables.get(tableName);
            const updatedTable = table.map(row => {
                const {[columnName]: removed, ...rest} = row;
                return rest;
            });

            this._tables.set(tableName, updatedTable);
            this._log('dropColumn', {tableName, columnName});
            return this;
        }

        /**
         * Define a relationship between tables
         * @param {string} tableName
         * @param {string} relatedTable
         * @param {string} type - 'hasOne', 'hasMany', 'belongsTo'
         * @param {string} foreignKey
         * @returns {VertexDB}
         */
        setRelation (tableName, relatedTable, type, foreignKey) {
            if (!this._relationships.has(tableName)) {
                this._relationships.set(tableName, []);
            }
            this._relationships.get(tableName).push({
                table: relatedTable,
                type,
                foreignKey
            });
            return this;
        }

        /**
         * Get all matching rows after applying conditions
         * @param {string} tableName
         * @returns {Array}
         */
        get (tableName) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            let results = [...this._tables.get(tableName)];

            if (this._softDelete) {
                results = results.filter(row => !row.deleted_at);
            }

            results = this._applyConditions(results);
            this._resetConditions();
            this._log('get', {tableName, resultCount: results.length});
            return results;
        }

        /**
         * Get first matching row
         * @param {string} tableName
         * @returns {Object|null}
         */
        getOne (tableName) {
            const results = this.get(tableName);
            return results.length > 0 ? results[0] : null;
        }

        /**
         * Search across multiple columns
         * @param {Object} conditions - {column: searchTerm}
         * @returns {VertexDB}
         */
        search (conditions) {
            this._searchConditions = Object.entries(conditions);
            return this;
        }

        /**
         * Order results by column
         * @param {string} column
         * @param {string} direction - 'ASC' or 'DESC'
         * @returns {VertexDB}
         */
        orderBy (column, direction = 'ASC') {
            this._orderBy = {column, direction: direction.toUpperCase()};
            return this;
        }

        /**
         * Limit number of results
         * @param {number} limit
         * @param {number} offset
         * @returns {VertexDB}
         */
        limit (limit, offset = 0) {
            this._limit = limit;
            this._offset = offset;
            return this;
        }

        /**
         * Compare values using different operators
         * @param {string} field
         * @param {string} operator - '=', '>', '<', '>=', '<=', '!=', 'LIKE', 'IN'
         * @param {any} value
         * @returns {VertexDB}
         */
        whereOperator (field, operator, value) {
            this._whereConditions.push({field, operator, value});
            return this;
        }

        /**
         * Add where condition with AND
         * @param {string} field
         * @param {any} value
         * @param {string} operator
         * @returns {VertexDB}
         */
        where (field, value, operator = 'AND') {
            this._whereConditions.push({field, value, operator});
            return this;
        }

        /**
         * Add where condition with OR
         * @param {string} field
         * @param {any} value
         * @returns {VertexDB}
         */
        orWhere (field, value) {
            return this.where(field, value, 'OR');
        }

        /**
         * Add where IN condition
         * @param {string} field
         * @param {Array} values
         * @returns {VertexDB}
         */
        whereIn (field, values) {
            if (!Array.isArray(values)) {
                throw new Error('Values must be an array');
            }
            this._whereConditions.push({field, operator: 'IN', value: values});
            return this;
        }

        /**
         * Add where LIKE condition
         * @param {string} field
         * @param {string} pattern
         * @returns {VertexDB}
         */
        whereLike (field, pattern) {
            this._whereConditions.push({field, operator: 'LIKE', value: pattern});
            return this;
        }

        /**
         * Get count of matching rows
         * @param {string} tableName
         * @returns {number}
         */
        count (tableName) {
            return this.get(tableName).length;
        }

        /**
         * Get distinct values from a column
         * @param {string} tableName
         * @param {string} column
         * @returns {Array}
         */
        distinct (tableName, column) {
            const results = this.get(tableName);
            return [...new Set(results.map(row => row[column]))];
        }

        /**
         * Calculate average of a numeric column
         * @param {string} tableName
         * @param {string} column
         * @returns {number}
         */
        avg (tableName, column) {
            const results = this.get(tableName);
            if (results.length === 0) return 0;
            return results.reduce((sum, row) => sum + (row[column] || 0), 0) / results.length;
        }

        /**
         * Calculate sum of a numeric column
         * @param {string} tableName
         * @param {string} column
         * @returns {number}
         */
        sum (tableName, column) {
            const results = this.get(tableName);
            return results.reduce((sum, row) => sum + (row[column] || 0), 0);
        }

        /**
         * Find minimum value in a column
         * @param {string} tableName
         * @param {string} column
         * @returns {any}
         */
        min (tableName, column) {
            const results = this.get(tableName);
            if (results.length === 0) return null;
            return Math.min(...results.map(row => row[column]));
        }

        /**
         * Find maximum value in a column
         * @param {string} tableName
         * @param {string} column
         * @returns {any}
         */
        max (tableName, column) {
            const results = this.get(tableName);
            if (results.length === 0) return null;
            return Math.max(...results.map(row => row[column]));
        }

        /**
         * Group results by a column
         * @param {string} tableName
         * @param {string} column
         * @returns {Object}
         */
        groupBy (tableName, column) {
            const results = this.get(tableName);
            return results.reduce((groups, row) => {
                const key = row[column];
                if (!groups[key]) groups[key] = [];
                groups[key].push(row);
                return groups;
            }, {});
        }

        /**
         * Apply all conditions and modifiers to get results
         * @param {Array} data
         * @returns {Array}
         */
        _applyConditions (data) {
            let results = [...data];

            // Apply where conditions
            if (this._whereConditions.length > 0) {
                results = results.filter(row => {
                    return this._whereConditions.every(condition => {
                        switch (condition.operator) {
                            case 'IN':
                                return condition.value.includes(row[condition.field]);
                            case 'LIKE':
                                return String(row[condition.field]).includes(condition.value.replace(/%/g, ''));
                            case '>':
                                return row[condition.field] > condition.value;
                            case '<':
                                return row[condition.field] < condition.value;
                            case '>=':
                                return row[condition.field] >= condition.value;
                            case '<=':
                                return row[condition.field] <= condition.value;
                            case '!=':
                                return row[condition.field] !== condition.value;
                            default:
                                return row[condition.field] === condition.value;
                        }
                    });
                });
            }

            // Apply search conditions
            if (this._searchConditions.length > 0) {
                results = results.filter(row => {
                    return this._searchConditions.some(([column, term]) => {
                        return String(row[column]).toLowerCase().includes(String(term).toLowerCase());
                    });
                });
            }

            // Apply ordering
            if (this._orderBy) {
                results.sort((a, b) => {
                    if (this._orderBy.direction === 'ASC') {
                        return a[this._orderBy.column] > b[this._orderBy.column] ? 1 : -1;
                    }
                    return a[this._orderBy.column] < b[this._orderBy.column] ? 1 : -1;
                });
            }

            // Apply pagination
            if (this._limit !== null) {
                results = results.slice(this._offset, this._offset + this._limit);
            }

            return results;
        }

        /**
         * Insert data with validation and timestamps
         * @param {string} tableName
         * @param {Object} data
         * @returns {VertexDB}
         */
        insert (tableName, data) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            const table = this._tables.get(tableName);
            const newData = {...data};

            if (data.id === 'AUTO_INCREMENT') {
                newData.id = this._getNextId(tableName);
            }

            // Store the last insert ID
            this._lastInsertId = newData.id;

            if (this._timestamps) {
                newData.created_at = new Date().toISOString();
                newData.updated_at = new Date().toISOString();
            }

            const shouldInsert = this._trigger(tableName, 'insert', null, newData)
            if (shouldInsert) table.push(newData);
            this._log('insert', {tableName, data: newData});
            return this;
        }

        /**
         * Get the last insert ID (similar to mysqli_insert_id)
         * @returns {number|null} - The ID of the last inserted record or null if no inserts
         */
        getLastInsertId () {
            if (!this._lastInsertId) {
                return null;
            }

            this._log('getLastInsertId', {id: this._lastInsertId});
            return this._lastInsertId;
        }

        /**
         * Bulk insert multiple rows
         * @param {string} tableName
         * @param {Array} dataArray
         * @returns {VertexDB}
         */
        bulkInsert (tableName, dataArray) {
            dataArray.forEach(data => this.insert(tableName, data));
            return this;
        }

        /**
         * Update with timestamps
         * @param {string} tableName
         * @param {Object} data
         * @returns {VertexDB}
         */
        update (tableName, data) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            const updateData = {...data};
            if (this._timestamps) {
                updateData.updated_at = new Date().toISOString();
            }

            const table = this._tables.get(tableName);
            const updatedTable = table.map(row => {
                let shouldUpdate = this._whereConditions.every(condition =>
                    row[condition.field] === condition.value
                );
                let newData = shouldUpdate ? {...row, ...updateData} : row
                shouldUpdate = shouldUpdate && this._trigger(tableName, 'update', row, newData)
                return shouldUpdate ? newData : row;
            });

            this._tables.set(tableName, updatedTable);
            this._log('update', {tableName, data: updateData});
            this._resetConditions();
            return this;
        }

        /**
         * Soft delete implementation
         * @param {string} tableName
         * @returns {VertexDB}
         */
        delete (tableName) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            const table = this._tables.get(tableName);
            if (this._softDelete) {
                // Soft delete - just mark as deleted
                const updatedTable = table.map(row => {
                    let shouldDelete = this._whereConditions.every(condition =>
                        row[condition.field] === condition.value
                    );
                    shouldDelete = shouldDelete && this._trigger(tableName, 'delete', row, null)
                    return shouldDelete ? {...row, deleted_at: new Date().toISOString()} : row;
                });
                this._tables.set(tableName, updatedTable);
            } else {
                // Hard delete - remove the records
                const filteredTable = table.filter(row => {
                    let shouldDelete = this._whereConditions.every(condition =>
                        row[condition.field] === condition.value
                    );
                    shouldDelete = shouldDelete && this._trigger(tableName, 'delete', row, null)
                    return !shouldDelete
                });
                this._tables.set(tableName, filteredTable);
            }

            this._log('delete', {tableName, softDelete: this._softDelete});
            this._resetConditions();
            return this;
        }

        /**
         * Export table data to JSON
         * @param {string} tableName
         * @returns {string}
         */
        toJSON (tableName) {
            const data = this.get(tableName);
            return JSON.stringify(data, null, 2);
        }

        /**
         * Import data from JSON
         * @param {string} tableName
         * @param {string} jsonData
         * @returns {VertexDB}
         */
        fromJSON (tableName, jsonData) {
            try {
                const data = JSON.parse(jsonData);
                this.setTable(tableName, data);
                return this;
            } catch (error) {
                this._lastError = error;
                throw new Error('Invalid JSON data');
            }
        }

        /**
         * Get the last error
         * @returns {Error|null}
         */
        getLastError () {
            return this._lastError;
        }

        /**
         * Get current timestamp in UTC
         * @returns {string}
         */
        _getCurrentTimestamp () {
            return new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        /**
         * Validate schema for a table
         * @param {Object} schema
         * @param {Object} data
         * @private
         */
        _validateSchema (data, schema) {
            for (const row of data) {
                for (const [field, rules] of Object.entries(schema)) {
                    if (rules.required && (row[field] === undefined || row[field] === null)) {
                        throw new Error(`Field '${field}' is required`);
                    }
                    if (rules.type && typeof row[field] !== rules.type) {
                        throw new Error(`Field '${field}' must be of type ${rules.type}`);
                    }
                    if (rules.min && row[field] < rules.min) {
                        throw new Error(`Field '${field}' must be at least ${rules.min}`);
                    }
                    if (rules.max && row[field] > rules.max) {
                        throw new Error(`Field '${field}' must be at most ${rules.max}`);
                    }
                    if (rules.length && String(row[field]).length !== rules.length) {
                        throw new Error(`Field '${field}' must be exactly ${rules.length} characters long`);
                    }
                    if (rules.pattern && !rules.pattern.test(String(row[field]))) {
                        throw new Error(`Field '${field}' does not match required pattern`);
                    }
                }
            }
        }

        /**
         * Create a backup of the database
         * @returns {Object}
         */
        backup () {
            const backup = {
                timestamp: this._getCurrentTimestamp(),
                data: {},
                metadata: {
                    tables: [],
                    relationships: {}
                }
            };

            for (const [tableName, data] of this._tables.entries()) {
                backup.data[tableName] = data;
                backup.metadata.tables.push({
                    name: tableName,
                    count: data.length
                });
            }

            backup.metadata.relationships = Object.fromEntries(this._relationships);
            return backup;
        }

        /**
         * Restore database from backup
         * @param {Object} backup
         * @returns {VertexDB}
         */
        restore (backup) {
            try {
                this._tables = new Map(Object.entries(backup.data));
                this._relationships = new Map(Object.entries(backup.metadata.relationships));
                this._log('restore', {timestamp: backup.timestamp});
                return this;
            } catch (error) {
                this._lastError = error;
                throw new Error('Invalid backup data');
            }
        }

        /**
         * Join two tables
         * @param {string} table1
         * @param {string} table2
         * @param {string} key1
         * @param {string} key2
         * @returns {Array}
         */
        join (table1, table2, key1, key2) {
            const data1 = this._tables.get(table1);
            const data2 = this._tables.get(table2);

            if (!data1 || !data2) {
                throw new Error('One or both tables do not exist');
            }

            return data1.map(row1 => {
                const matching = data2.find(row2 => row2[key2] === row1[key1]);
                if (matching) {
                    // Create a new object to avoid column name conflicts
                    const joined = {};
                    // First, copy all properties from the first table
                    Object.keys(row1).forEach(key => {
                        joined[`${table1}_${key}`] = row1[key];
                    });
                    // Then, copy all properties from the second table
                    Object.keys(matching).forEach(key => {
                        joined[`${table2}_${key}`] = matching[key];
                    });
                    return joined;
                }
                return row1;
            });
        }

        /**
         * Execute a transaction
         * @param {Function} callback
         * @returns {VertexDB}
         */
        transaction (callback) {
            const backup = this.backup();
            try {
                callback(this);
                this._log('transaction', {status: 'committed'});
                return this;
            } catch (error) {
                this.restore(backup);
                this._log('transaction', {status: 'rollback', error: error.message});
                throw error;
            }
        }

        /**
         * Create table indexes for faster searching
         * @param {string} tableName
         * @param {Array} columns
         * @returns {VertexDB}
         */
        createIndex (tableName, columns) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            if (!this._indexes) {
                this._indexes = new Map();
            }

            const table = this._tables.get(tableName);
            const index = new Map();

            for (const row of table) {
                const key = columns.map(col => row[col]).join('|');
                if (!index.has(key)) {
                    index.set(key, []);
                }
                index.get(key).push(row);
            }

            this._indexes.set(`${tableName}:${columns.join('+')}`, index);
            this._log('createIndex', {tableName, columns});
            return this;
        }

        /**
         * Get database statistics
         * @returns {Object}
         */
        getStats () {
            const stats = {
                tables: {},
                totalRecords: 0,
                lastModified: this._getCurrentTimestamp(),
                indexes: [],
                relationships: []
            };

            for (const [tableName, data] of this._tables.entries()) {
                stats.tables[tableName] = {
                    count: data.length,
                    columns: data.length > 0 ? Object.keys(data[0]).length : 0
                };
                stats.totalRecords += data.length;
            }

            if (this._indexes) {
                stats.indexes = Array.from(this._indexes.keys());
            }

            if (this._relationships) {
                stats.relationships = Array.from(this._relationships.entries());
            }

            return stats;
        }

        /**
         * Paginate results
         * @param {string} tableName
         * @param {number} page
         * @param {number} perPage
         * @returns {Object}
         */
        paginate (tableName, page = 1, perPage = 10) {
            const total = this.count(tableName);
            const totalPages = Math.ceil(total / perPage);
            const offset = (page - 1) * perPage;

            const results = this.limit(perPage, offset).get(tableName);

            return {
                data: results,
                pagination: {
                    total,
                    perPage,
                    currentPage: page,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            };
        }

        /**
         * Execute raw query using custom filter function
         * @param {string} tableName
         * @param {Function} filterFn
         * @returns {Array}
         */
        raw (tableName, filterFn) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            const table = this._tables.get(tableName);
            return table.filter(filterFn);
        }

        /**
         * Clear all data from a table
         * @param {string} tableName
         * @returns {VertexDB}
         */
        truncate (tableName) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            this._tables.set(tableName, []);
            this._log('truncate', {tableName});
            return this;
        }

        /**
         * Get table schema
         * @param {string} tableName
         * @returns {Object|null}
         */
        getSchema (tableName) {
            return this._schemas ? this._schemas.get(tableName) : null;
        }

        /**
         * Update table schema
         * @param {string} tableName
         * @param {Object} schema
         * @returns {VertexDB}
         */
        updateSchema (tableName, schema) {
            if (!this._tables.has(tableName)) {
                throw new Error(`Table '${tableName}' does not exist`);
            }

            this._schemas = this._schemas || new Map();
            this._schemas.set(tableName, schema);

            // Validate existing data against new schema
            const table = this._tables.get(tableName);
            this._validateSchema(table, schema);

            this._log('updateSchema', {tableName});
            return this;
        }

        /**
         * Get next ID for auto increment
         * @param {string} tableName
         * @returns {number}
         * @private
         */
        _getNextId (tableName) {
            const table = this._tables.get(tableName);
            if (!table || table.length === 0) return 1;
            const maxId = Math.max(...table.map(row => parseInt(row.id) || 0));
            return maxId + 1;
        }

        /**
         * Reset all query conditions
         * @private
         */
        _resetConditions () {
            this._whereConditions = [];
            this._operator = 'AND';
            this._orderBy = null;
            this._limit = null;
            this._offset = 0;
            this._searchConditions = [];
        }

    }

    // Constants
    VertexDB.AUTO_INCREMENT = 'AUTO_INCREMENT';
    VertexDB.OPERATORS = {
        EQ: '=',
        GT: '>',
        LT: '<',
        GTE: '>=',
        LTE: '<=',
        NEQ: '!=',
        LIKE: 'LIKE',
        IN: 'IN'
    };

    return VertexDB;
}));
