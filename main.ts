// This project uses namespaces instead of module imports due to a limitation of
// Clasp:
// https://github.com/google/clasp/blob/master/docs/typescript.md#the-namespace-statement-workaround
namespace Main {
    export function CalculateRentForActiveSheet() {
        OutputWriting.WriteOutput(
            RentCalculation.CalculateRent(
                InputReading.ReadInput(
                    SpreadsheetApp.getActiveSheet())));
    }
}

function CalculateRentForActiveSheet() {
    Main.CalculateRentForActiveSheet();
}