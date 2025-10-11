module.exports = (srv) => {

    const { Invoices, InvoiceItems } = srv.entities;


    srv.before(['READ'], 'Invoices', async (req) => {

        console.log(req.user);
    });


    srv.on('createInvoiceFromFile', async (req) => {
        // using simulated flow right now
        console.log(req.data);
        console.log(req.user);

        try {
            // When using simulated flow, the frontend sends JSON directly
            let invoiceData;

            // Handle both simulation and real binary (if you add DOX later)
            if (typeof req.data.file === 'string') {
                // JSON string or base64 string sent by frontend
                invoiceData = JSON.parse(req.data.file);
            } else if (req.data.file && Buffer.isBuffer(req.data.file)) {
                // In real scenario: decode PDF → send to DOX → receive structured JSON
                // Not implemented here since DOX isn’t available in trial
                return req.error(400, 'PDF input not supported in trial mode.');
            } else {
                return req.error(400, 'Missing or invalid "file" payload');
            }

            // Validate expected structure
            if (!invoiceData.header || !Array.isArray(invoiceData.items)) {
                return req.error(400, 'Invalid invoice JSON structure');
            }

            const header = invoiceData.header;
            const items = invoiceData.items || [];

            // Build main invoice record
            const invoiceRecord = {
                documentNumber: header.documentNumber,
                invoiceDate: header.invoiceDate,
                postingDate: header.postingDate,
                dueDate: header.dueDate,
                supplierName: header.supplierName,
                supplierTaxID: header.supplierTaxID,
                supplierAddress: header.supplierAddress,
                buyerName: header.buyerName,
                buyerAddress: header.buyerAddress,
                purchaseOrderNo: header.purchaseOrderNo,
                currency: header.currency,
                netAmount: header.netAmount,
                taxAmount: header.taxAmount,
                grossAmount: header.grossAmount,
                paymentTerms: header.paymentTerms,
                bankAccount: header.bankAccount
            };

            // Insert Invoice
            await INSERT.into(Invoices).entries(invoiceRecord);

            // Insert related items
            if (items.length > 0) {
                const itemRecords = items.map((item, idx) => ({
                    parentInvoice_documentNumber: header.documentNumber,
                    lineNumber: item.lineNumber || String(idx + 1),
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    netAmount: item.netAmount,
                    taxRate: item.taxRate,
                    taxCode: item.taxCode,
                    purchaseOrderNumber: item.purchaseOrderNumber,
                    purchaseOrderItem: item.purchaseOrderItem,
                    materialNumber: item.materialNumber
                }));
                await INSERT.into(InvoiceItems).entries(itemRecords);
            }

            // Return the created invoice (CAP will serialize it automatically)
            const created = await SELECT.one.from(Invoices).where({ documentNumber: header.documentNumber });
            return created;

        } catch (err) {
            console.error('createInvoiceFromFile error:', err);
            return req.error(500, 'Failed to create invoice from file: ' + err.message);
        }
    });
}