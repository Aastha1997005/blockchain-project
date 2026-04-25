const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const Document = require('../models/Document');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyOnChain } = require('../utils/blockchain');
const { ethers } = require('ethers');

// Configure Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper to upload to Pinata
 */
async function uploadToPinata(fileBuffer, fileName) {
  if (!process.env.PINATA_API_KEY || process.env.PINATA_API_KEY.includes('your_')) {
    console.log("Pinata keys not configured. Returning MOCK CID.");
    return "QmMockHash" + Date.now();
  }

  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename: fileName });

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity,
      headers: {
        ...formData.getHeaders(),
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY
      }
    });

    return res.data.IpfsHash;
  } catch (error) {
    console.error("Pinata Upload Error:", error.response?.data || error.message);
    throw new Error("Pinata upload failed");
  }
}

// POST /upload -> User uploads actual file
router.post('/upload', authenticate, authorize(['user']), upload.single('file'), async (req, res) => {
  try {
    const { userAddress } = req.body;
    const file = req.file;

    if (!file || !userAddress) {
      return res.status(400).json({ error: 'File and userAddress are required.' });
    }

    console.log(`Uploading file for ${userAddress}...`);
    
    // 1. Upload to Pinata (or get Mock CID)
    const cid = await uploadToPinata(file.buffer, file.originalname);
    console.log(`File uploaded to IPFS. CID: ${cid}`);

    // 2. Generate keccak256 hash
    const cidHash = ethers.keccak256(ethers.toUtf8Bytes(cid));

    // 3. Save to MongoDB
    const newDoc = new Document({
      userAddress,
      cid,
      cidHash,
      status: 'pending'
    });

    await newDoc.save();
    res.status(201).json({ message: 'Document uploaded successfully', document: newDoc });
  } catch (error) {
    console.error("Upload error:", error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to upload document to IPFS' });
  }
});

// GET /documents -> Verifier sees all pending docs
router.get('/documents', authenticate, authorize(['verifier']), async (req, res) => {
  try {
    const docs = await Document.find({ status: 'pending' });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /verify -> Verifier approves/rejects
router.post('/verify', authenticate, authorize(['verifier']), async (req, res) => {
  const { documentId, action } = req.body;

  try {
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (action === 'verify') {
      await verifyOnChain(doc.userAddress, doc.cidHash);
      doc.status = 'verified';
      doc.verifiedBy = req.user.address;
      doc.verifiedAt = new Date();
    } else {
      doc.status = 'rejected';
    }

    await doc.save();
    res.json({ message: `Document ${action}ed successfully`, document: doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
