namespace InputReading {
    type PeriodInput = Models.PeriodInput;
    const PeriodInput = Models.PeriodInput;
    const RentConfiguration = Models.RentConfiguration;
    type RentInput = Models.RentInput;
    const RentInput = Models.RentInput;
    type RoomConfiguration = Models.RoomConfiguration;
    const RoomConfiguration = Models.RoomConfiguration;
    type RoomResidency = Models.RoomResidency;
    const RoomResidency = Models.RoomResidency;
    type RoomResident = Models.RoomResident;
    const RoomResident = Models.RoomResident;

    type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
    type Range = GoogleAppsScript.Spreadsheet.Range;

    const FIRST_PERIOD_COLUMN_INDEX = 3;  // Column "C"
    const FIRST_ROOM_ROW_INDEX = 2;  // Row 2

    /**
     * Reads rent calculator input from a Google Sheet.
     * 
     * Reading starts from cell A1. Column A contains rooms, colum B contains
     * monthly base prices for those rooms, and subsequent columns contain names
     * of residents in those rooms for certain parts of the month called
     * 'periods'.
     * 
     * The first row is headers only. Each column C and later represents a
     * period. The period columns must be in chronological order. The header
     * value of each period is a date representing the first day of the period.
     * The last day of the period is the day before the first day of the
     * following period, except the last day of the last period is always the
     * last day of the month. (You can add a blank dummy period at the end to
     * omit the end of a month from calculations.)
     * 
     * The interior of the table contains names of residents separated by
     * semicolons. The ratio of each resident's responsibility can be added
     * after their name in parentheses. For example, "Alice (0.6); Bob (0.4)"
     * means that a room is shared by Alice and Bob with Alice paying 60% of the
     * room and Bob paying 40% for that period. If explicit ratios add up to 1
     * or less, then the remaining ratio is split evenly by the remaining
     * residents. If the explicit ratios total more than one, then the remaining
     * residents are assigned a ratio of 0. (The the extra amount will cause
     * residents in other rooms to pay less as part of the rent calculation
     * adjustment/discount mechanism.)
     * 
     * @param sheet The sheet to read rent input from.
     * @returns two values, (1) rent input read from the sheet in the form of
     * the `RentInput` object model, and (2) the column index of the first
     * column after the end of the input. (This may be useful for writing the
     * output, for example.)
     */
    export function ReadInput(sheet: Sheet): {input: RentInput, columnIndex: number} {
        Logger.log("Reading rent calculation from sheet");
        // Read entire sheet since it is probably small.
        const range = sheet.getRange(
            1,
            1,
            sheet.getLastRow(),
            sheet.getLastColumn());

        // ==================================
        // Read column readers
        // ==================================

        verifyHeaders(range);

        const periodDates: Date[] = readPeriodDatesFromRowHeaders(range);

        // ==================================
        // Read columns A & B
        // ==================================

        let [rooms, rowIndex] = readRoomMetadataFromFirstColumns(range);

        verifySumRowHeader(range, rowIndex++);
        const extraPersonBaseSurcharge = readExtraPersonBaseSurcharge(range, rowIndex++);
        const totalRent = readRentDue(range, rowIndex++);

        // ==================================
        // Read interior of sheet
        // ==================================

        const periods: PeriodInput[] = readPeriods(range, rooms, periodDates);

        // ==================================
        // Assemble return value
        // ==================================

        const config = new RentConfiguration(totalRent, rooms, extraPersonBaseSurcharge);

        return {
            input: new RentInput(periods, config),
            columnIndex: FIRST_PERIOD_COLUMN_INDEX + periodDates.length,
        };
    }

    function verifyHeaders(range: Range) {
        const headerA = range.getCell(1, 1);
        if (headerA.getValue() !== "Rooms") {
            throw 'A1 must be "Rooms"';
        }

        const headerB = range.getCell(1, 2);
        if (headerB.getValue() !== "Base prices") {
            throw 'B1 must be "Base prices"';
        }
    }

