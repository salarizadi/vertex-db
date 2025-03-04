// import VertexDb from '@salarizadi/vertex-db';
import VertexDb from '../../vertex-db.js';

// Define interface for User data structure
interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    createdAt?: string;
    updatedAt?: string;
}

// Define table schema
const userSchema = {
    id: { type: 'number', required: true },
    name: { type: 'string', required: true },
    email: { type: 'string', required: true },
    age: { type: 'number', required: true }
};

// Create database instance with configuration
const db = new VertexDb({
    logging: true,        // Enable logging
    timestamps: true,     // Automatically add createdAt and updatedAt
    softDelete: true      // Enable soft delete for records
});

// Create users table
db.createTable('users', userSchema);

// Prepare users data for insertion
const usersToInsert: User[] = [
    {
        id: VertexDb.AUTO_INCREMENT as any,
        name: 'John Doe',
        email: 'john@example.com',
        age: 30
    },
    {
        id: VertexDb.AUTO_INCREMENT as any,
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25
    }
];

// Bulk insert users
db.bulkInsert('users', usersToInsert);

// Various query examples

// 1. Find users older than 25
const adultUsers = db
    .where('age', 25, VertexDb.OPERATORS.GT)
    .get('users') as User[];

console.log('Adult Users:', adultUsers);

// 2. Search with LIKE operator
const searchResults = db
    .whereLike('email', '%@example.com')
    .orderBy('name', 'ASC')
    .get('users') as User[];

console.log('Email Search:', searchResults);

// 3. Using pagination
const page1 = db.paginate('users', 1, 10);
console.log('Paginated Results:', page1);

// 4. Group by age
const ageGroups = db.groupBy('users', 'age');
console.log('Age Groups:', ageGroups);

// 5. Statistics and calculations
const stats = {
    totalUsers: db.count('users'),
    averageAge: db.avg('users', 'age'),
    youngestAge: db.min('users', 'age'),
    oldestAge: db.max('users', 'age')
};

console.log('Statistics:', stats);

// 6. Using transactions
db.transaction((transaction) => {
    // Update users' age
    transaction
        .where('age', 25)
        .update('users', { age: 26 });
});

// 7. Advanced search with multiple conditions
const complexSearch = db
    .where('age', 30)
    .orWhere('name', 'Jane Smith')
    .whereIn('id', [1, 2, 3])
    .orderBy('createdAt', 'DESC')
    .limit(5)
    .get('users') as User[];

console.log('Complex Search:', complexSearch);

// 8. Create index for better performance
db.createIndex('users', ['email']);

// 9. Get database statistics
const dbStats = db.getStats();
console.log('Database Stats:', dbStats);

// 10. Create database backup
const backup = db.backup();
console.log('Backup Created:', backup);

// 11. Restore from backup
db.restore(backup);

// 12. Using raw query for complex cases
const customFilter = db.raw('users', (user) => {
    return user.age > 25 && user.email.includes('@example.com');
});

console.log('Custom Filter:', customFilter);