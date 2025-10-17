sap.ui.define(
  ["sap/m/MessageToast", "sap/ui/core/Fragment"],
  function (MessageToast, Fragment) {
    "use strict";

    const handler = {
      // use const so we can reference its functions
      attachPDF: function (oContext, aSelectedContexts) {
        console.log("Custom func invoked");

        // Keep a reference to this module (the 'handler' object)
        const that = handler;

        if (!that._fileUploadDialog) {
          console.log("Loading invoiceapptwo.ext.fragment.FileUploader");
          Fragment.load({
            name: "invoiceapptwo.ext.fragment.FileUploader",
            controller: {
              onFileSelected: that.onFileSelected.bind(that),
              onAttachPressed: that.onAttachPDFPressed.bind(that),
              onCancelPressed: that.onCancelPressed.bind(that),
            },
          }).then(function (oDialog) {
            that._fileUploadDialog = oDialog;
            that._fileUploadDialog.open();
          });
        } else {
          that._fileUploadDialog.open();
        }
      },

      onFileSelected: function (oEvent) {
        console.log("Called");
        var oFileUploader = oEvent.getSource();
        var oAttachButton = sap.ui.getCore().byId("attachButton");
        oAttachButton.setEnabled(oFileUploader.getValue() !== "");
      },

      onAttachPressed: async function (oEvent) {
        const oFileUploader = sap.ui.getCore().byId("invoiceFileUploader");
        const file =
          oFileUploader.oFileUpload && oFileUploader.oFileUpload.files[0];

        if (!file) {
          sap.m.MessageToast.show("Please select a PDF file first");
          return;
        }

        // Ensure it's a JSON file (pretending DOX output)
        if (!file.name.toLowerCase().endsWith(".json")) {
          sap.m.MessageToast.show(
            "Please upload a valid JSON file (simulated DOX output)"
          );
          return;
        }

        try {
          // Read the JSON file
          const text = await file.text();
          const parsedData = JSON.parse(text);
          console.log("Parsed DOX-style JSON:", parsedData);

          // Call service action
          const response = await fetch("/invoices/createInvoiceFromFile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              file: JSON.stringify(parsedData),
              name: file.name,
            }),
          });

          if (!response.ok) {
            console.log(response);
            throw new Error(`Backend error: ${response.statusText}`);
          }

          const result = await response.json();
          console.log("Backend result:", result);

          sap.m.MessageToast.show(
            `Invoice created successfully from ${file.name}`
          );
        } catch (err) {
          console.error("Error processing file:", err);
          sap.m.MessageToast.show(`Error: ${err.message}`);
        }

        // Close and reset
        handler._fileUploadDialog.close();
        oFileUploader.clear();
      },

      onAttachPDFPressed: async function (oEvent) {
        const oFileUploader = sap.ui.getCore().byId("invoiceFileUploader");
        const file =
          oFileUploader.oFileUpload && oFileUploader.oFileUpload.files[0];

        if (!file) {
          sap.m.MessageToast.show("Please select a PDF file first");
          return;
        }

        // Ensure it's a PDF
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          sap.m.MessageToast.show("Please upload a valid PDF file");
          return;
        }

        try {
          // Read PDF as base64
          const base64File = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(",")[1]); // remove data:*/*;base64, prefix
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          console.log("PDF file base64 length:", base64File.length);

          // Call backend action with file content and name
          const response = await fetch("/invoices/createInvoiceFromPDFFile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              file: base64File,
              name: file.name,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Backend error: ${response.status} ${errText}`);
          }

          const result = await response.json();
          console.log("Backend result:", result);

          sap.m.MessageToast.show(
            `Invoice created successfully from ${file.name}`
          );
        } catch (err) {
          console.error("Error processing PDF:", err);
          sap.m.MessageToast.show(`Error: ${err.message}`);
        }

        // Close dialog and reset uploader
        handler._fileUploadDialog.close();
        oFileUploader.clear();
      },

      onCancelPressed: function () {
        handler._fileUploadDialog.close();
        oFileUploader.clear();
      },
    };

    return handler;
  }
);
