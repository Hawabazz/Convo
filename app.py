from flask import Flask, request, render_template, jsonify
import os
import re
import time
import threading
import json
import requests
from datetime import datetime

app = Flask(__name__)
app.debug = True

class FacebookCommenter:
    def __init__(self):
        self.comment_count = 0

    def check_validity(self, auth_data, is_token=True):
        invalid_ids = []
        valid_ids = []

        for item in auth_data:
            item = item.strip()
            if not item:  # Skip empty lines
                continue

            if is_token:
                valid = self.verify_token(item)
            else:
                valid = self.verify_cookie(item)

            if valid:
                valid_ids.append(item)
            else:
                invalid_ids.append(item)

        return valid_ids, invalid_ids

    def verify_token(self, token):
        return token.endswith("VALID")

    def verify_cookie(self, cookie):
        return cookie.endswith("VALID")

    def check_comment_status(self, cookie):
        if cookie.endswith("BLOCKED"):
            return "BLOCKED"
        elif cookie.endswith("DISABLED"):
            return "DISABLED"
        elif cookie.endswith("EXPIRED"):
            return "EXPIRED"
        else:
            return "ACTIVE"

    def comment_on_post(self, auth_data, post_id, comment, delay):
        print(f"Attempting to post comment '{comment}' with token {auth_data} on post {post_id}")
        self.comment_count += 1

    def process_inputs(self, auth_data, post_id, comments, delay):
        cookie_index = 0
        while True:
            for comment in comments:
                comment = comment.strip()
                if comment:
                    time.sleep(delay)
                    self.comment_on_post(auth_data[cookie_index], post_id, comment, delay)
                    cookie_index = (cookie_index + 1) % len(auth_data)

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        if 'post_id' in request.form:
            post_id = request.form['post_id']
            delay = int(request.form['delay'])

            cookies_file = request.files['cookies_file']
            comments_file = request.files['comments_file']

            cookies = cookies_file.read().decode('utf-8').splitlines()
            comments = comments_file.read().decode('utf-8').splitlines()

            if len(cookies) == 0 or len(comments) == 0:
                return "Cookies or comments file is empty."

            valid_cookies, invalid_cookies = FacebookCommenter().check_validity(cookies, False)
            if invalid_cookies:
                return f"Invalid cookies found: {', '.join(invalid_cookies)}."

            commenter = FacebookCommenter()
            threading.Thread(target=commenter.process_inputs, args=(cookies, post_id, comments, delay)).start()

            return "Comments are being posted. Check console for updates."
        
        elif 'token_id' in request.form:
            token_id = request.form['token_id']
            delay = int(request.form['token_delay'])

            tokens_file = request.files['tokens_file']
            comments_file = request.files['token_comments_file']

            tokens = tokens_file.read().decode('utf-8').splitlines()
            comments = comments_file.read().decode('utf-8').splitlines()

            if len(tokens) == 0 or len(comments) == 0:
                return "Tokens or comments file is empty."

            valid_tokens, invalid_tokens = FacebookCommenter().check_validity(tokens, True)
            if invalid_tokens:
                return f"Invalid tokens found: {', '.join(invalid_tokens)}."

            commenter = FacebookCommenter()
            threading.Thread(target=commenter.process_inputs, args=(tokens, token_id, comments, delay)).start()

            return "Tokens are being posted. Check console for updates."

        elif 'check_type' in request.form:
            check_type = request.form['check_type']
            auth_file = request.files['auth_file']

            auth_data = auth_file.read().decode('utf-8').splitlines()
            if len(auth_data) == 0:
                return "Authentication file is empty."

            if check_type == 'cookies':
                valid_ids, invalid_ids = FacebookCommenter().check_validity(auth_data, False)
                result = f"Valid Cookies: {', '.join(valid_ids)}.<br>Invalid Cookies: {', '.join(invalid_ids)}."
                return result

            elif check_type == 'tokens':
                valid_ids, invalid_ids = FacebookCommenter().check_validity(auth_data, True)
                result = f"Valid Tokens: {', '.join(valid_ids)}.<br>Invalid Tokens: {', '.join(invalid_ids)}."
                return result

            status_report = ""
            for cookie in auth_data:
                status = FacebookCommenter().check_comment_status(cookie)
                status_report += f"Cookie: {cookie} - Status: {status}<br>"

            return status_report

    return render_template('comment_bot.html')

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
