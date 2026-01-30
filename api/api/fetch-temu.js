const https = require('https');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const url = req.query.url || (req.body && req.body.url);
    
    if (!url || !url.includes('temu.com')) {
        return res.status(400).json({ error: 'URL Temu invalide' });
    }
    
    // Extraire l'ID du produit
    const goodsIdMatch = url.match(/g-(\d+)\.html/);
    if (!goodsIdMatch) {
        return res.status(400).json({ error: 'Format URL invalide. L\'URL doit contenir g-XXXXX.html' });
    }
    
    const goodsId = goodsIdMatch[1];
    
    try {
        // Essayer l'API mobile Temu
        const data = await fetchTemuMobileAPI(goodsId, url);
        
        return res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Erreur:', error);
        return res.status(500).json({ 
            error: 'Impossible de récupérer les données',
            message: error.message 
        });
    }
};

// API Mobile Temu - moins protégée
function fetchTemuMobileAPI(goodsId, originalUrl) {
    return new Promise((resolve, reject) => {
        // Endpoint API Temu pour les détails produit
        const apiEndpoints = [
            {
                hostname: 'www.temu.com',
                path: `/api/poppy/v1/goods?goods_id=${goodsId}&scene=detail`,
                method: 'GET'
            },
            {
                hostname: 'www.temu.com', 
                path: '/api/bg/babylon/v4/page/page_data',
                method: 'POST',
                body: JSON.stringify({
                    page_name: 'goods_v3',
                    goods_id: goodsId,
                    scene: 'goods_detail'
                })
            }
        ];
        
        // Essayer le premier endpoint
        tryEndpoint(apiEndpoints, 0, goodsId, originalUrl, resolve, reject);
    });
}

function tryEndpoint(endpoints, index, goodsId, originalUrl, resolve, reject) {
    if (index >= endpoints.length) {
        // Fallback: essayer de scraper la page mobile
        fetchMobilePage(originalUrl)
            .then(html => {
                const data = parseTemuHtml(html, originalUrl, goodsId);
                resolve(data);
            })
            .catch(reject);
        return;
    }
    
    const endpoint = endpoints[index];
    
    const options = {
        hostname: endpoint.hostname,
        path: endpoint.path,
        method: endpoint.method,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            'Accept-Encoding': 'identity',
            'Origin': 'https://www.temu.com',
            'Referer': originalUrl,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
            'Cookie': 'region=FR;currency=EUR;language=fr;api_uid=CnB1Z2dNTGhZd1c='
        }
    };
    
    if (endpoint.body) {
        options.headers['Content-Length'] = Buffer.byteLength(endpoint.body);
    }
    
    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.success || json.result || json.data) {
                    const result = parseApiResponse(json, goodsId, originalUrl);
                    if (result.sizes.length > 0 || result.colors.length > 0) {
                        resolve(result);
                        return;
                    }
                }
            } catch (e) {
                console.log(`Endpoint ${index} failed:`, e.message);
            }
            
            // Essayer le prochain endpoint
            tryEndpoint(endpoints, index + 1, goodsId, originalUrl, resolve, reject);
        });
    });
    
    request.on('error', () => {
        tryEndpoint(endpoints, index + 1, goodsId, originalUrl, resolve, reject);
    });
    
    request.setTimeout(10000, () => {
        request.destroy();
        tryEndpoint(endpoints, index + 1, goodsId, originalUrl, resolve, reject);
    });
    
    if (endpoint.body) {
        request.write(endpoint.body);
    }
    request.end();
}

function parseApiResponse(json, goodsId, originalUrl) {
    const sizes = [];
    const colors = [];
    const outOfStockSizes = [];
    const outOfStockColors = [];
    let title = '';
    let price = '';
    let image = '';
    
    // Chercher les données dans différentes structures possibles
    const data = json.result || json.data || json;
    const goods = data.goods || data.goodsInfo || data.goodsDetail || data;
    
    // Titre
    title = goods.goodsName || goods.goods_name || goods.title || goods.name || '';
    
    // Prix
    if (goods.minPrice || goods.min_price) {
        let p = goods.minPrice || goods.min_price;
        if (p > 100) p = p / 100;
        price = p.toFixed(2);
    }
    
    // Image
    image = goods.thumbUrl || goods.thumb_url || goods.image || goods.mainImage || '';
    
    // Chercher saleAttr ou skc
    const skc = goods.skc || goods.skcList || [];
    const saleAttr = goods.saleAttr || goods.sale_attr || [];
    
    // Extraire depuis saleAttr
    saleAttr.forEach(attr => {
        const name = (attr.attrName || attr.attr_name || attr.name || '').toLowerCase();
        const values = attr.attrValues || attr.attr_values || attr.values || attr.list || [];
        
        values.forEach(v => {
            const val = v.attrValue || v.attr_value || v.value || v.name || '';
            const stock = v.stock ?? v.inventory ?? 1;
            const soldOut = v.soldOut || v.sold_out || false;
            
            if (name.includes('size') || name.includes('taille') || name.includes('尺')) {
                if (val && !sizes.includes(val)) {
                    sizes.push(val);
                    if (stock === 0 || soldOut) outOfStockSizes.push(val);
                }
            }
            if (name.includes('color') || name.includes('couleur') || name.includes('颜色')) {
                if (val && !colors.includes(val)) {
                    colors.push(val);
                    if (stock === 0 || soldOut) outOfStockColors.push(val);
                }
            }
        });
    });
    
    // Extraire depuis SKC
    skc.forEach(item => {
        if (item.saleAttr) {
            item.saleAttr.forEach(attr => {
                const name = (attr.attrName || '').toLowerCase();
                const values = attr.attrValues || [];
                
                values.forEach(v => {
                    const val = v.attrValue || '';
                    if (name.includes('size') || name.includes('taille')) {
                        if (val && !sizes.includes(val)) sizes.push(val);
                    }
                    if (name.includes('color') || name.includes('couleur')) {
                        if (val && !colors.includes(val)) colors.push(val);
                    }
                });
            });
        }
        
        // SKU list
        if (item.sku) {
            item.sku.forEach(sku => {
                if (sku.specs) {
                    sku.specs.forEach(spec => {
                        const name = (spec.spec_name || '').toLowerCase();
                        const value = spec.spec_value || '';
                        const stock = sku.stock ?? 1;
                        
                        if (name.includes('size') && value) {
                            if (!sizes.includes(value)) {
                                sizes.push(value);
                                if (stock === 0) outOfStockSizes.push(value);
                            }
                        }
                        if (name.includes('color') && value) {
                            if (!colors.includes(value)) {
                                colors.push(value);
                                if (stock === 0) outOfStockColors.push(value);
                            }
                        }
                    });
                }
            });
        }
    });
    
    return {
        title: decodeUnicode(title),
        price,
        image,
        url: originalUrl,
        goodsId,
        sizes: [...new Set(sizes)],
        colors: [...new Set(colors)],
        outOfStockSizes: [...new Set(outOfStockSizes)],
        outOfStockColors: [...new Set(outOfStockColors)],
        source: 'api'
    };
}

