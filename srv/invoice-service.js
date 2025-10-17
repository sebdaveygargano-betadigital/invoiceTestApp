module.exports = (srv) => {
  const { Invoices, InvoiceItems } = srv.entities;

  srv.before(["READ"], "Invoices", async (req) => {
    console.log(req.user);
  });

  srv.on("createInvoiceFromFile", async (req) => {
    // using simulated flow right now
    console.log(req.data);
    console.log(req.user);

    try {
      // When using simulated flow, the frontend sends JSON directly
      let invoiceData;

      // Handle both simulation and real binary (if you add DOX later)
      if (typeof req.data.file === "string") {
        // JSON string or base64 string sent by frontend
        invoiceData = JSON.parse(req.data.file);
      } else if (req.data.file && Buffer.isBuffer(req.data.file)) {
        // In real scenario: decode PDF → send to DOX → receive structured JSON
        // Not implemented here since DOX isn’t available in trial
        return req.error(400, "PDF input not supported in trial mode.");
      } else {
        return req.error(400, 'Missing or invalid "file" payload');
      }

      // Validate expected structure
      if (!invoiceData.header || !Array.isArray(invoiceData.items)) {
        return req.error(400, "Invalid invoice JSON structure");
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
        bankAccount: header.bankAccount,
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
          materialNumber: item.materialNumber,
        }));
        await INSERT.into(InvoiceItems).entries(itemRecords);
      }

      // Return the created invoice (CAP will serialize it automatically)
      const created = await SELECT.one
        .from(Invoices)
        .where({ documentNumber: header.documentNumber });
      return created;
    } catch (err) {
      console.error("createInvoiceFromFile error:", err);
      return req.error(
        500,
        "Failed to create invoice from file: " + err.message
      );
    }
  });

  const axios = require("axios");

  srv.on("createInvoiceFromPDFFile", async (req) => {
    console.log("[createInvoiceFromPDFFile] request received");

    const { file } = req.data;
    if (!file) return req.error(400, "Missing file payload.");

    try {
      // === 0️⃣ Convert file from base64 to buffer ===
      const pdfBuffer = Buffer.from(file, "base64");

      // === 1️⃣ Connect to SAP Document AI service ===
      const destination = await cds.connect.to(
        "sap-document-information-extraction"
      );
      console.log("checkpoint 1");
      const accessToken =
        destination.token?.access_token || destination.auth?.token;

      const doxBaseUrl =
        destination.options.url ||
        "https://aiservices-dox.cfapps.ap10.hana.ondemand.com";
      console.log("~Connection is ", destination);
      console.log("BASE ~URL __________", doxBaseUrl);
      const doxJobUrl = `${doxBaseUrl}/document-information-extraction/v1/document/jobs`;

      console.log("checkpoint 2");

      // === 2️⃣ Start extraction job ===
      const jobResponse = await axios.post(
        doxJobUrl,
        {
          extractor: { documentType: "invoice" }, // adjust if needed
          document: { name: "invoice.pdf", content: file },
          schemaName: "sebs-test-schema",
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("checkpoint 3");
      const jobId = jobResponse.data.id;
      console.log(`Document AI Job ID: ${jobId}`);

      // === 3️⃣ Poll for job completion ===
      let jobResult = null;
      const maxRetries = 10;
      const pollInterval = 3000; // 3 seconds

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        const statusRes = await axios.get(`${doxJobUrl}/${jobId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const status = statusRes.data.status;
        if (status === "SUCCEEDED") {
          jobResult = statusRes.data.result;
          break;
        } else if (status === "FAILED") {
          return req.error(500, "Document AI processing failed.");
        }
      }
      console.log("checkpoint 4");
      if (!jobResult) {
        return req.error(408, "Timed out waiting for Document AI result.");
      }

      // === 4️⃣ Extract invoice data from result ===
      const invoiceData = jobResult.documents?.[0]?.extractionResults?.[0];
      if (!invoiceData) {
        return req.error(
          422,
          "No structured data could be extracted from PDF."
        );
      }
      console.log("checkpoint 5");
      /*
      const header = {
        documentNumber: invoiceData.fields?.documentNumber?.value || "",
        invoiceDate: invoiceData.fields?.invoiceDate?.value || null,
        postingDate: invoiceData.fields?.postingDate?.value || null,
        dueDate: invoiceData.fields?.dueDate?.value || null,
        supplierName: invoiceData.fields?.seller?.value || "",
        supplierTaxID: invoiceData.fields?.sellerTaxId?.value || "",
        supplierAddress: invoiceData.fields?.sellerAddress?.value || "",
        buyerName: invoiceData.fields?.buyer?.value || "",
        buyerAddress: invoiceData.fields?.buyerAddress?.value || "",
        purchaseOrderNo: invoiceData.fields?.purchaseOrderNo?.value || "",
        currency: invoiceData.fields?.currency?.value || "USD",
        netAmount: Number(invoiceData.fields?.netAmount?.value) || 0,
        taxAmount: Number(invoiceData.fields?.taxAmount?.value) || 0,
        grossAmount: Number(invoiceData.fields?.grossAmount?.value) || 0,
        paymentTerms: invoiceData.fields?.paymentTerms?.value || "",
        bankAccount: invoiceData.fields?.iban?.value || "",
      };

      const items =
        (invoiceData.tables?.lineItems?.entries || []).map((row, idx) => ({
          parentInvoice_documentNumber: header.documentNumber,
          lineNumber: row.lineItemNumber?.value || String(idx + 1),
          description: row.description?.value || "",
          quantity: Number(row.quantity?.value) || 0,
          unit: row.unit?.value || "",
          unitPrice: Number(row.unitPrice?.value) || 0,
          netAmount: Number(row.netAmount?.value) || 0,
          taxRate: Number(row.taxRate?.value) || 0,
          taxCode: row.taxCode?.value || "",
          purchaseOrderNumber: row.purchaseOrderNo?.value || "",
          purchaseOrderItem: row.purchaseOrderItem?.value || "",
          materialNumber: row.materialNumber?.value || "",
        })) || [];

      // === 5️⃣ Insert into CAP entities ===
      await INSERT.into(Invoices).entries(header);
      if (items.length > 0) await INSERT.into(InvoiceItems).entries(items);

      // === 6️⃣ Return the created invoice ===
      const createdInvoice = await SELECT.one
        .from(Invoices)
        .where({ documentNumber: header.documentNumber });
*/
      return null;
    } catch (err) {
      console.error("[createInvoiceFromPDFFile] error:", err);
      return req.error(500, "Failed to process PDF: " + err.message);
    }
  });
};
