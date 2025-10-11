using InvoiceService as service from '../../srv/invoice-service';
annotate service.Invoices with @(
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Value : documentNumber,
            Label : '{i18n>InvoiceNo}',
        },
        {
            $Type : 'UI.DataField',
            Value : invoiceDate,
            Label : '{i18n>InvoiceDate}',
        },
        {
            $Type : 'UI.DataField',
            Value : localNetAmount,
            Label : '{i18n>NetAmount}',
        },
        {
            $Type : 'UI.DataField',
            Value : supplierName,
            Label : '{i18n>Supplier}',
        },
        {
            $Type : 'UI.DataField',
            Value : buyerName,
            Label : '{i18n>Buyer}',
        },
        {
            $Type : 'UI.DataFieldForAction',
            Action : 'InvoiceService.EntityContainer/createInvoiceFromFile',
            Label : 'Upload Invoices',
        },
    ],
    UI.HeaderInfo : {
        TypeName : 'Invoice',
        TypeNamePlural : 'Invoices',
        Title : {
            $Type : 'UI.DataField',
            Value : documentNumber,
        },
    },
    UI.HeaderFacets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General Info',
            ID : 'GeneralInfo',
            Target : '@UI.FieldGroup#GeneralInfo',
        },
    ],
    UI.FieldGroup #GeneralInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : localGrossAmount,
                Label : '{i18n>GrossAmount}',
            },
            {
                $Type : 'UI.DataField',
                Value : localNetAmount,
                Label : '{i18n>NetAmount}',
            },
            {
                $Type : 'UI.DataField',
                Value : localTaxAmount,
                Label : '{i18n>TaxAmount}',
            },
            {
                $Type : 'UI.DataField',
                Value : dueDate,
                Label : '{i18n>DueDate}',
            },
            {
                $Type : 'UI.DataField',
                Value : invoiceDate,
                Label : '{i18n>InvoiceDate}',
            },
            {
                $Type : 'UI.DataField',
                Value : postingDate,
                Label : '{i18n>PostingDate}',
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Financial Details',
            ID : 'FinancialDetails',
            Target : '@UI.FieldGroup#FinancialDetails',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Supplier Details',
            ID : 'SupplierDetails',
            Target : '@UI.FieldGroup#SupplierDetails',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Buyer Details',
            ID : 'BuyerDetails',
            Target : '@UI.FieldGroup#BuyerDetails',
        },
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'Invoice Items',
            ID : 'InvoiceItems',
            Target : 'invoiceItems/@UI.LineItem#InvoiceItems',
        },
    ],
    UI.FieldGroup #SupplierDetails : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : supplierAddress,
                Label : 'supplierAddress',
            },
            {
                $Type : 'UI.DataField',
                Value : supplierName,
                Label : 'supplierName',
            },
            {
                $Type : 'UI.DataField',
                Value : supplierTaxID,
                Label : 'supplierTaxID',
            },
        ],
    },
    UI.FieldGroup #BuyerDetails : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : buyerAddress,
                Label : 'buyerAddress',
            },
            {
                $Type : 'UI.DataField',
                Value : buyerName,
                Label : 'buyerName',
            },
        ],
    },
    UI.FieldGroup #FinancialDetails : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : paymentTerms,
                Label : 'paymentTerms',
            },
            {
                $Type : 'UI.DataField',
                Value : bankAccount,
                Label : 'bankAccount',
            },
        ],
    },
);

annotate service.InvoiceItems with @(
    UI.LineItem #InvoiceItems : [
        {
            $Type : 'UI.DataField',
            Value : lineNumber,
            Label : '{i18n>LineItemNo}',
        },
        {
            $Type : 'UI.DataField',
            Value : purchaseOrderItem,
            Label : '{i18n>PurchaseOrderItem}',
        },
        {
            $Type : 'UI.DataField',
            Value : unit,
            Label : 'unit',
        },
        {
            $Type : 'UI.DataField',
            Value : unitPrice,
            Label : 'unitPrice',
        },
        {
            $Type : 'UI.DataField',
            Value : quantity,
            Label : 'quantity',
        },
    ],
    UI.HeaderFacets : [
        {
            $Type : 'UI.ReferenceFacet',
            Label : 'General Info',
            ID : 'GeneralInfo',
            Target : '@UI.FieldGroup#GeneralInfo',
        },
    ],
    UI.FieldGroup #GeneralInfo : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Value : lineNumber,
                Label : '{i18n>LineItemNo}',
            },
            {
                $Type : 'UI.DataField',
                Value : materialNumber,
                Label : 'materialNumber',
            },
            {
                $Type : 'UI.DataField',
                Value : netAmount,
                Label : 'netAmount',
            },
            {
                $Type : 'UI.DataField',
                Value : purchaseOrderItem,
                Label : 'purchaseOrderItem',
            },
            {
                $Type : 'UI.DataField',
                Value : purchaseOrderNumber,
                Label : 'purchaseOrderNumber',
            },
            {
                $Type : 'UI.DataField',
                Value : quantity,
                Label : 'quantity',
            },
            {
                $Type : 'UI.DataField',
                Value : taxCode,
                Label : 'taxCode',
            },
            {
                $Type : 'UI.DataField',
                Value : taxRate,
                Label : 'taxRate',
            },
            {
                $Type : 'UI.DataField',
                Value : unit,
                Label : 'unit',
            },
            {
                $Type : 'UI.DataField',
                Value : unitPrice,
                Label : 'unitPrice',
            },
        ],
    },
    UI.HeaderInfo : {
        Title : {
            $Type : 'UI.DataField',
            Value : description,
        },
        TypeName : 'InvoiceItem',
        TypeNamePlural : 'InvoiceItems',
    },
);

