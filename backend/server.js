const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  // Generate a unique request ID
  req.requestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const timestamp = new Date().toISOString();
  
  // Log the incoming request
  console.log(`[${timestamp}] [${req.requestId}] ${req.method} ${req.url}`);
  console.log(`[${timestamp}] [${req.requestId}] IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
  
  // Log the request body for POST requests (masking sensitive data)
  if (req.method === 'POST' && req.body) {
    const bodyLog = { ...req.body };
    
    // Mask voucher code if present (for privacy)
    if (bodyLog.code) {
      bodyLog.code = maskSensitiveData(bodyLog.code);
    }
    
    // Mask any Turnstile tokens that might be present
    if (bodyLog['cf-turnstile-response']) {
      bodyLog['cf-turnstile-response'] = '[MASKED]';
    }
    
    console.log(`[${timestamp}] [${req.requestId}] Request Body:`, JSON.stringify(bodyLog));
  }
  
  // Capture the response
  const originalSend = res.send;
  res.send = function(body) {
    const responseTimestamp = new Date().toISOString();
    
    // Try to parse and log the response body if it's JSON
    let logBody = body;
    try {
      if (typeof body === 'string') {
        const parsedBody = JSON.parse(body);
        // Mask sensitive data in the response log
        if (parsedBody.valid !== undefined) {
          console.log(`[${responseTimestamp}] [${req.requestId}] Voucher validation result: ${parsedBody.valid}`);
          if (parsedBody.value) {
            console.log(`[${responseTimestamp}] [${req.requestId}] Voucher value: ${parsedBody.value}`);
          }
          if (parsedBody.message) {
            console.log(`[${responseTimestamp}] [${req.requestId}] Message: ${parsedBody.message}`);
          }
        } else {
          console.log(`[${responseTimestamp}] [${req.requestId}] Response:`, JSON.stringify(parsedBody));
        }
      }
    } catch (e) {
      // If not JSON, just log that a response was sent
      console.log(`[${responseTimestamp}] [${req.requestId}] Non-JSON response sent`);
    }
    
    console.log(`[${responseTimestamp}] [${req.requestId}] Response status: ${res.statusCode}`);
    
    // Call the original send function
    return originalSend.call(this, body);
  };
  
  next();
});

// Function to mask sensitive data
function maskSensitiveData(data) {
  if (!data || data.length <= 4) {
    return '****';
  }
  // Show first 2 and last 2 characters, mask the rest
  return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
}

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
  console.log(`[${new Date().toISOString()}] [${req.requestId}] Validating voucher code: ${maskSensitiveData(code)}`);
  
  // Find the voucher in our list of valid vouchers
  const voucher = validVouchers.find(v => v.code === code.toUpperCase());
  
  if (voucher) {
    console.log(`[${new Date().toISOString()}] [${req.requestId}] Voucher found and valid`);
    return res.json({
      valid: true,
      value: voucher.value,
      message: 'Voucher code is valid'
    });
  } else {
    console.log(`[${new Date().toISOString()}] [${req.requestId}] Voucher not found or invalid`);
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