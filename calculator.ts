type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

function CalculateRent() {
    const input: RentInput = readInput(SpreadsheetApp.getActiveSheet());
    const output: RentOutput = (new RentCalculator()).Calculate(input);
    writeOutput(output);
}
  
function readInput(sheet: Sheet): RentInput {
    return new RentInput();
}

function writeOutput(output: RentOutput) {

}

class RentInput {

}

class RentOutput {

}

class RentCalculator {
    Calculate(input: RentInput): RentOutput {
        return new RentOutput();
    }
}