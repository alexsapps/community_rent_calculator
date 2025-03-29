namespace BillSplitting {
    type Month = Models.Month;
    const Month = Models.Month;
    type MonthRentInput = Models.MonthRentInput;
    const MonthRentInput = Models.MonthRentInput;

    export function SetUpSheet() {
        const sheet = SpreadsheetApp.getActiveSheet();
        sheet.clear();

        const headers = [
            "Type/Name",
            "Amount",
            "First day",
            "Last day",
        ];

        sheet.appendRow(headers);
    }

    class BillsInput {
        constructor(
            public readonly bills: BillInput[],
            public readonly rentInput: MonthWithRentInput[]
        ) { }
    }

    class BillInput {
        constructor(
            public readonly name: string,
            public readonly amount: number,
            public readonly firstDay: Date,
            public readonly lastDay: Date,
        ) { }
    }

    class MonthWithRentInput {
        constructor(
            public readonly month: Month,
            public readonly rentInput: MonthRentInput,
        ) { }
    }

    function numDays(firstDay: Date, lastDay: Date) {
        return Math.ceil((lastDay.getTime() - firstDay.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    class BillsCalculations {
        constructor(
            public readonly calculations: BillCalculation[],
        ) { }
    }

    class BillCalculation {
        constructor(
            public readonly name: string,
            public readonly firstDay: Date,
            public readonly lastDay: Date,
            public readonly amount: number,
            public readonly periodRoommateAmounts: PeriodCalculation[],
            public readonly roommateTotals: RoommateTotal[],
        ) { }

        public numDays(): number {
            return numDays(this.firstDay, this.lastDay);
        }
        public dailyAmount(): number {
            return this.amount / this.numDays();
        }
    }

    class PeriodCalculation {
        constructor(
            public readonly firstDay: Date,
            public readonly lastDay: Date,
            // Total amount of the bill attributed to this period
            public readonly amount: number,
            // Roommates who share the bill during this period
            public readonly roommates: string[],
        ) { }

        public numDays(): number {
            return numDays(this.firstDay, this.lastDay);
        }

        // Amount per day for this period of the bill
        public dailyAmount(): number {
            return this.amount / this.numDays();
        }

        // Amount per day per person for this period of the bill
        public dailyAmountPerPerson(): number {
            return this.dailyAmount() / this.roommates.length;
        }

        // Amount per person for this period of the bill
        public amountPerPerson(): number {
            return this.amount / this.roommates.length;
        }
    }

    class RoommateTotal {
        constructor(
            public readonly roommate: string,
            public readonly total: number,
            // Cost from each period. The sum of these should be the total.
            public readonly periodComponents: number[]
        ) { }
    }

    export function CalculateBills() {
        const spreadsheet = SpreadsheetApp.getActive();
        checkTimezone(spreadsheet);

        const sheet = SpreadsheetApp.getActiveSheet();
        const bills = readBills(sheet, spreadsheet);
        const calculations = calculateBills(bills);
        writeBillsCalculations(calculations, sheet);
    }

    /**
     * Makes sure the Google Apps Script environment's timezone matches the
     * timezone of the given spreadsheet. Without this, dates read from the
     * sheet may not align properly with auto-generated dates
     * such as auto-calculated ("last day of the month").
     *
     * Fixing this in code may be possible, but Javascript `Date` implementation
     * is known to be problematic, so a proper fix would involve importing
     * another date library.
     */
    function checkTimezone(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet) {
        const scriptProperties = PropertiesService.getScriptProperties();
        const scriptTimeZone = scriptProperties.getProperty("timezone") || Session.getScriptTimeZone();
        const spreadsheetTimeZone = spreadsheet.getSpreadsheetTimeZone();

        if (scriptTimeZone !== spreadsheetTimeZone) {
            throw new Error(`Timezone mismatch: Script timezone is ${scriptTimeZone}, but spreadsheet timezone is ${spreadsheetTimeZone}`);
        }
    }

    function readBills(sheet: GoogleAppsScript.Spreadsheet.Sheet, spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): BillsInput {
        const bills = readBillsSheet(sheet);
        const input = readRentSheets(bills, spreadsheet);
        return new BillsInput(bills, input);

    }

    function readBillsSheet(sheet: GoogleAppsScript.Spreadsheet.Sheet): BillInput[] {
        const data = sheet.getRange(1, 1, sheet.getLastRow(), 4).getValues();

        const bills: BillInput[] = [];
        // 0 is the header row. Start at 1.
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const name = row[0];
            const amount = row[1];
            const firstDay = new Date(row[2]);
            const lastDay = new Date(row[3]);

            if (!name || !amount || !firstDay || !lastDay) {
                if (name || amount) {
                    throw new Error('Missing name amount, first day or last day on row ' + (i + 1));
                } else {
                    break;
                }
            }

            bills.push(new BillInput(name, amount, firstDay, lastDay));
        }

        return bills;
    }

    function readRentSheets(bills: BillInput[], spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): MonthWithRentInput[] {
        function firstMonthOfBills(bills: BillInput[]): Month {
            return Month.fromDate(bills.map(u => u.firstDay).reduce((a, b) => a < b ? a : b));
        }
        function lastMonthOfBills(bills: BillInput[]): Month {
            return Month.fromDate(bills.map(u => u.lastDay).reduce((a, b) => a > b ? a : b));
        }

        const firstMonth = firstMonthOfBills(bills);
        const lastMonth = lastMonthOfBills(bills);
        const rentInputs: MonthWithRentInput[] = [];

        if (lastMonth.isBefore(firstMonth)) {
            throw new Error("Last month is before first month");
        }
        for (let month = firstMonth; month.isBeforeOrEqual(lastMonth); month = month.nextMonth()) {
            const sheetName = `${month.toYyyyMmString()}-01`;
            const sheet = spreadsheet.getSheetByName(sheetName);
            if (!sheet) {
                throw new Error(`Could not find rent sheet with name ${sheetName}`);
            }
            const rentInput = InputReading.ReadInput(sheet).input;
            rentInputs.push(new MonthWithRentInput(month, rentInput));
        }

        return rentInputs;
    }

    function calculateBills(input: BillsInput): BillsCalculations {
        return new BillsCalculations(input.bills.map(bill => calculateBill(bill, input.rentInput)));
    }

    function calculateBill(bill: BillInput, rentInput: MonthWithRentInput[]) {
        const periods: PeriodCalculation[] = calculatePeriods(bill, rentInput);
        const roommateAmounts = calculateRoommateTotals(periods);
        const calculation = new BillCalculation(
            bill.name,
            bill.firstDay,
            bill.lastDay,
            bill.amount,
            periods,
            roommateAmounts
        );
        return calculation;
    }

    function calculatePeriods(bill: BillInput, rentInputs: MonthWithRentInput[]): PeriodCalculation[] {
        const dailyRate = bill.amount / numDays(bill.firstDay, bill.lastDay);
        const periods: PeriodCalculation[] = [];
        const firstMonth = Month.fromDate(bill.firstDay);
        const lastMonth = Month.fromDate(bill.lastDay);
        for (let month = firstMonth; month.isBeforeOrEqual(lastMonth); month = month.nextMonth()) {
            const rentInput = rentInputs.find(r => r.month.year === month.year && r.month.month === month.month);
            if (!rentInput) {
                throw new Error(`No rent input for month ${month.year}-${month.month}`);
            }

            for (const period of rentInput.rentInput.periods) {
                if (period.lastDay < bill.firstDay) continue;
                if (period.firstDay > bill.lastDay) break;

                const firstDay = new Date(Math.max(bill.firstDay.getTime(), period.firstDay.getTime()));
                const lastDay = new Date(Math.min(bill.lastDay.getTime(), period.lastDay.getTime()));
                const amount = dailyRate * numDays(firstDay, lastDay);
                const roommates = period.roomResidency.flatMap(r => r.residents.map(resident => resident.residentName));
                periods.push(new PeriodCalculation(firstDay, lastDay, amount, roommates));
            }
        }
        return periods;
    }

    function calculateRoommateTotals(periods: PeriodCalculation[]): RoommateTotal[] {
        type MutableRoommateTotal = {
            total: number,
            parts: number[],
        }
        const roommateTotals: { [roommate: string]: MutableRoommateTotal } = {};
        for (const period of periods) {
            const amountPerPerson = period.amountPerPerson();

            for (const roommate of period.roommates) {
                const roommateTotal = roommateTotals[roommate];

                if (roommateTotal !== undefined) {
                    roommateTotal.total += amountPerPerson;
                    roommateTotal.parts.push(amountPerPerson);
                } else {
                    roommateTotals[roommate] = { total: amountPerPerson, parts: [amountPerPerson] };
                }
            }
        }

        return Object.entries(roommateTotals).map(
            ([roommate, total]) => new RoommateTotal(roommate, total.total, total.parts));
    }

    function writeBillsCalculations(calculations: BillsCalculations, sheet: GoogleAppsScript.Spreadsheet.Sheet) {
        const startRow = 1;
        const resultsLabelColumn = 5;
        const startColumn = resultsLabelColumn + 1;
        let currentRow = startRow;

        // Clear old results
        if (sheet.getLastColumn() >= resultsLabelColumn) {
            sheet.getRange(startRow, resultsLabelColumn, sheet.getMaxRows(), sheet.getLastColumn() - resultsLabelColumn + 1).clear();
        }
        // Indicate that results appear on the right of input data.
        sheet.getRange(currentRow, resultsLabelColumn).setValue("RESULTS >");

        for (const calculation of calculations.calculations) {
            sheet.getRange(currentRow++, startColumn).setValue("Bill: " + calculation.name);
            sheet.getRange(currentRow++, startColumn).setValue("Num days: " + calculation.numDays());
            sheet.getRange(currentRow++, startColumn).setValue("Daily amount: " + calculation.dailyAmount());
            sheet.getRange(currentRow++, startColumn).setValue("Periods:");

            for (const period of calculation.periodRoommateAmounts) {
                sheet.getRange(currentRow, startColumn + 0).setValue(`Period: ${period.firstDay.toDateString()} - ${period.lastDay.toDateString()}`);
                sheet.getRange(currentRow, startColumn + 1).setValue(`Days: ${period.numDays()}`);
                sheet.getRange(currentRow, startColumn + 2).setValue(`Amount: ${period.amount}`);
                sheet.getRange(currentRow, startColumn + 3).setValue(`Amount per person: ${period.amountPerPerson()}`);
                sheet.getRange(currentRow, startColumn + 4).setValue(`Roomates: ${period.roommates.join(", ")}`);
                currentRow++;
            }

            sheet.getRange(currentRow, startColumn).setValue("Roommate Totals:");
            currentRow++;
            for (const roommateTotal of calculation.roommateTotals) {
                sheet.getRange(currentRow, startColumn + 0).setValue(roommateTotal.roommate);
                sheet.getRange(currentRow, startColumn + 1).setValue(roommateTotal.total);
                sheet.getRange(currentRow, startColumn + 2).setValue(`(${roommateTotal.periodComponents.join(',')})`);
                currentRow++;
            }

            currentRow += 2; // Add two blank lines between bills
        }
    }
}
