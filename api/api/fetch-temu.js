const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Support both GET query params and POST body
    const url = req.query.url || (req.body && req.body.url);
    
    if (!url || !url.includes('temu.com')) {
        return res.status(400).json({ error: 'URL Temu invalide' });
    }
    
    try {
        const html = await fetchPage(url);
        const data = parseTemuHtml(html, url);
        
        return res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Erreur:', error);
        return res.status(500).json({ 
            error: 'Impossible de récupérer la page',
            message: error.message 
        });
    }
};

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'identity',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
        };
        
        const request = protocol.request(options, (response) => {
            // Suivre les redirections
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                fetchPage(response.headers.location).then(resolve).catch(reject);
                return;
            }
            
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(data));
        });
        
        request.on('error', reject);
        request.setTimeout(15000, () => {
            request.destroy();
            reject(new Error('Timeout'));
        });
        
        request.end();
    });
}

function parseTemuHtml(html, url) {
    let title = '';
    let price = '';
    let image = '';
    let sizes = [];
    let colors = [];
    let outOfStockSizes = [];
    let outOfStockColors = [];
    
    // ===== Extraire le titre =====
    const titlePatterns = [
        /"goodsName"\s*:\s*"([^"]+)"/,
        /"title"\s*:\s*"([^"]+)"/,
        /"name"\s*:\s*"([^"]+)"/,
        /<title>([^<]+)<\/title>/i,
    ];
    
    for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1].length > 5) {
            title = decodeUnicodeEscapes(match[1])
                .replace(/\s*[-|–]\s*Temu.*$/i, '')
                .trim();
            if (title.length > 10) break;
        }
    }
    
    // ===== Extraire le prix =====
    const pricePatterns = [
        /"price"\s*:\s*"?(\d+\.?\d*)"?/,
        /"salePrice"\s*:\s*"?(\d+\.?\d*)"?/,
        /"currentPrice"\s*:\s*"?(\d+\.?\d*)"?/,
        /"minPrice"\s*:\s*"?(\d+\.?\d*)"?/,
    ];
    
    for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
            // Temu stocke les prix en centimes
            let p = parseFloat(match[1]);
            if (p > 100) p = p / 100;
            price = p.toFixed(2);
            break;
        }
    }
    
    // ===== Extraire l'image =====
    const imagePatterns = [
        /"imageUrl"\s*:\s*"([^"]+)"/,
        /"image"\s*:\s*"([^"]+)"/,
        /"mainImage"\s*:\s*"([^"]+)"/,
        /og:image["\s]+content="([^"]+)"/,
    ];
    
    for (const pattern of imagePatterns) {
        const match = html.match(pattern);
        if (match) {
            image = match[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
            if (image.startsWith('//')) image = 'https:' + image;
            break;
        }
    }
    
    // ===== Méthode 1: Chercher rawData ou __PRELOADED_STATE__ =====
    const stateMatch = html.match(/window\.rawData\s*=\s*(\{[\s\S]+?\});\s*window\./);
    if (stateMatch) {
        try {
            const rawData = JSON.parse(stateMatch[1]);
            if (rawData.store?.goods?.skc) {
                const skc = rawData.store.goods.skc;
                skc.forEach(item => {
                    // Extraire les specs
                    if (item.sku) {
                        item.sku.forEach(sku => {
                            // Chercher tailles et couleurs dans les specs
                            if (sku.specs) {
                                sku.specs.forEach(spec => {
                                    const name = (spec.spec_name || '').toLowerCase();
                                    const value = spec.spec_value || '';
                                    
                                    if (name.includes('size') || name.includes('taille')) {
                                        if (!sizes.includes(value)) sizes.push(value);
                                        if (sku.stock === 0) outOfStockSizes.push(value);
                                    }
                                    if (name.includes('color') || name.includes('couleur')) {
                                        if (!colors.includes(value)) colors.push(value);
                                        if (sku.stock === 0) outOfStockColors.push(value);
                                    }
                                });
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.log('Parse rawData failed:', e.message);
        }
    }
    
    // ===== Méthode 2: Chercher les SKUs directement =====
    const skuListMatch = html.match(/"skuList"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
    if (skuListMatch && sizes.length === 0) {
        try {
            const skuList = JSON.parse(skuListMatch[1]);
            skuList.forEach(sku => {
                const size = sku.size || sku.sizeName || sku.specName || '';
                const color = sku.color || sku.colorName || '';
                const stock = sku.stock ?? sku.inventory ?? 1;
                
                if (size && !sizes.includes(size)) {
                    sizes.push(size);
                    if (stock === 0) outOfStockSizes.push(size);
                }
                if (color && !colors.includes(color)) {
                    colors.push(color);
                    if (stock === 0) outOfStockColors.push(color);
                }
            });
        } catch (e) {}
    }
    
    // ===== Méthode 3: Chercher les saleAttributes =====
    const saleAttrMatch = html.match(/"saleAttr(?:ibute)?s?"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
    if (saleAttrMatch && sizes.length === 0) {
        try {
            const attrs = JSON.parse(saleAttrMatch[1]);
            attrs.forEach(attr => {
                const name = (attr.attr_name || attr.name || '').toLowerCase();
                const values = attr.attr_values || attr.values || [];
                
                values.forEach(v => {
                    const val = v.attr_value || v.value || v.name || '';
                    const stock = v.stock ?? 1;
                    
                    if (name.includes('size') || name.includes('taille')) {
                        if (val && !sizes.includes(val)) {
                            sizes.push(val);
                            if (stock === 0) outOfStockSizes.push(val);
                        }
                    }
                    if (name.includes('color') || name.includes('couleur')) {
                        if (val && !colors.includes(val)) {
                            colors.push(val);
                            if (stock === 0) outOfStockColors.push(val);
                        }
                    }
                });
            });
        } catch (e) {}
    }
    
    // ===== Méthode 4: Regex patterns =====
    if (sizes.length === 0) {
        // Tailles standard
        const sizeMatches = html.matchAll(/"(?:size|sizeName|spec_value)"\s*:\s*"(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|\d{2,3})"/gi);
        for (const match of sizeMatches) {
            if (!sizes.includes(match[1])) sizes.push(match[1]);
        }
    }
    
    if (colors.length === 0) {
        // Couleurs
        const colorMatches = html.matchAll(/"(?:color|colorName)"\s*:\s*"([^"]{2,25})"/gi);
        for (const match of colorMatches) {
            const val = match[1];
            // Filtrer les valeurs qui ne sont pas des couleurs
            if (!val.match(/^(true|false|\d+|http|www|\.)/i) && !colors.includes(val)) {
                colors.push(val);
            }
        }
    }
    
    // Dédupliquer
    sizes = [...new Set(sizes)];
    colors = [...new Set(colors)];
    outOfStockSizes = [...new Set(outOfStockSizes)];
    outOfStockColors = [...new Set(outOfStockColors)];
    
    return {
        title,
        price,
        image,
        url,
        sizes,
        colors,
        outOfStockSizes,
        outOfStockColors,
        htmlLength: html.length
    };
}

function decodeUnicodeEscapes(str) {
    return str.replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => 
        String.fromCharCode(parseInt(code, 16))
    );
}
