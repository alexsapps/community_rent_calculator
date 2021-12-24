// This project uses namespaces instead of module imports due to a limitation of
// Clasp:
// https://github.com/google/clasp/blob/master/docs/typescript.md#the-namespace-statement-workaround
namespace Main {
    export function CalculateRentForActiveSheet() {
        const sheet = SpreadsheetApp.getActiveSheet();

        const {input, columnIndex} = InputReading.ReadInput(sheet);

        const output = RentCalculation.CalculateRent(input);

        OutputWriting.WriteOutput(output, sheet, columnIndex);
    }
}

function CalculateRentForActiveSheet() {
    Main.CalculateRentForActiveSheet();
}

function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Rent Calculator')
        .addItem('Calculate current sheet', 'CalculateRentForActiveSheet')
        .addToUi();
}