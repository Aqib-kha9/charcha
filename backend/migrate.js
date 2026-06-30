import mongoose from 'mongoose';

const LOCAL_URI = 'mongodb://127.0.0.1:27017/charcha';
const ATLAS_URI = 'mongodb+srv://aqibkha9x:DkyucQ2Ccjs4EwHD@cluster0.skvdstf.mongodb.net/charcha?retryWrites=true&w=majority';

async function migrate() {
  let localConnection;
  let atlasConnection;

  try {
    console.log('Connecting to local database...');
    localConnection = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('Connected to local database.');

    console.log('Connecting to Atlas database...');
    atlasConnection = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('Connected to Atlas database.');

    // Get all collections from local DB
    const collections = await localConnection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections to migrate.`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`\nMigrating collection: ${collectionName}`);

      const localModel = localConnection.model(collectionName, new mongoose.Schema({}, { strict: false }), collectionName);
      const atlasModel = atlasConnection.model(collectionName, new mongoose.Schema({}, { strict: false }), collectionName);

      const documents = await localModel.find({});
      console.log(`Found ${documents.length} documents in ${collectionName}.`);

      if (documents.length > 0) {
        // Clear existing collection in Atlas to prevent duplicates
        await atlasModel.deleteMany({});
        console.log(`Cleared existing documents in Atlas collection: ${collectionName}.`);

        // Insert documents
        await atlasModel.insertMany(documents);
        console.log(`Successfully inserted ${documents.length} documents into Atlas collection: ${collectionName}.`);
      }
    }

    console.log('\nMigration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (localConnection) await localConnection.close();
    if (atlasConnection) await atlasConnection.close();
    process.exit(0);
  }
}

migrate();
