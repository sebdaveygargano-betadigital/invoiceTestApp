using invoiceDB as db from '../db/schema';

service InvoiceService @(path: '/invoices') {

    /*@requires: [
        'User',
        'Admin'
    ]
    @restrict: [
        {
            grant: ['READ', ],
            to   : [
                'User',
                'Admin'
            ]
        },
        {
            grant: [
                'CREATE',
                'UPDATE',
                'DELETE'
            ],
            to   : ['Admin']
        }
    ]*/
    entity Invoices     as
        projection on db.Invoices {
            @title documentNumber,
            concat(
                grossAmount, ' ', currency
            )    as localGrossAmount : String,
            concat(
                netAmount, ' ', currency
            )    as localNetAmount   : String,
            concat(
                taxAmount, ' ', currency
            )    as localTaxAmount   : String,
            true as isOverdue        : Boolean, *
        };

    /*    @requires: [
            'User',
            'Admin'
        ]
        @restrict: [
            {
                grant: [
                    'READ',
                    'UPDATE',
                    'DELETE'
                ],
                to   : [
                    'User',
                    'Admin'
                ]
            },
            {
                grant: ['CREATE'],
                to   : ['Admin']
            }
        ]*/
    entity InvoiceItems as
        projection on db.InvoiceItems {
            @title lineNumber,
            *
        };


    @requires: 'Admin'
    action createInvoiceFromFile(file: LargeBinary, name: String) returns Invoices
}
