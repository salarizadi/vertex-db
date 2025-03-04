# VertexDB 💾

![License](https://img.shields.io/npm/l/@salarizadi/vertex-db)
![Version](https://img.shields.io/npm/v/@salarizadi/vertex-db)
![Downloads](https://img.shields.io/npm/dt/@salarizadi/vertex-db)

A lightweight, powerful in-memory database for JavaScript applications with support for multiple data structures, relationships, transactions, and schema validation. Perfect for both browser and Node.js environments.

## Features ✨

- 🏃‍♂️ Lightweight and blazing fast in-memory operations
- 📊 Table-based data structure with relationships
- 🔒 Schema validation and type checking
- 🕒 Automatic timestamps
- 🗑️ Soft delete capability
- 📝 Transaction support with rollback
- 🔍 Advanced querying with multiple conditions
- 📈 Indexing for faster searches
- 🔄 Import/Export JSON functionality
- 📱 Browser and Node.js compatibility
- 🧮 Aggregation functions (count, avg, sum, min, max)
- 📄 Pagination support
- 🎯 Custom raw queries

## Installation 📦

### NPM
```bash
npm install @salarizadi/vertex-db
```

### Yarn
```bash
yarn add @salarizadi/vertex-db
```

### Browser
```html
<script src="https://unpkg.com/@salarizadi/vertex-db"></script>
```

## Quick Start 🚀

```javascript
// Initialize VertexDB
const db = new VertexDB({
    logging: true,
    timestamps: true,
    softDelete: true
});

// Create a table with schema
const userSchema = {
    id: { type: 'number', required: true },
    name: { type: 'string', required: true },
    email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    age: { type: 'number', min: 18, max: 100 }
};

// Insert data
db.insert('users', {
    id: VertexDB.AUTO_INCREMENT,
    name: 'John Doe',
    email: 'john@example.com',
    age: 20
});

// Query data
const users = db.where('name', 'John Doe').get('users');
```

## Advanced Usage 🔥

### Relationships
```javascript
// Define relationships between tables
db.setRelation('posts', 'users', 'hasOne', 'user_id');

// Join tables
const postsWithUsers = db.join('posts', 'users', 'user_id', 'id');
```

### Transactions
```javascript
db.transaction((tx) => {
    tx.insert('users', { /* user data */ });
    tx.insert('posts', { /* post data */ });
    // Will rollback if any operation fails
});
```

### Schema Validation
```javascript
const schema = {
    title: { type: 'string', required: true },
    views: { type: 'number', min: 0 },
    status: { type: 'string', pattern: /^(draft|published)$/ }
};

db.createTable('posts', schema);
```

### Advanced Queries
```javascript
db.whereOperator('age', '>', 18)
  .whereLike('name', '%John%')
  .whereIn('status', ['active', 'pending'])
  .orderBy('created_at', 'DESC')
  .limit(10)
  .get('users');
```

### Pagination
```javascript
const result = db.paginate('users', 1, 10);
console.log(result.data); // Current page data
console.log(result.pagination); // Pagination info
```

## API Reference 📚

### Core Methods
- `createTable(tableName, schema?)` - Create a new table
- `setTable(tableName, data, schema?)` - Set table data with optional schema
- `insert(tableName, data)` - Insert a single record
- `update(tableName, data)` - Update records matching conditions
- `delete(tableName)` - Delete records matching conditions
- `get(tableName)` - Get all matching records
- `getOne(tableName)` - Get first matching record

### Query Methods
- `where(field, value)` - Add WHERE condition
- `whereOperator(field, operator, value)` - Add WHERE condition with operator
- `whereLike(field, pattern)` - Add LIKE condition
- `whereIn(field, values)` - Add WHERE IN condition
- `orderBy(column, direction)` - Sort results
- `limit(limit, offset)` - Limit results
- `paginate(tableName, page, perPage)` - Get paginated results

### Utilities
- `backup()` - Create database backup
- `restore(backup)` - Restore from backup
- `toJSON(tableName)` - Export table to JSON
- `fromJSON(tableName, jsonData)` - Import from JSON
- `getStats()` - Get database statistics
- `truncate(tableName)` - Clear table data

## License 📄

MIT © [Salar Izadi](https://github.com/salarizadi)

## Contributing 🤝

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/salarizadi/vertex-db/issues).

## Support 💖

Give a ⭐️ if this project helped you!

---

Made with ❤️ by [Salar Izadi](https://github.com/salarizadi)