require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Law = require('./models/Law'); // Pulls in your Schema

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB for seeding...'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// The import function
const importData = async () => {
  try {
    // Look inside the 'data' folder
    const dataFolder = path.join(__dirname, 'data');
    const files = fs.readdirSync(dataFolder);

    console.log(`Found ${files.length} files. Starting import...`);

    // Loop through every single file in the folder
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dataFolder, file);
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const lawJson = JSON.parse(fileData);

        // Save it to MongoDB
        await Law.create(lawJson);
        console.log(`🟢 Successfully imported: ${file}`);
      }
    }

    console.log('🎉 ALL LAWS IMPORTED SUCCESSFULLY!');
    process.exit(); // Turn off the script when done

  } catch (error) {
    // If it fails because a law already exists, it will warn you
    if (error.code === 11000) {
      console.error('⚠️ Notice: Some laws are already in the database. Clear the database if you want a fresh start.');
    } else {
      console.error('❌ Error importing data:', error);
    }
    process.exit(1);
  }
};

// Run the function
importData();