/* ============================================
   FAMILY CUSTOM - Tracking Pixels
   GA4 + Facebook Pixel + TikTok Pixel
   ============================================ */

(function() {
    'use strict';

    // =============================================
    // REMPLACE CES VALEURS PAR TES VRAIS IDS :
    // =============================================
    const GA4_ID        = 'G-XXXXXXXXXX';       // Google Analytics 4
    const FB_PIXEL_ID   = '000000000000000';     // Facebook Pixel
    const TIKTOK_ID     = 'CXXXXXXXXX';          // TikTok Pixel
    // =============================================

    const isPlaceholder = (id, pattern) => pattern.test(id);
    const ga4Active     = !isPlaceholder(GA4_ID, /^G-X+$/);
    const fbActive      = !isPlaceholder(FB_PIXEL_ID, /^0+$/);
    const tiktokActive  = !isPlaceholder(TIKTOK_ID, /^CX+$/);

    // === Google Analytics 4 ===
    if (ga4Active) {
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
        document.head.appendChild(s);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { dataLayer.push(arguments); };
        gtag('js', new Date());
        gtag('config', GA4_ID, {
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure'
        });
    }

    // === Facebook Pixel ===
    if (fbActive) {
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
        n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
        s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(
        window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', FB_PIXEL_ID);
        fbq('track', 'PageView');
    }

    // === TikTok Pixel ===
    if (tiktokActive) {
        !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
        ttq.methods=["page","track","identify","instances","debug","on","off",
        "once","ready","alias","group","enableCookie","disableCookie"];
        ttq.setAndDefer=function(t,e){t[e]=function(){
        t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
        for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
        ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)
        ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i=
        "https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};
        ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e+
        "_"+n]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");
        o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
        var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load(TIKTOK_ID);ttq.page();}(window,document,'ttq');
    }

    // === TRACKING HELPERS (global) ===
    window.FCTracking = {

        // --- View Product ---
        viewProduct: function(product) {
            if (ga4Active) {
                gtag('event', 'view_item', {
                    currency: 'EUR',
                    value: product.price || 0,
                    items: [{ item_id: product.id, item_name: product.name, price: product.price }]
                });
            }
            if (fbActive) {
                fbq('track', 'ViewContent', {
                    content_name: product.name,
                    content_ids: [product.id],
                    content_type: 'product',
                    value: product.price || 0,
                    currency: 'EUR'
                });
            }
            if (tiktokActive) {
                ttq.track('ViewContent', {
                    content_id: product.id,
                    content_name: product.name,
                    value: product.price || 0,
                    currency: 'EUR'
                });
            }
        },

        // --- Add to Cart ---
        addToCart: function(product, quantity) {
            quantity = quantity || 1;
            if (ga4Active) {
                gtag('event', 'add_to_cart', {
                    currency: 'EUR',
                    value: (product.price || 0) * quantity,
                    items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: quantity }]
                });
            }
            if (fbActive) {
                fbq('track', 'AddToCart', {
                    content_ids: [product.id],
                    content_name: product.name,
                    content_type: 'product',
                    value: (product.price || 0) * quantity,
                    currency: 'EUR'
                });
            }
            if (tiktokActive) {
                ttq.track('AddToCart', {
                    content_id: product.id,
                    content_name: product.name,
                    value: (product.price || 0) * quantity,
                    currency: 'EUR',
                    quantity: quantity
                });
            }
        },

        // --- Begin Checkout ---
        beginCheckout: function(cart) {
            var total = cart.total || 0;
            var items = (cart.items || []).map(function(item) {
                return { item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity };
            });
            if (ga4Active) {
                gtag('event', 'begin_checkout', { currency: 'EUR', value: total, items: items });
            }
            if (fbActive) {
                fbq('track', 'InitiateCheckout', {
                    content_ids: items.map(function(i) { return i.item_id; }),
                    num_items: items.length,
                    value: total,
                    currency: 'EUR'
                });
            }
            if (tiktokActive) {
                ttq.track('InitiateCheckout', { value: total, currency: 'EUR' });
            }
        },

        // --- Purchase ---
        purchase: function(order) {
            var total = order.total || 0;
            var items = (order.items || []).map(function(item) {
                return { item_id: item.id || item.name, item_name: item.name, price: item.priceValue || item.price, quantity: item.quantity };
            });
            if (ga4Active) {
                gtag('event', 'purchase', {
                    transaction_id: order.orderNumber,
                    value: total,
                    currency: 'EUR',
                    shipping: order.shipping || 0,
                    items: items
                });
            }
            if (fbActive) {
                fbq('track', 'Purchase', {
                    content_ids: items.map(function(i) { return i.item_id; }),
                    content_type: 'product',
                    num_items: items.length,
                    value: total,
                    currency: 'EUR'
                });
            }
            if (tiktokActive) {
                ttq.track('CompletePayment', {
                    value: total,
                    currency: 'EUR',
                    quantity: items.length
                });
            }
        },

        // --- Search ---
        search: function(query) {
            if (ga4Active) {
                gtag('event', 'search', { search_term: query });
            }
            if (fbActive) {
                fbq('track', 'Search', { search_string: query });
            }
            if (tiktokActive) {
                ttq.track('Search', { query: query });
            }
        },

        // --- Lead (newsletter, contact form) ---
        lead: function(data) {
            if (ga4Active) {
                gtag('event', 'generate_lead', data || {});
            }
            if (fbActive) {
                fbq('track', 'Lead', data || {});
            }
            if (tiktokActive) {
                ttq.track('SubmitForm', data || {});
            }
        }
    };
})();
