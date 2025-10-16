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

    srv.on('createInvoiceFromPDFFile', async (req) => {
        console.log('[createInvoiceFromPDFFile] request received');
        const { file } = req.data;
        if (!file) return req.error(400, 'Missing file payload.');

        try {
            // file is expected to be base64 encoded PDF
            const pdfBuffer = Buffer.from(file, 'base64');

            // === 1️⃣ Call SAP Document AI ===
            // Requires service key (bound instance of Document Information Extraction)
            const destination = await cds.connect.to('sap.document.information.extraction'); // name in your mta.yaml or .env
            const accessToken = destination.token?.access_token || destination.auth?.token;

            const doxUrl = `${destination.url}/document-information-extraction/v1/document/jobs`;

            // Upload the document for extraction
            const response = await axios.post(
                doxUrl,
                {
                    extractor: { documentType: 'invoice' }, // or 'invoice_simple'
                    document: { name: 'invoice.pdf', content: file },
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const jobId = response.data.id;
            console.log(`DOX Job ID: ${jobId}`);

            // === 2️⃣ Poll for job result ===
            let jobResult;
            for (let i = 0; i < 10; i++) {
                await new Promise((r) => setTimeout(r, 3000));
                const statusRes = await axios.get(`${doxUrl}/${jobId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                if (statusRes.data.status === 'SUCCEEDED') {
                    jobResult = statusRes.data.result;
                    break;
                } else if (statusRes.data.status === 'FAILED') {
                    return req.error(500, 'Document AI processing failed.');
                }
            }

            if (!jobResult) {
                return req.error(408, 'Timed out waiting for Document AI result.');
            }

            // Get data
            const invoiceData = jobResult.documents?.[0]?.extractionResults?.[0];
            if (!invoiceData) {
                return req.error(422, 'No structured data could be extracted from PDF.');
            }

            // Example DOX schema structure:
            const header = {
                documentNumber: invoiceData.fields?.documentNumber?.value || '',
                invoiceDate: invoiceData.fields?.invoiceDate?.value || null,
                postingDate: invoiceData.fields?.postingDate?.value || null,
                dueDate: invoiceData.fields?.dueDate?.value || null,
                supplierName: invoiceData.fields?.seller?.value || '',
                supplierTaxID: invoiceData.fields?.sellerTaxId?.value || '',
                supplierAddress: invoiceData.fields?.sellerAddress?.value || '',
                buyerName: invoiceData.fields?.buyer?.value || '',
                buyerAddress: invoiceData.fields?.buyerAddress?.value || '',
                purchaseOrderNo: invoiceData.fields?.purchaseOrderNo?.value || '',
                currency: invoiceData.fields?.currency?.value || 'USD',
                netAmount: Number(invoiceData.fields?.netAmount?.value) || 0,
                taxAmount: Number(invoiceData.fields?.taxAmount?.value) || 0,
                grossAmount: Number(invoiceData.fields?.grossAmount?.value) || 0,
                paymentTerms: invoiceData.fields?.paymentTerms?.value || '',
                bankAccount: invoiceData.fields?.iban?.value || '',
            };

            // Extract item lines (if any)
            const items = (invoiceData.tables?.lineItems?.entries || []).map((row, i) => ({
                parentInvoice_documentNumber: header.documentNumber,
                lineNumber: row.lineItemNumber?.value || String(i + 1),
                description: row.description?.value || '',
                quantity: Number(row.quantity?.value) || 0,
                unit: row.unit?.value || '',
                unitPrice: Number(row.unitPrice?.value) || 0,
                netAmount: Number(row.netAmount?.value) || 0,
                taxRate: Number(row.taxRate?.value) || 0,
                taxCode: row.taxCode?.value || '',
                purchaseOrderNumber: row.purchaseOrderNo?.value || '',
                purchaseOrderItem: row.purchaseOrderItem?.value || '',
                materialNumber: row.materialNumber?.value || '',
            }));

            // INSERT
            await INSERT.into(Invoices).entries(header);
            if (items.length > 0) await INSERT.into(InvoiceItems).entries(items);

            const created = await SELECT.one.from(Invoices).where({ documentNumber: header.documentNumber });
            return created;

        } catch (err) {
            console.error('createInvoiceFromPDFFile error:', err);
            return req.error(500, 'Failed to process PDF: ' + err.message);
        }
    });
}
