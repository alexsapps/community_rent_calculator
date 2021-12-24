namespace OutputWriting {
    type RentOutput = Models.RentOutput;
    type MonthTotals = Models.MonthTotals;
    type PeriodOutput = Models.PeriodOutput;

    type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
    type Range = GoogleAppsScript.Spreadsheet.Range;

    const DOLLAR_FORMAT = '$#,##0.00_)';
    const RATIO_FORMAT = '#,####0.0000_)';
    export const OUTPUT_MARKER = "OUTPUT >";

    export function WriteOutput(output: RentOutput, sheet: Sheet, columnIndex: number) {
        Logger.log("Writing output to sheet");
        Logger.log(output);

        clearAllCells(sheet, columnIndex);

        columnIndex = writeOutputMarkerColumn(sheet, columnIndex);
        columnIndex = writeMonthTotals(output.monthlyTotals, sheet, 1, columnIndex).columnIndex;
        columnIndex = writePeriods(output.outputPeriods, sheet, 1, columnIndex).columnIndex;
    }

    /**
     * Clears any cells in or right of the given column.
     */
    function clearAllCells(sheet: Sheet, columnIndex: number): void {
        const lastColumn = sheet.getLastColumn() - columnIndex + 1;

        // Ranges must be at least one column wide.
        if (lastColumn <= columnIndex) {
            return;
        }

        sheet
            .getRange(1, columnIndex, sheet.getLastRow(), lastColumn)
            .clear();
    }

    function writeOutputMarkerColumn(sheet: Sheet, columnIndex: number): number {
        sheet.getRange(1, columnIndex)
            .setValue(OutputWriting.OUTPUT_MARKER)
            .setFontWeight("bold");
        return columnIndex + 1;
    }

    function writeMonthTotals(monthlyTotals: MonthTotals, sheet: Sheet, rowIndex: number, columnIndex: number): { rowIndex: number, columnIndex: number } {
        Logger.log('Writing monthly totals');

        // -- Headers --

        sheet.getRange(rowIndex, columnIndex, 1, 1)
            .setValue('MONTHLY SUMMARY')
            .setFontWeight('bold');
        sheet.getRange(rowIndex, columnIndex, 1, 2).merge();
        rowIndex += 2;

        sheet.getRange(rowIndex, columnIndex, 1, 2)
            .setValues([['Resident', 'Month rent']])
            .setFontWeight('bold');
        rowIndex++;

        // -- Data --

        const numResidents = monthlyTotals.residentPeriodOutput.length;

        const outputValues = new Array<Array<unknown>>();
        for (const resident of monthlyTotals.residentPeriodOutput) {
            outputValues.push(new Array<unknown>(resident.residentName, resident.cost));
        }

        sheet.getRange(rowIndex, columnIndex, numResidents, 2)
            .setValues(outputValues);
        sheet.getRange(rowIndex, columnIndex + 1, numResidents, 1)
            .setNumberFormat(DOLLAR_FORMAT)

        rowIndex += numResidents;

        // -- Sum --

        sheet.getRange(rowIndex, columnIndex).setValue("Sum").setFontWeight("bold");
        sheet.getRange(rowIndex, columnIndex + 1)
            .setFormulaR1C1(`=SUM(R[${-1 - numResidents}]C:R[${-1}]C)`)
            .setNumberFormat(DOLLAR_FORMAT);
        rowIndex++;

        // -- Return --

        columnIndex += 3;
        return { rowIndex, columnIndex };
    }

    function writePeriods(periods: PeriodOutput[], sheet: Sheet, rowIndex: number, columnIndex: number): { rowIndex: number, columnIndex: number } {
        const NUM_COLUMNS = Math.max(SUBTOTALS_TABLE_WIDTH, ADJUSTED_TOTALS_TABLE_WIDTH) + 1 /* margin */;
        sheet.getRange(rowIndex, columnIndex, 1, 1)
            .setValue('PERIODIC BREAKDOWN')
            .setFontWeight('bold');
        sheet.getRange(rowIndex, columnIndex, 1, NUM_COLUMNS).merge();
        rowIndex += 2;

        for (const period of periods) {
            rowIndex = writePeriod(period, sheet, rowIndex, columnIndex);
            rowIndex++;  // Blank line between periods
        }

        columnIndex += NUM_COLUMNS;
        return { rowIndex, columnIndex };
    }

    function writePeriod(period: PeriodOutput, sheet: Sheet, rowIndex: number, columnIndex: number): number {
        sheet.getRange(rowIndex, columnIndex, 1, 1)
            .setValue(`Period ${period.firstDate.toLocaleDateString()} - ${period.lastDate.toLocaleDateString()}`)
            .setFontWeight('bold');
        rowIndex++;

        sheet.getRange(rowIndex, columnIndex, 1, 1).setValue('Month ratio');
        sheet.getRange(rowIndex, columnIndex + 1, 1, 1).setValue(period.calculatedPeriodMonthRatio).setNumberFormat(RATIO_FORMAT);
        rowIndex++;

        sheet.getRange(rowIndex, columnIndex, 1, 1).setValue('Cost');
        sheet.getRange(rowIndex, columnIndex + 1, 1, 1).setValue(period.calculatedPeriodCost).setNumberFormat(DOLLAR_FORMAT);
        rowIndex++;

        rowIndex = writePeriodSubtotalsTable(period, sheet, rowIndex, columnIndex);
        rowIndex = writePeriodAdjustedTable(period, sheet, rowIndex, columnIndex);
        return rowIndex;
    }

    const SUBTOTALS_TABLE_WIDTH = 6;
    function writePeriodSubtotalsTable(period: PeriodOutput, sheet: Sheet, rowIndex: number, columnIndex: number): number {
        sheet.getRange(rowIndex, columnIndex, 1, 1)
            .setValue('Subtotals:')
            .setFontStyle('italic');
        rowIndex++;

        const headers = [
            'Resident',
            'Base price',
            'Base + extra person fees',
            'Resident room proportion',
            'Period month proportion',
            'Price * proportion'];
        sheet.getRange(rowIndex, columnIndex, 1, SUBTOTALS_TABLE_WIDTH)
            .setValues([headers])
            .setFontStyle('italic');
        rowIndex++;

        const COST_COLUMN = columnIndex + SUBTOTALS_TABLE_WIDTH - 1;
        for (const resident of period.residentSubtotals) {
            sheet.getRange(rowIndex, columnIndex + 0, 1, 1).setValue(resident.residentName);
            sheet.getRange(rowIndex, columnIndex + 1, 1, 1).setValue(resident.roomBasePrice).setNumberFormat(DOLLAR_FORMAT);
            sheet.getRange(rowIndex, columnIndex + 2, 1, 1).setValue(resident.roomBasePriceWithExtraPersonFees).setNumberFormat(DOLLAR_FORMAT);
            sheet.getRange(rowIndex, columnIndex + 3, 1, 1).setValue(resident.residentRoomProportion).setNumberFormat(RATIO_FORMAT);
            sheet.getRange(rowIndex, columnIndex + 4, 1, 1).setValue(resident.periodMonthProportion).setNumberFormat(RATIO_FORMAT);
            sheet.getRange(rowIndex, COST_COLUMN, 1, 1).setValue(resident.cost).setNumberFormat(DOLLAR_FORMAT);
            
            rowIndex++;
        }

        sheet.getRange(rowIndex, columnIndex, 1, 1).setValue('sum').setFontStyle('italic');
        sheet.getRange(rowIndex, COST_COLUMN, 1, 1).setValue(period.calculatedSubtotal).setNumberFormat(DOLLAR_FORMAT);
        rowIndex++;
        sheet.getRange(rowIndex, columnIndex, 1, 1).setValue('adjustment needed').setFontStyle('italic');
        sheet.getRange(rowIndex, COST_COLUMN, 1, 1).setValue(0 - period.calculatedOverage).setNumberFormat(DOLLAR_FORMAT);
        rowIndex++;
        sheet.getRange(rowIndex, columnIndex, 1, 1).setValue('adjustment per person').setFontStyle('italic');
        sheet.getRange(rowIndex, COST_COLUMN, 1, 1).setValue(0 - period.calculatedOveragePerPerson).setNumberFormat(DOLLAR_FORMAT);
        rowIndex++;

        rowIndex++;  // Blank line after subtotals table
        return rowIndex;
    }

    const ADJUSTED_TOTALS_TABLE_WIDTH = 4;
    function writePeriodAdjustedTable(period: PeriodOutput, sheet: Sheet, rowIndex: number, columnIndex: number): number {
        sheet.getRange(rowIndex, columnIndex, 1, 1)
            .setValue('Adjusted:')
            .setFontStyle('italic');
        rowIndex++;

        const headers = [
            'Resident',
            'Subtotal',
            'Adjustment',
            'Period total'];
        sheet.getRange(rowIndex, columnIndex, 1, ADJUSTED_TOTALS_TABLE_WIDTH)
            .setValues([headers])
            .setFontStyle('italic');
        rowIndex++;

        for (const resident of period.residentAdjustedTotals) {
            sheet.getRange(rowIndex, columnIndex + 0, 1, 1).setValue(resident.residentName);
            sheet.getRange(rowIndex, columnIndex + 1, 1, 1).setValue(resident.subtotal).setNumberFormat(DOLLAR_FORMAT);
            sheet.getRange(rowIndex, columnIndex + 2, 1, 1).setValue(resident.adjustment).setNumberFormat(DOLLAR_FORMAT);
            sheet.getRange(rowIndex, columnIndex + 3, 1, 1).setValue(resident.cost).setNumberFormat(DOLLAR_FORMAT);
            
            rowIndex++;
        }

        rowIndex++;  // Blank line after adjusted table
        return rowIndex;
    }
}