function fetchMobilePage(url) {
    return new Promise((resolve, reject) => {
        // Convertir en URL mobile
        const mobileUrl = url.replace('www.temu.com', 'm.temu.com');
        const parsedUrl = new URL(mobileUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9',
                'Accept-Encoding': 'identity',
                'Cookie': 'region=FR;currency=EUR;language=fr'
            }
        };
        
        const request = https.request(options, (response) => {
            // Suivre redirections
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                let redirectUrl = response.headers.location;
                if (redirectUrl.startsWith('/')) {
                    redirectUrl = `https://${parsedUrl.hostname}${redirectUrl}`;
                }
                fetchMobilePage(redirectUrl).then(resolve).catch(reject);
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

function parseTemuHtml(html, url, goodsId) {
    let title = '';
    let price = '';
    let image = '';
    let sizes = [];
    let colors = [];
    let outOfStockSizes = [];
    let outOfStockColors = [];
    let debugInfo = [];
    
    // Chercher les données JSON dans le HTML
    const jsonPatterns = [
        /window\.rawData\s*=\s*(\{[\s\S]+?\});\s*window\./,
        /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]+?\});/,
        /"goods"\s*:\s*(\{[\s\S]+?\})\s*,\s*"(?:user|common)/,
    ];
    
    for (const pattern of jsonPatterns) {
        const match = html.match(pattern);
        if (match) {
            try {
                const data = JSON.parse(match[1]);
                debugInfo.push('Found JSON in HTML');
                
                const goods = data.store?.goods || data.goods || data;
                
                if (goods.goodsName) title = decodeUnicode(goods.goodsName);
                if (goods.minPrice) {
                    let p = goods.minPrice;
                    if (p > 100) p = p / 100;
                    price = p.toFixed(2);
                }
                if (goods.thumbUrl) image = goods.thumbUrl;
                
                // Extraire saleAttr
                const skc = goods.skc || [];
                skc.forEach(item => {
                    if (item.saleAttr) {
                        item.saleAttr.forEach(attr => {
                            const name = (attr.attrName || '').toLowerCase();
                            (attr.attrValues || []).forEach(v => {
                                const val = v.attrValue || '';
                                if (name.includes('size') && val && !sizes.includes(val)) {
                                    sizes.push(val);
                                }
                                if (name.includes('color') && val && !colors.includes(val)) {
                                    colors.push(val);
                                }
                            });
                        });
                    }
                });
                
                if (sizes.length > 0 || colors.length > 0) break;
            } catch (e) {
                debugInfo.push('JSON parse error');
            }
        }
    }
    
    // Fallback regex
    if (sizes.length === 0) {
        debugInfo.push('Using regex fallback');
        const standardSizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', '5XL'];
        
        standardSizes.forEach(size => {
            const pattern = new RegExp(`"(?:size|sizeName|attrValue)"\\s*:\\s*"${size}"`, 'gi');
            if (pattern.test(html) && !sizes.includes(size)) {
                sizes.push(size);
            }
        });
    }
    
    if (colors.length === 0) {
        const colorMatches = html.matchAll(/"(?:color|colorName)"\s*:\s*"([^"]{2,20})"/gi);
        for (const match of colorMatches) {
            const val = match[1];
            if (!val.match(/^(true|false|\d+|http)/i) && !colors.includes(val)) {
                colors.push(val);
            }
        }
    }
    
    // Titre fallback
    if (!title) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
            title = titleMatch[1].replace(/\s*[-|]\s*Temu.*$/i, '');
        }
    }
    
    return {
        title,
        price,
        image,
        url,
        goodsId,
        sizes: [...new Set(sizes)],
        colors: [...new Set(colors)],
        outOfStockSizes: [...new Set(outOfStockSizes)],
        outOfStockColors: [...new Set(outOfStockColors)],
        htmlLength: html.length,
        debug: debugInfo,
        source: 'html'
    };
}

function decodeUnicode(str) {
    if (!str) return '';
    return str
        .replace(/\\u([\dA-Fa-f]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
}