    function readPeriodDatesFromRowHeaders(range: Range): Date[] {
        const periodDates = new Array<Date>();
        let columnIndex = FIRST_PERIOD_COLUMN_INDEX;
        while (columnIndex <= range.getLastColumn()) {
            const periodHeader = range.getCell(1, columnIndex);
            const header = periodHeader.getValue();
            if (header instanceof Date) {
                periodDates.push(header);
                Logger.log(`Read period starting ${header.toLocaleDateString()}`);
            } else {
                if (header !== OutputWriting.OUTPUT_MARKER) {
                    throw `Non-date value found in column ${columnIndex} header; should be start of period: ${header}`
                }
                break;
            }
            columnIndex++;
        };
        return periodDates;
    }

    function readRoomMetadataFromFirstColumns(range: Range): [RoomConfiguration[], number] {
        let rowIndex = FIRST_ROOM_ROW_INDEX;
        const rooms = new Array<RoomConfiguration>();
        while (true) {
            if (rowIndex > range.getLastRow()) {
                throw `Missing configuration that should appear at the bottom of the room/period matrix`;
            }
            const room = readRoomNameAndBasePrice(range, rowIndex);
            if (room == null) break;
            rooms.push(room)
            rowIndex++;
        }
        return [rooms, rowIndex];
    }

    function readRoomNameAndBasePrice(range: Range, rowIndex: number): RoomConfiguration | null {
        const rowHeaderCell = range.getCell(rowIndex, 1);
        if (rowHeaderCell.getTextStyle().isBold()) return null;

        const rowHeader = rowHeaderCell.getValue();
        if (typeof (rowHeader) !== 'string') {
            throw 'Non-string value found in row header; should be room name: ' + rowHeader;
        }

        const basePrice = range.getCell(rowIndex, 2).getValue();
        if (typeof (basePrice) !== 'number') {
            throw 'Non-number value found in Base Prices column: ' + basePrice;
        }

        Logger.log("Read room config; name: " + rowHeader + "; base price: " + basePrice);
        return new RoomConfiguration(rowHeader, basePrice);
    }


    function verifySumRowHeader(range: Range, rowIndex: number) {
        const sumHeader = range.getCell(rowIndex, 1);
        if (sumHeader.getValue() !== 'Sum (bases)') {
            throw 'First cell of row ' + rowIndex + 'should be "Sum (bases)"';
        }
    }

    function readExtraPersonBaseSurcharge(range: Range, rowIndex: number): number {
        const extraPersonFeeHeader = range.getCell(rowIndex, 1);
        if (extraPersonFeeHeader.getValue() !== 'Extra person fee') {
            throw 'First cell of row ' + rowIndex + 'should be "Extra person fee"';
        }
        const extraPersonBaseSurcharge = range.getCell(rowIndex, 2).getValue();
        if (typeof extraPersonBaseSurcharge !== 'number') {
            throw 'Extra person fee must be a number; found ' + extraPersonBaseSurcharge + ' (' + typeof (extraPersonBaseSurcharge) + ')';
        }
        Logger.log('Read room surcharge: ' + extraPersonBaseSurcharge);
        return extraPersonBaseSurcharge;
    }

    function readRentDue(range: Range, rowIndex: number): number {
        const rentDueHeader = range.getCell(rowIndex, 1);
        if (rentDueHeader.getValue() !== 'Rent due') {
            throw 'First cell of row ' + rowIndex + 'should be "Rent due"';
        }
        const totalRent = range.getCell(rowIndex, 2).getValue();
        if (typeof totalRent !== 'number') {
            throw 'Rent due must be a number; found ' + totalRent + ' (' + typeof (totalRent) + ')';
        }
        Logger.log('Read total rent due: ' + totalRent);
        return totalRent;
    }

