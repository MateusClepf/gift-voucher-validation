document.addEventListener('DOMContentLoaded', () => {
    const voucherInput = document.getElementById('voucher-code');
    const validateBtn = document.getElementById('validate-btn');
    const resultDiv = document.getElementById('result');
    const resultMessage = document.getElementById('result-message');
    
    // API endpoint
    const API_URL = 'https://shop-test-api.requestlab.net/validate-voucher';
    
    validateBtn.addEventListener('click', validateVoucher);
    voucherInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            validateVoucher();
        }
    });
    
    function validateVoucher() {
        const voucherCode = voucherInput.value.trim();
        
        // Basic validation
        if (!voucherCode) {
            showResult('Please enter a voucher code.', false);
            return;
        }
        
        // Disable button during API call
        validateBtn.disabled = true;
        validateBtn.textContent = 'Validating...';
        
        // Call API
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: voucherCode })
        })
        .then(response => response.json())
        .then(data => {
            if (data.valid) {
                showResult(`Voucher valid! Value: ${data.value}`, true);
            } else {
                showResult('Invalid voucher code.', false);
            }
        })
        .catch(error => {
            showResult('Error connecting to server. Please try again.', false);
            console.error('Error:', error);
        })
        .finally(() => {
            // Re-enable button
            validateBtn.disabled = false;
            validateBtn.textContent = 'Validate';
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
}); 