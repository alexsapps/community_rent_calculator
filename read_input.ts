namespace InputReading {
    type PeriodInput = Models.PeriodInput;
    const PeriodInput = Models.PeriodInput;
    const RentConfiguration = Models.RentConfiguration;
    type RentInput = Models.RentInput;
    const RentInput = Models.RentInput;
    type RoomInput = Models.RoomInput;
    const RoomInput = Models.RoomInput;
    type RoomResidency = Models.RoomResidency;
    const RoomResidency = Models.RoomResidency;
    type RoomResident = Models.RoomResident;
    const RoomResident = Models.RoomResident;

    type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
    type Range = GoogleAppsScript.Spreadsheet.Range;

    const FIRST_PERIOD_COLUMN_INDEX = 3;  // Column "C"
    const FIRST_ROOM_ROW_INDEX = 2;  // Row 2

    export function ReadInput(sheet: Sheet): RentInput {
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
        return new RentInput(periods, config);
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

    function readPeriodDatesFromRowHeaders(range: Range) {
        const periodDates = new Array<Date>();
        let columnIndex = FIRST_PERIOD_COLUMN_INDEX;
        while (true) {
            const periodHeader = range.getCell(1, columnIndex);
            const header = periodHeader.getValue();
            if (header instanceof Date) {
                periodDates.push(header);
                Logger.log(`Read period starting ${header.toLocaleDateString()}`);
            } else {
                if (header != "OUTPUT") {
                    throw `Non-date value found in column header; should be start of period: ${header}`
                }
                break;
            }
            columnIndex++;
        };
        return periodDates;
    }

    function readRoomMetadataFromFirstColumns(range: Range): [RoomInput[], number] {
        let rowIndex = FIRST_ROOM_ROW_INDEX;
        const rooms = new Array<RoomInput>();
        while (true) {
            const room = readRoomNameAndBasePrice(range, rowIndex);
            if (room == null) break;
            rooms.push(room)
            rowIndex++;
        }
        return [rooms, rowIndex];
    }

    function readRoomNameAndBasePrice(range: Range, rowIndex: number): RoomInput | null {
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
        return new RoomInput(rowHeader, basePrice);
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

    function readPeriods(range: Range, rooms: RoomInput[], periodDates: Date[]): PeriodInput[] {
        const periods = new Array<PeriodInput>(periodDates.length);
        for (let i = 0; i < periodDates.length; i++) {
            const firstDay = periodDates[i];
            const lastDay = i < periodDates.length - 1 ? periodDates[i + 1] : lastDayOfMonth(firstDay);
            Logger.log(`Reading period ${firstDay.toLocaleDateString()} thru ${lastDay.toLocaleDateString()}`);
            periods[i] = new PeriodInput(
                firstDay,
                lastDay,
                readPeriodResidency(range, i + FIRST_PERIOD_COLUMN_INDEX, rooms));
        }
        return periods;
    }

    function readPeriodResidency(range: Range, columnIndex: number, rooms: RoomInput[]): RoomResidency[] {
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
        for (let residentString of residentStrings) {
            residentString = residentString.trim();
            const captures: string[] = ROOM_RESIDENCY_REGEX.exec(residentString);
            if (captures == null) {
                throw `Room residency value does not match regex; value "${residentString}", column ${columnIndex}, row ${rowIndex}`;
            }
            const name: string = captures[1].trim();
            const costRatioStr: string = captures[2] !== undefined ? captures[2].trim() : '1';
            const costRatio = Number(costRatioStr);
            if (costRatio === NaN) {
                throw `Invalid cost ratio "${costRatio}"; must be 0.#, column ${columnIndex}, row ${rowIndex}`;
            }
            Logger.log(`${name} pays ${costRatio} of ${roomName}`);
            residents.push(new RoomResident(name, costRatio));

            roomCostRatioSum += costRatio;
        }

        if (roomCostRatioSum !== 1) {
            Logger.log(`Warning: cost ratio for room ${roomName} does not sum to 1; sums to ${roomCostRatioSum}`);
        }

        return residents;
    }

    function lastDayOfMonth(date: Date) {
        // Day 0 means last day of prior month. Pass month + 1 to get last day of
        // current month.
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }
}