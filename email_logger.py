#!/usr/bin/env python3
import sqlite3
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs
import datetime
import os

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('emails.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

class EmailHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/submit-email':
            try:
                # Get content length and read the data
                content_length = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_length).decode('utf-8')
                
                # Parse form data
                parsed_data = parse_qs(post_data)
                email = parsed_data.get('email', [''])[0]
                
                if email:
                    # Save to database
                    conn = sqlite3.connect('emails.db')
                    cursor = conn.cursor()
                    cursor.execute('INSERT INTO emails (email) VALUES (?)', (email,))
                    conn.commit()
                    conn.close()
                    
                    print(f"Email logged: {email} at {datetime.datetime.now()}")
                    
                    # Send success response
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'success'}).encode())
                else:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'error', 'message': 'Email required'}).encode())
                    
            except Exception as e:
                print(f"Error processing request: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': 'Server error'}).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Start server
    port = 3000
    server = HTTPServer(('localhost', port), EmailHandler)
    print(f"Email logger server running on port {port}")
    server.serve_forever()
