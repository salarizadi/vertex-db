// Import the VertexDB class
const VertexDB = require('../vertex-db.js');

// Create a new instance with logging enabled
const db = new VertexDB({
    logging: true,
    timestamps: true,
    softDelete: true
});

// Function to test all major features
async function testVertexDB() {
    try {
        console.log('=== Testing VertexDB Features ===\n');

        // 1. Create tables with schemas
        console.log('1. Creating tables...');

        // Users table schema
        const userSchema = {
            id: { type: 'number', required: true },
            name: { type: 'string', required: true },
            email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
            age: { type: 'number', min: 18, max: 100 }
        };

        // Posts table schema
        const postSchema = {
            id: { type: 'number', required: true },
            user_id: { type: 'number', required: true },
            title: { type: 'string', required: true },
            content: { type: 'string', required: true }
        };

        db.createTable('users', userSchema)
            .createTable('posts', postSchema);

        // 2. Insert sample data
        console.log('\n2. Inserting sample data...');

        // Insert users
        db.insert('users', {
            id: VertexDB.AUTO_INCREMENT,
            name: 'John Doe',
            email: 'john@example.com',
            age: 30
        });

        db.insert('users', {
            id: VertexDB.AUTO_INCREMENT,
            name: 'Jane Smith',
            email: 'jane@example.com',
            age: 25
        });

        // Insert posts
        db.insert('posts', {
            id: VertexDB.AUTO_INCREMENT,
            user_id: 1,
            title: 'First Post',
            content: 'This is my first post!'
        });

        db.insert('posts', {
            id: VertexDB.AUTO_INCREMENT,
            user_id: 1,
            title: 'Second Post',
            content: 'Another great post!'
        });

        // 3. Test queries
        console.log('\n3. Testing queries...');

        // Get all users
        console.log('\nAll users:');
        console.log(db.get('users'));

        // Get user by ID
        console.log('\nUser with ID 1:');
        console.log(db.where('id', 1).getOne('users'));

        // Get posts with conditions
        console.log('\nPosts by user 1:');
        console.log(db.where('user_id', 1).get('posts'));

        // 4. Test relationships
        console.log('\n4. Testing relationships...');
        db.setRelation('posts', 'users', 'belongsTo', 'user_id');

        // Join posts with users
        console.log('\nJoined posts with users:');
        console.log(db.join('posts', 'users', 'user_id', 'id'));

        // 5. Test updates
        console.log('\n5. Testing updates...');
        db.where('id', 1)
            .update('users', { name: 'John Doe Updated' });

        console.log('\nUpdated user:');
        console.log(db.where('id', 1).getOne('users'));

        // 6. Test searching and ordering
        console.log('\n6. Testing search and order...');
        console.log('\nSearch users with "john" and order by age:');
        console.log(
            db.search({ name: 'john' })
                .orderBy('age', 'DESC')
                .get('users')
        );

        // 7. Test pagination
        console.log('\n7. Testing pagination...');
        console.log(db.paginate('posts', 1, 1));

        // 8. Test statistics
        console.log('\n8. Database statistics:');
        console.log(db.getStats());

        // 9. Test backup and restore
        console.log('\n9. Testing backup and restore...');
        const backup = db.backup();
        console.log('Backup created:', backup.timestamp);

        // 10. Test transactions
        console.log('\n10. Testing transactions...');
        db.transaction((tx) => {
            tx.insert('users', {
                id: VertexDB.AUTO_INCREMENT,
                name: 'Test User',
                email: 'test@example.com',
                age: 28
            });
        });

        // 11. Test indexing
        console.log('\n11. Creating and testing index...');
        db.createIndex('users', ['email']);

        // 12. Export to JSON
        console.log('\n12. Exporting users to JSON...');
        const jsonData = db.toJSON('users');
        console.log(jsonData);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the test
testVertexDB();