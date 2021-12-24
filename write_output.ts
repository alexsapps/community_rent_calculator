namespace OutputWriting {
    type RentOutput = Models.RentOutput;
    type MonthTotals = Models.MonthTotals;

    type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
    type Range = GoogleAppsScript.Spreadsheet.Range;

    const DOLLAR_FORMAT = "$#,##0.00_)";
    export const OUTPUT_MARKER = "OUTPUT >";

    export function WriteOutput(output: RentOutput, sheet: Sheet, columnIndex: number) {
        Logger.log("Writing output to sheet");
        Logger.log(output);

        // Clear any cells on the right of the input
        if (sheet.getLastColumn() - columnIndex + 1 > columnIndex) {
            sheet
                .getRange(1, columnIndex, sheet.getLastRow(), sheet.getLastColumn() - columnIndex + 1)
                .clear();
        }

        let rowIndex = 1;

        sheet.getRange(rowIndex, columnIndex).setValue(OutputWriting.OUTPUT_MARKER);
        columnIndex++;
        
        rowIndex = writeMonthTotals(output.monthlyTotals, sheet, rowIndex, columnIndex);
    }

    function writeMonthTotals(monthlyTotals: MonthTotals, sheet: Sheet, rowIndex: number, columnIndex: number): number {
        Logger.log("Writing monthly totals");

        const numResidents = monthlyTotals.residentPeriodOutput.length;

        const outputHeight = 1 + numResidents;
        const outputWidth = 2;
        const outputValues = new Array<Array<unknown>>();
        
        outputValues.push(new Array<string>("Resident", "Month rent"));
        for (const resident of monthlyTotals.residentPeriodOutput) {
             outputValues.push(new Array<unknown>(resident.residentName, resident.cost));
        }

        const headerAndDataRange = sheet.getRange(rowIndex, columnIndex, outputHeight, outputWidth);
        headerAndDataRange.setValues(outputValues);

        sheet.getRange(rowIndex, columnIndex + 1, outputHeight, 1).setNumberFormat(DOLLAR_FORMAT)

        const monthlyTotalsDataRow = rowIndex + 1;

        rowIndex += headerAndDataRange.getHeight();

        const sumRange = sheet.getRange(rowIndex, columnIndex + 1);
        sumRange.setFormulaR1C1(`=SUM(R[${monthlyTotalsDataRow}]C[${columnIndex + 1}]:R[${monthlyTotalsDataRow + numResidents}]C[${columnIndex + 1}])`);
        sumRange.setNumberFormat(DOLLAR_FORMAT);

        return rowIndex;
    }
}