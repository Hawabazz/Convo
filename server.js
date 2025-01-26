const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Store active conversations and their states
const conversations = new Map();
const deadAccounts = new Set();

app.use(express.static('static'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// Handle file uploads
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const prefix = req.body.type || '';
        cb(null, `${prefix}_${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

app.post('/upload_file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const content = await fs.readFile(req.file.path, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        res.json({
            status: 'success',
            message: `${req.body.type} file uploaded successfully`,
            content: lines
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start conversation
app.post('/start_conversation', async (req, res) => {
    try {
        const {
            tokenOption,
            singleToken,
            tokenList,
            tokenFileName,
            threadId,
            kidx,
            time,
            messageFileName,
            messages
        } = req.body;

        // Get tokens
        let tokens = [];
        if (tokenOption === 'single') {
            tokens = [singleToken];
        } else if (tokenOption === 'multiple') {
            tokens = tokenList;
        } else if (tokenOption === 'file') {
            const content = await fs.readFile(path.join(uploadDir, `token_${tokenFileName}`), 'utf-8');
            tokens = content.split('\n').filter(t => t.trim());
        }

        // Filter out dead accounts
        tokens = tokens.filter(token => !deadAccounts.has(token));

        if (tokens.length === 0) {
            return res.status(400).json({ error: 'No valid tokens available' });
        }

        // Get messages
        let messageList = [];
        if (messageFileName) {
            const content = await fs.readFile(path.join(uploadDir, `message_${messageFileName}`), 'utf-8');
            messageList = content.split('\n').filter(m => m.trim());
        } else {
            messageList = messages;
        }

        if (messageList.length === 0) {
            return res.status(400).json({ error: 'No messages provided' });
        }

        // Generate task ID
        const taskId = Math.random().toString(36).substring(7);

        // Start conversation loop
        const conversation = {
            tokens,
            threadId,
            kidx,
            time: parseInt(time),
            messages: messageList,
            active: true,
            startTime: Date.now(),
            messagesSent: 0,
            failedAttempts: new Map()
        };

        conversations.set(taskId, conversation);
        startMessageLoop(taskId);

        res.json({
            status: 'success',
            message: `Conversation started with ID: ${taskId}`,
            task_id: taskId
        });
    } catch (error) {
        console.error('Start conversation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stop conversation
app.post('/stop_conversation', (req, res) => {
    const { taskId } = req.body;
    const conversation = conversations.get(taskId);
    
    if (conversation) {
        conversation.active = false;
        res.json({
            status: 'success',
            message: `Conversation with ID ${taskId} has been stopped.`
        });
    } else {
        res.status(404).json({
            status: 'error',
            message: `No conversation found with ID ${taskId}.`
        });
    }
});

// Get conversation status
app.get('/conversation_status/:taskId', (req, res) => {
    const conversation = conversations.get(req.params.taskId);
    
    if (conversation) {
        res.json({
            status: conversation.active ? 'running' : 'stopped',
            task_id: req.params.taskId,
            uptime: Math.floor((Date.now() - conversation.startTime) / 1000),
            messages_sent: conversation.messagesSent
        });
    } else {
        res.status(404).json({
            status: 'not_found',
            task_id: req.params.taskId
        });
    }
});

async function sendMessage(token, threadId, message) {
    const apiUrl = `https://graph.facebook.com/v15.0/t_${threadId}/`;
    const params = new URLSearchParams();
    params.append('access_token', token);
    params.append('message', message);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error(`Error sending message: ${error.message}`);
        return false;
    }
}

async function startMessageLoop(taskId) {
    const conversation = conversations.get(taskId);
    if (!conversation) return;

    while (conversation.active) {
        for (const message of conversation.messages) {
            if (!conversation.active) break;

            for (const token of conversation.tokens) {
                if (!conversation.active) break;

                if (deadAccounts.has(token)) continue;

                const fullMessage = `${conversation.kidx} ${message}`;
                const success = await sendMessage(token, conversation.threadId, fullMessage);

                if (success) {
                    conversation.messagesSent++;
                    conversation.failedAttempts.set(token, 0);
                } else {
                    const fails = (conversation.failedAttempts.get(token) || 0) + 1;
                    conversation.failedAttempts.set(token, fails);

                    if (fails >= 5) {
                        deadAccounts.add(token);
                        console.log(`Token marked as dead: ${token.substring(0, 10)}...`);
                    }
                }

                await new Promise(resolve => setTimeout(resolve, conversation.time * 1000));
            }
        }
    }
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
