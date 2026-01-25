const https = require('https');
const http = require('http');
const { URL } = require('url');

const checkUrlStatus = async (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ error: 'URL is required' });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(url.trim());
    } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ error: 'Only HTTP and HTTPS protocols are supported' });
    }

    let responseSent = false;

    const sendResponse = (data) => {
        if (!responseSent) {
            responseSent = true;
            if (!res.headersSent) {
                res.json(data);
            }
        }
    };

    try {
        const lib = parsedUrl.protocol === 'https:' ? https : http;
        const startTime = Date.now();

        const request = lib.request(parsedUrl.toString(), { method: 'HEAD', timeout: 5000 }, (response) => {
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
        if (!responseSent) {
            sendResponse({ status: 'error', error: error.message });
        }
    }
};

module.exports = { checkUrlStatus };