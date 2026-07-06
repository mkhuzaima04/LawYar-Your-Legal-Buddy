const express = require('express');
const router = express.Router();
const Law = require('../models/Law');

// 1. Get all laws (for the library grid)
router.get('/', async (req, res) => {
  try {
    const laws = await Law.find({}).select('-chunks');
    res.json(laws);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Get ONE specific law (for the details page)
// This is what makes clicking the cards actually work!
router.get('/:lawName', async (req, res) => {
  try {
    const { lawName } = req.params;
    
    // Search for the law name case-insensitively
    const law = await Law.findOne({ 
      law: { $regex: new RegExp("^" + lawName + "$", "i") } 
    });

    if (!law) return res.status(404).json({ message: "Law not found in database" });
    
    res.json(law);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;