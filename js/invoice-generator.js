/* ============================================
   FAMILY CUSTOM - Invoice Generator
   Génération de factures PDF pour clients pro
   ============================================ */

const FCInvoice = (function() {
    'use strict';
    
    // Company info (à personnaliser)
    const COMPANY_INFO = {
        name: 'Family Custom',
        address: '',
        postalCode: '42330',
        city: 'Saint-Galmier',
        country: 'France',
        email: 'support@family-custom.com',
        siret: 'XXX XXX XXX XXXXX', // À remplacer par ton vrai SIRET
        vatNumber: 'FR XX XXXXXXXXX', // À remplacer par ton vrai N° TVA
        website: 'www.family-custom.com'
    };
    
    // Generate invoice number
    function generateInvoiceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        return `FA-${year}${month}-${random}`;
    }
    
    // Format date for invoice
    function formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    // Generate PDF invoice
    async function generateInvoice(order) {
        // Check if jsPDF is loaded
        if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            console.error('jsPDF not loaded');
            return null;
        }
        
        const { jsPDF } = window.jspdf || window;
        const doc = new jsPDF();
        
        const invoiceNumber = generateInvoiceNumber();
        const invoiceDate = formatDate(new Date());
        const dueDate = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // +30 jours
        
        // Colors
        const primaryColor = [224, 122, 95]; // #e07a5f
        const darkColor = [45, 45, 45];
        const lightGray = [150, 150, 150];
        
        let y = 20;
        
        // === HEADER ===
        // Logo/Company name
        doc.setFontSize(24);
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
        doc.text(COMPANY_INFO.name, 20, y);
        
        // FACTURE badge
        doc.setFillColor(...primaryColor);
        doc.roundedRect(140, y - 10, 50, 15, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text('FACTURE', 165, y - 1, { align: 'center' });
        
        y += 15;
        
        // Company info
        doc.setFontSize(9);
        doc.setTextColor(...lightGray);
        doc.setFont('helvetica', 'normal');
        doc.text([
            COMPANY_INFO.address,
            `${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`,
            `Tél: ${COMPANY_INFO.phone}`,
            `Email: ${COMPANY_INFO.email}`,
            `SIRET: ${COMPANY_INFO.siret}`,
            `N° TVA: ${COMPANY_INFO.vatNumber}`
        ], 20, y);
        
        // Invoice info (right side)
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text('Facture N°:', 140, y);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceNumber, 170, y);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Date:', 140, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceDate, 170, y + 6);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Échéance:', 140, y + 12);
        doc.setFont('helvetica', 'normal');
        doc.text(dueDate, 170, y + 12);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Commande:', 140, y + 18);
        doc.setFont('helvetica', 'normal');
        doc.text(order.orderNumber || '-', 170, y + 18);
        
        y += 50;
        
        // === CLIENT INFO ===
        // Box for client
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(110, y - 5, 85, 40, 3, 3, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.roundedRect(110, y - 5, 85, 40, 3, 3, 'S');
        
        doc.setFontSize(10);
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'bold');
        doc.text('Facturer à:', 115, y + 2);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        const clientLines = [];
        if (order.customer.companyName) {
            clientLines.push(order.customer.companyName);
        }
        clientLines.push(`${order.customer.firstName} ${order.customer.lastName}`);
        clientLines.push(order.customer.address);
        clientLines.push(`${order.customer.postalCode} ${order.customer.city}`);
        if (order.customer.siret) {
            clientLines.push(`SIRET: ${order.customer.siret}`);
        }
        if (order.customer.vatNumber) {
            clientLines.push(`N° TVA: ${order.customer.vatNumber}`);
        }
        
        doc.text(clientLines, 115, y + 10);
        
        y += 50;
        
        // === TABLE HEADER ===
        doc.setFillColor(...primaryColor);
        doc.rect(20, y, 170, 10, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Description', 25, y + 7);
        doc.text('Qté', 120, y + 7);
        doc.text('Prix unit. HT', 135, y + 7);
        doc.text('Total HT', 170, y + 7);
        
        y += 15;
        
        // === TABLE ITEMS ===
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'normal');
        
        let subtotalHT = 0;
        
        order.items.forEach((item, index) => {
            const priceHT = item.priceValue / 1.20; // TVA 20%
            const totalHT = priceHT * item.quantity;
            subtotalHT += totalHT;
            
            // Alternate row background
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(20, y - 5, 170, 12, 'F');
            }
            
            // Item name (with customization if any)
            let itemName = item.name;
            if (item.customization) {
                itemName += ` - "${item.customization}"`;
            }
            
            // Truncate if too long
            if (itemName.length > 50) {
                itemName = itemName.substring(0, 47) + '...';
            }
            
            doc.text(itemName, 25, y);
            doc.text(item.quantity.toString(), 123, y);
            doc.text(priceHT.toFixed(2) + ' €', 140, y);
            doc.text(totalHT.toFixed(2) + ' €', 172, y);
            
            y += 10;
            
            // Check if we need a new page
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
        });
        
        // Shipping
        const shippingHT = order.shipping / 1.20;
        subtotalHT += shippingHT;
        
        doc.setFillColor(250, 250, 250);
        doc.rect(20, y - 5, 170, 12, 'F');
        doc.text('Livraison', 25, y);
        doc.text('1', 123, y);
        doc.text(shippingHT.toFixed(2) + ' €', 140, y);
        doc.text(shippingHT.toFixed(2) + ' €', 172, y);
        
        y += 20;
        
        // === TOTALS ===
        const tva = subtotalHT * 0.20;
        const totalTTC = subtotalHT + tva;
        
        // Totals box
        doc.setDrawColor(230, 230, 230);
        doc.rect(120, y - 5, 70, 35, 'S');
        
        doc.setFontSize(9);
        doc.text('Sous-total HT:', 125, y + 2);
        doc.text(subtotalHT.toFixed(2) + ' €', 175, y + 2, { align: 'right' });
        
        doc.text('TVA (20%):', 125, y + 10);
        doc.text(tva.toFixed(2) + ' €', 175, y + 10, { align: 'right' });
        
        doc.setFillColor(...primaryColor);
        doc.rect(120, y + 15, 70, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('TOTAL TTC:', 125, y + 22);
        doc.text(totalTTC.toFixed(2) + ' €', 175, y + 22, { align: 'right' });
        
        y += 50;
        
        // === PAYMENT INFO ===
        doc.setTextColor(...darkColor);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Conditions de paiement:', 20, y);
        doc.setFont('helvetica', 'normal');
        doc.text('Paiement à réception de facture. En cas de retard de paiement, des pénalités seront appliquées.', 20, y + 6);
        
        y += 20;
        
        // === FOOTER ===
        doc.setFontSize(8);
        doc.setTextColor(...lightGray);
        doc.text(
            `${COMPANY_INFO.name} - SIRET: ${COMPANY_INFO.siret} - ${COMPANY_INFO.website}`,
            105, 285,
            { align: 'center' }
        );
        
        // Save invoice data to order
        order.invoice = {
            number: invoiceNumber,
            date: invoiceDate,
            dueDate: dueDate
        };
        
        return doc;
    }
    
    // Download invoice
    async function downloadInvoice(order) {
        const doc = await generateInvoice(order);
        if (doc) {
            doc.save(`Facture_${order.invoice.number}_${order.customer.companyName || order.customer.lastName}.pdf`);
        }
    }
    
    // Get invoice as blob (for email attachment)
    async function getInvoiceBlob(order) {
        const doc = await generateInvoice(order);
        if (doc) {
            return doc.output('blob');
        }
        return null;
    }
    
    // Get invoice as base64 (for email)
    async function getInvoiceBase64(order) {
        const doc = await generateInvoice(order);
        if (doc) {
            return doc.output('datauristring');
        }
        return null;
    }
    
    // Public API
    return {
        generateInvoice,
        downloadInvoice,
        getInvoiceBlob,
        getInvoiceBase64,
        COMPANY_INFO
    };
    
})();
