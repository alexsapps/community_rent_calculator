// This project uses namespaces instead of module imports due to a limitation of
// Clasp:
// https://github.com/google/clasp/blob/master/docs/typescript.md#the-namespace-statement-workaround
//
// Note in VS Code, all related files need to be open in the editor to avoid
// errors in the editor. The TypeScript compiler will still compile the files
// regardless.
namespace Main {
    export function CalculateRentForActiveSheet() {
        const sheet = SpreadsheetApp.getActiveSheet();

        const {input, columnIndex} = InputReading.ReadInput(sheet);

        const output = RentCalculation.CalculateRent(input);

        OutputWriting.WriteOutput(output, sheet, columnIndex);
    }

    export function CreateRentSheet() {
        NewSheetSetup.SetUpSheet();
    }

    export function CreateBillSplittingSheet() {
        BillSplitting.SetUpSheet();
    }

    export function CalculateBillSplittingSheet() {
        BillSplitting.CalculateBills();
    }
}

function CalculateRentForActiveSheet() {
    Main.CalculateRentForActiveSheet();
}

function CreateRentSheet() {
    Main.CreateRentSheet();
}

function CreateBillSplittingSheet() {
    Main.CreateBillSplittingSheet();
}

function CalculateBillSplittingSheet() {
    Main.CalculateBillSplittingSheet();
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Rent Calculator')
        .addItem('Calculate current rent sheet', 'CalculateRentForActiveSheet')
        .addItem('Set up current sheet as new rent sheet', 'CreateRentSheet')
        .addItem('Calculate current bill splitting sheet', 'CalculateBillSplittingSheet')
        .addItem('Set up current sheet as new bill splitting sheet', 'CreateBillSplittingSheet')
        .addToUi();
}
