const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Simple Login (In real app, use signature verification)
router.post('/login', (req, res) => {
  const { address, role } = req.body; // role: 'user' or 'verifier'

  if (!address || !role) {
    return res.status(400).json({ error: 'Address and role are required' });
  }

  const token = jwt.sign({ address, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});

module.exports = router;
