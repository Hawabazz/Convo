document.getElementById('cookiesButton').onclick = function() {
    document.querySelector('.cookieForm').style.display = 'block';
    document.querySelector('.tokenForm').style.display = 'none';
    document.querySelector('.checkForm').style.display = 'none';
}

document.getElementById('tokenButton').onclick = function() {
    document.querySelector('.tokenForm').style.display = 'block';
    document.querySelector('.cookieForm').style.display = 'none';
    document.querySelector('.checkForm').style.display = 'none';
}

document.getElementById('checkButton').onclick = function() {
    document.querySelector('.checkForm').style.display = 'block';
    document.querySelector('.cookieForm').style.display = 'none';
    document.querySelector('.tokenForm').style.display = 'none';
}

// Add form submission handlers
document.querySelectorAll('form').forEach(form => {
    form.onsubmit = function(e) {
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
        
        // Re-enable after 2 seconds
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.textContent = submitButton.textContent.replace('Processing...', 'Submit');
        }, 2000);
    }
});