    function readPeriods(range: Range, rooms: RoomConfiguration[], periodDates: Date[]): PeriodInput[] {
        const periods = new Array<PeriodInput>(periodDates.length);
        for (let i = 0; i < periodDates.length; i++) {
            const firstDay = periodDates[i];
            const lastDay = i < periodDates.length - 1 ? dayBefore(periodDates[i + 1]) : lastDayOfMonth(firstDay);
            Logger.log(`Reading period ${firstDay.toLocaleDateString()} thru ${lastDay.toLocaleDateString()}`);
            periods[i] = new PeriodInput(
                firstDay,
                lastDay,
                readPeriodResidency(range, i + FIRST_PERIOD_COLUMN_INDEX, rooms));
        }
        return periods;
    }

    function readPeriodResidency(range: Range, columnIndex: number, rooms: RoomConfiguration[]): RoomResidency[] {
        const residencies = new Array<RoomResidency>(rooms.length);
        for (let i = 0; i < rooms.length; i++) {
            const room = rooms[i];
            const rowIndex = i + FIRST_ROOM_ROW_INDEX;
            const residentsString = range.getCell(rowIndex, columnIndex).getValue();
            const residents: RoomResident[] = parseRoomResidencyString(
                residentsString, columnIndex, rowIndex, room.name);
            residencies[i] = new RoomResidency(room.name, residents);
        }
        return residencies;
    }

    // Matches a name (alpha-numeric characters, space and dash), optionally
    // followed by a space and a ratio in parentheses. E.g.
    // "Alex Taylor (0.5)" to mean "Alex Taylor" pays for half the room.
    const ROOM_RESIDENCY_REGEX = /^([a-zA-Z0-9 -]+)(?:\ \((0.\d+)\))?$/;

    function parseRoomResidencyString(residentsString: string, columnIndex: number, rowIndex: number, roomName: string) {
        const residents = new Array<RoomResident>();

        if (residentsString == null) {
            return residents;
        }

        if (typeof residentsString !== 'string') {
            throw `non-string found in interior of table; column ${columnIndex}, row ${rowIndex}, value ${residentsString}, type ${typeof residentsString}`;
        }

        if (residentsString === '') {
            return residents;
        }

        const residentStrings: string[] = residentsString.split(';');
        let roomCostRatioSum = 0;

        // Indices of residents not having a cost ratio specified.
        const defaultRatioResidents: number[] = [];

        for (let residentString of residentStrings) {
            residentString = residentString.trim();
            const captures: string[] = ROOM_RESIDENCY_REGEX.exec(residentString);
            if (captures == null) {
                throw `Room residency value does not match regex; value "${residentString}", column ${columnIndex}, row ${rowIndex}`;
            }
            const name: string = captures[1].trim();
            const costRatioStr: string = captures[2] !== undefined ? captures[2].trim() : '';
            const costRatio: number|null = costRatioStr !== '' ? Number(costRatioStr) : null;
            if (costRatio === NaN) {
                throw `Invalid cost ratio "${costRatio}"; must be 0.#, column ${columnIndex}, row ${rowIndex}`;
            }
            Logger.log(`${name} pays ${costRatio === null ? '<default>' : costRatio} of ${roomName}`);
            residents.push(new RoomResident(name, costRatio));

            roomCostRatioSum += costRatio;
            if (costRatio === null) {
                defaultRatioResidents.push(residents.length - 1);
            }
        }

        if (defaultRatioResidents.length === 0) {
            if (roomCostRatioSum !== 1) {
                Logger.log(`Warning: cost ratio for room ${roomName} does not sum to 1; sums to ${roomCostRatioSum}`);
            }
        } else {
            const missingCost = roomCostRatioSum > 1 ? 0 : 1 - roomCostRatioSum;
            const missingCostPerPerson = missingCost / defaultRatioResidents.length;
            defaultRatioResidents.forEach(i => {
                residents[i] = new RoomResident(residents[i].residentName, missingCostPerPerson);
                Logger.log(`Applied calculated default ratio of ${missingCostPerPerson} to ${residents[i].residentName}`);
            });
        }

        return residents;
    }

    function lastDayOfMonth(date: Date): Date {
        // Day 0 means last day of prior month. Pass month + 1 to get last day of
        // current month.
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    function dayBefore(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    }
}