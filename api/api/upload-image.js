// API Vercel - Proxy d'upload ImgBB (clé API côté serveur)
module.exports = async (req, res) => {
    // CORS
    const allowedOrigins = [
        'https://www.family-custom.com',
        'https://family-custom.com',
        'http://127.0.0.1:5500',
        'http://localhost:5500'
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image data required' });
        }

        const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';

        if (!IMGBB_API_KEY) {
            return res.status(500).json({ error: 'ImgBB API key not configured' });
        }

        // Forward to ImgBB
        const formBody = new URLSearchParams();
        formBody.append('key', IMGBB_API_KEY);
        formBody.append('image', image);

        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formBody
        });

        const data = await response.json();

        if (data.success) {
            return res.status(200).json({
                success: true,
                data: {
                    url: data.data.url,
                    display_url: data.data.display_url,
                    delete_url: data.data.delete_url
                }
            });
        } else {
            return res.status(400).json({ success: false, error: 'Upload failed' });
        }
    } catch (error) {
        console.error('ImgBB upload error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
