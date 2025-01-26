# Facebook Comment Bot

A web application for managing Facebook comments using cookies or tokens.

## Features

- Post comments using Facebook cookies
- Post comments using Facebook tokens
- Verify cookies and tokens
- Set custom delays between comments
- Upload comment files
- Modern web interface

## Setup

1. Install Python requirements:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open in browser:
```
http://localhost:5000
```

## Usage

1. **Using Cookies**:
   - Click "COOKIES" button
   - Enter Post UID
   - Set delay
   - Upload cookies file
   - Upload comments file

2. **Using Tokens**:
   - Click "TOKEN" button
   - Enter Token UID
   - Set delay
   - Upload tokens file
   - Upload comments file

3. **Check Validity**:
   - Click "CHECK" button
   - Select check type
   - Upload auth file

## Files

- `app.py`: Main Flask application
- `templates/comment_bot.html`: HTML template
- `static/style.css`: CSS styles
- `static/script.js`: JavaScript code
- `requirements.txt`: Python dependencies
