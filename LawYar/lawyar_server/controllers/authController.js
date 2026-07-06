const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- REGISTER A NEW USER ---
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validation check
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // 2. Check for existing user
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save to DB
    user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    res.status(201).json({ message: "Account created successfully!" });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};
// --- LOGIN EXISTING USER ---
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // 🚨 ERROR: User doesn't exist
      return res.status(401).json({ message: "No account found with this email." });
    }

    // 2. Compare the typed password with the hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      // 🚨 ERROR: Wrong password
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    // 3. If we get here, the password is CORRECT
    const token = jwt.sign({ userId: user._id }, 'super_secret_key', { expiresIn: '7d' });
    
    res.status(200).json({ 
      message: "Login successful!", 
      token, 
      user: { id: user._id, name: user.name } 
    });

  } catch (error) {
    res.status(500).json({ message: "Server error during login." });
  }
};