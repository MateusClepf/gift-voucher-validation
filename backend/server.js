const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Hardcoded valid vouchers (in a real app, these would be in a database)
const validVouchers = [
  { code: 'GIFT100', value: '$100' },
  { code: 'DISC25', value: '$25' },
  { code: 'SAVE50', value: '$50' },
  { code: 'PROMO75', value: '$75' },
  { code: 'VIP200', value: '$200' }
];

// API endpoint to validate vouchers
app.post('/validate-voucher', async (req, res) => {
  const { code } = req.body;
  
  // Check if voucher code is provided
  if (!code) {
    return res.status(400).json({ 
      valid: false, 
      message: 'Voucher code is required' 
    });
  }
  
  // Note: Turnstile validation is now handled by the Cloudflare Worker
  // We can directly proceed with voucher validation
  
  // Find the voucher in our list of valid vouchers
  const voucher = validVouchers.find(v => v.code === code.toUpperCase());
  
  if (voucher) {
    return res.json({
      valid: true,
      value: voucher.value,
      message: 'Voucher code is valid'
    });
  } else {
    return res.json({
      valid: false,
      message: 'Invalid voucher code'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Valid voucher codes:');
  validVouchers.forEach(v => console.log(`- ${v.code}: ${v.value}`));
}); 