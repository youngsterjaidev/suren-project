const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const dotenv = require("dotenv")

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// MongoDB connection URI (replace with your MongoDB URI)
const mongoURI = process.env.MONGO_URI;
const dbName = 'tripwiser'; // Replace with your database name
const collectionName = 'airports'; // Replace with your collection name

// Connect to MongoDB
let db;

MongoClient.connect(mongoURI, { useUnifiedTopology: true })
  .then((client) => {
    console.log('Connected to MongoDB');
    db = client.db(dbName);
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });

// Routes

// GET: Fetch all airports
app.get('/airports', async (req, res) => {
  try {
    const airports = await db.collection(collectionName).find().toArray();
    res.json(airports);
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});

// GET: Fetch airports by city name (ignore whitespace and include airport names)
app.get('/airports/city/:cityName', async (req, res) => {
    try {
      const { cityName } = req.params;
  
      // Remove leading/trailing whitespace and replace multiple spaces with a single space
      const cleanedCityName = cityName.trim().replace(/\s+/g, ' ');
  
      // Query the database for airports matching the cleaned city name (case-insensitive)
      const airports = await db
        .collection(collectionName)
        .find({ city: { $regex: new RegExp(cleanedCityName, 'i') } })
        .toArray();
  
      if (airports.length === 0) {
        return res.status(404).json({ error: 'No airports found for the specified city' });
      }
  
      // Extract airport names and IATA codes from the results
      const airportDetails = airports.map((airport) => ({
        name: airport.name,
        iataCode: airport.iataCode,
      }));
  
      res.json({ city: cleanedCityName, airports: airportDetails });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch airports by city' });
    }
  });

// POST: Add a new airport
app.post('/airports', async (req, res) => {
  try {
    const { name, iataCode, city } = req.body;
    if (!name || !iataCode || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.collection(collectionName).insertOne({ name, iataCode, city });
    res.status(201).json(result.ops[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add airport' });
  }
});

// PUT: Update an airport by IATA code
app.put('/airports/:iataCode', async (req, res) => {
  try {
    const { iataCode } = req.params;
    const { name, city } = req.body;

    const result = await db
      .collection(collectionName)
      .updateOne({ iataCode }, { $set: { name, city } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    res.json({ message: 'Airport updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update airport' });
  }
});

// DELETE: Delete an airport by IATA code
app.delete('/airports/:iataCode', async (req, res) => {
  try {
    const { iataCode } = req.params;

    const result = await db.collection(collectionName).deleteOne({ iataCode });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Airport not found' });
    }

    res.json({ message: 'Airport deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete airport' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});