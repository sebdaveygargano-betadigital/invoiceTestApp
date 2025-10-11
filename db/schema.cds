namespace invoiceDB;


type ID_String   : String(24);
type Name_String : String(50);
type Addr_String : String(100);
type Long_Text   : String(300);

entity Invoices {

    key documentNumber  : ID_String @mandatory;
        invoiceDate     : DateTime  @mandatory;
        postingDate     : DateTime;
        dueDate         : DateTime;
        supplierName    : Name_String;
        supplierTaxID   : ID_String;
        supplierAddress : Addr_String;
        buyerName       : Name_String;
        buyerAddress    : Addr_String;
        purchaseOrderNo : ID_String;
        currency        : String(3) @mandatory;
        netAmount       : Integer;
        taxAmount       : Integer;
        grossAmount     : Integer   @mandatory;
        paymentTerms    : Long_Text;
        bankAccount     : String(10);
        invoiceItems    : Association to many InvoiceItems
                              on invoiceItems.parentInvoice = $self;


}

entity InvoiceItems {
    key parentInvoice       : Association to Invoices @mandatory;
    key lineNumber          : ID_String;
        description         : Addr_String             @mandatory;
        quantity            : Integer;
        unit                : String(5);
        unitPrice           : Integer                 @mandatory;
        netAmount           : Integer                 @mandtory;
        taxRate             : Integer;
        taxCode             : String(10);
        purchaseOrderNumber : ID_String;
        purchaseOrderItem   : Name_String;
        materialNumber      : ID_String;


}
