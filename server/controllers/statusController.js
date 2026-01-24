const https = require('https');
const http = require('http');
const { URL } = require('url');

const checkUrlStatus = async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    let responseSent = false;

    const sendResponse = (data) => {
        if (!responseSent) {
            responseSent = true;
            res.json(data);
        }
    };

    try {
        const parsedUrl = new URL(url);
        const lib = parsedUrl.protocol === 'https:' ? https : http;

        const startTime = Date.now();

        const request = lib.request(url, { method: 'HEAD', timeout: 5000 }, (response) => {
            const duration = Date.now() - startTime;
            
            response.resume();
            
            const isUp = response.statusCode < 500; 
            sendResponse({ 
                status: isUp ? 'up' : 'down', 
                statusCode: response.statusCode,
                latency: duration 
            });
        });

        request.on('error', (err) => {
            sendResponse({ status: 'down', error: err.message });
        });

        request.on('timeout', () => {
            request.destroy(); 
            sendResponse({ status: 'timeout', latency: 5000 });
        });

        request.end();

    } catch (error) {
        sendResponse({ status: 'error', error: 'Invalid URL format' });
    }
};

module.exports = { checkUrlStatus };