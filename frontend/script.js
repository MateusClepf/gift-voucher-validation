document.addEventListener('DOMContentLoaded', () => {
    const voucherInput = document.getElementById('voucher-code');
    const validateBtn = document.getElementById('validate-btn');
    const resultDiv = document.getElementById('result');
    const resultMessage = document.getElementById('result-message');
    const turnstileContainer = document.getElementById('turnstile-container');
    const loadingDiv = document.getElementById('loading');
    const validationSection = document.getElementById('validation-section');
    
    // API endpoint - using the original backend URL
    // The Cloudflare Worker will intercept these requests
    const API_URL = 'https://shop-test-api.requestlab.net/validate-voucher';
    
    // Turnstile site key
    const TURNSTILE_SITE_KEY = '0x4AAAAAABYLuI3gJkDWzm0a';
    
    let turnstileWidgetId = null;
    let turnstileToken = null;
    
    // Ensure all elements are initially in the correct state
    validationSection.classList.add('hidden');
    loadingDiv.classList.add('hidden');
    
    // Check if Turnstile is ready
    const isTurnstileReady = () => {
        return typeof window.turnstile !== 'undefined';
    };
    
    // Add click event listener to the validate button
    validateBtn.addEventListener('click', initValidation);
    
    // Listen for Enter key on input
    voucherInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            initValidation();
        }
    });
    
    // Initialize the validation process
    function initValidation() {
        const voucherCode = voucherInput.value.trim();
        
        // Basic validation
        if (!voucherCode) {
            showResult('Please enter a voucher code.', false);
            return;
        }
        
        // Clear any previous results
        hideResult();
        
        // Disable the button and show loading state
        validateBtn.disabled = true;
        validateBtn.textContent = 'Please wait...';
        
        // Show the validation section
        validationSection.classList.remove('hidden');
        
        console.log('Turnstile ready:', isTurnstileReady());
        
        // Check if Turnstile is ready
        if (!isTurnstileReady()) {
            // Show loading message
            loadingDiv.classList.remove('hidden');
            
            // Wait for Turnstile to load (check every 100ms for up to 5 seconds)
            let attempts = 0;
            const checkTurnstile = setInterval(() => {
                attempts++;
                console.log('Checking turnstile, attempt:', attempts);
                if (isTurnstileReady()) {
                    clearInterval(checkTurnstile);
                    loadingDiv.classList.add('hidden');
                    renderTurnstile(voucherCode);
                } else if (attempts >= 50) { // 5 seconds (50 * 100ms)
                    clearInterval(checkTurnstile);
                    loadingDiv.classList.add('hidden');
                    validationSection.classList.add('hidden');
                    showResult('Security verification service not available. Please try again later.', false);
                    validateBtn.disabled = false;
                    validateBtn.textContent = 'Validate';
                }
            }, 100);
        } else {
            renderTurnstile(voucherCode);
        }
    }
    
    // Render the Turnstile widget
    function renderTurnstile(voucherCode) {
        console.log('Rendering Turnstile widget');
        
        // If a Turnstile widget was already rendered, remove it
        if (turnstileWidgetId) {
            window.turnstile.remove(turnstileWidgetId);
            turnstileWidgetId = null;
        }
        
        // Render the Turnstile widget
        try {
            turnstileWidgetId = window.turnstile.render('#turnstile-container', {
                sitekey: TURNSTILE_SITE_KEY,
                theme: 'light',
                callback: function(token) {
                    console.log('Turnstile token received');
                    // Store the token and proceed with voucher validation
                    turnstileToken = token;
                    submitVoucherValidation(voucherCode, token);
                },
                'expired-callback': function() {
                    console.log('Turnstile token expired');
                    // If token expires, reset the process
                    turnstileToken = null;
                    validateBtn.disabled = false;
                    validateBtn.textContent = 'Validate';
                    validationSection.classList.add('hidden');
                    showResult('Security check expired. Please try again.', false);
                },
                'error-callback': function(error) {
                    console.error('Turnstile error callback:', error);
                    // If there's an error, reset the process
                    validateBtn.disabled = false;
                    validateBtn.textContent = 'Validate';
                    validationSection.classList.add('hidden');
                    showResult('Error with security check. Please try again.', false);
                }
            });
            
            // If widget ID is null, there was an error
            if (!turnstileWidgetId) {
                throw new Error('Failed to render Turnstile widget');
            }
            
            console.log('Turnstile widget ID:', turnstileWidgetId);
        } catch (error) {
            console.error('Turnstile rendering error:', error);
            validateBtn.disabled = false;
            validateBtn.textContent = 'Validate';
            validationSection.classList.add('hidden');
            showResult('Error initializing security check. Please try again.', false);
        }
    }
    
    // Submit the validation request to the API
    function submitVoucherValidation(voucherCode, token) {
        console.log('Submitting validation request');
        
        // Convert the token to URL parameters to avoid triggering a preflight request
        // This approach uses application/x-www-form-urlencoded format instead of JSON
        const formData = new URLSearchParams();
        formData.append('code', voucherCode);
        formData.append('cf-turnstile-response', token);
        
        // Call API using POST with form encoding (won't trigger preflight)
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                showResult(`Voucher valid! Value: ${data.value}`, true);
            } else {
                // If there's a more specific message from the worker or backend, use it
                const errorMessage = data.message || 'Invalid voucher code.';
                showResult(errorMessage, false);
            }
        })
        .catch(error => {
            showResult('Error connecting to server. Please try again.', false);
            console.error('Error:', error);
        })
        .finally(() => {
            // Re-enable button and clean up
            validateBtn.disabled = false;
            validateBtn.textContent = 'Validate';
            
            // Hide the validation section
            validationSection.classList.add('hidden');
            
            // Clean up the Turnstile widget
            if (turnstileWidgetId && isTurnstileReady()) {
                window.turnstile.remove(turnstileWidgetId);
                turnstileWidgetId = null;
            }
            turnstileToken = null;
        });
    }
    
    function showResult(message, isSuccess) {
        resultDiv.className = isSuccess ? 'result success' : 'result error';
        resultMessage.textContent = message;
        resultDiv.style.display = 'block';
        
        // Clear input on success
        if (isSuccess) {
            voucherInput.value = '';
        }
    }
    
    function hideResult() {
        resultDiv.className = 'result-hidden';
        resultDiv.style.display = 'none';
    }
    
    // Add click handlers for test voucher codes
    document.querySelectorAll('.test-vouchers code').forEach(codeElement => {
        codeElement.addEventListener('click', function() {
            const code = this.textContent;
            voucherInput.value = code;
            
            // Add a visual feedback for the click
            const originalBackground = this.style.backgroundColor;
            this.style.backgroundColor = '#d4edda';
            this.style.transition = 'background-color 0.3s';
            
            setTimeout(() => {
                this.style.backgroundColor = originalBackground;
            }, 500);
        });
        
        // Change cursor to indicate clickable
        codeElement.style.cursor = 'pointer';
        
        // Add tooltip
        codeElement.title = 'Click to use this code';
    });
    
    // Add click handler for API URL to copy to clipboard
    const apiUrlElement = document.querySelector('.api-url');
    if (apiUrlElement) {
        apiUrlElement.style.cursor = 'pointer';
        apiUrlElement.title = 'Click to copy API URL';
        
        apiUrlElement.addEventListener('click', function() {
            const url = this.textContent;
            
            // Copy to clipboard
            navigator.clipboard.writeText(url).then(() => {
                // Show feedback
                const originalText = this.textContent;
                const originalBackground = this.style.backgroundColor;
                
                this.textContent = '✓ Copied to clipboard!';
                this.style.backgroundColor = '#d4edda';
                
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.backgroundColor = originalBackground;
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        });
    }
}); 