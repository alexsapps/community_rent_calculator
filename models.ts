namespace Models {
    export class Month {
        constructor(
            public readonly year: number,
            public readonly month: number,
        ) { }

        static fromDate(date: Date): Month {
            return new Month(date.getFullYear(), date.getMonth() + 1);
        }

        nextMonth(): Month {
            if (this.month == 12) {
                return new Month(this.year + 1, 1);
            }
            return new Month(this.year, this.month + 1);
        }
        isBefore(other: Month): boolean {
            return this.year < other.year || (this.year === other.year && this.month < other.month);
        }
        isBeforeOrEqual(other: Month): boolean {
            return this.isBefore(other) || this.year === other.year && this.month === other.month;
        }
        containsDay(date: Date): boolean {
            return this.year === date.getFullYear() && this.month === date.getMonth() + 1;
        }
        toYyyyMmString(): string {
            return `${this.year}-${this.month.toString().padStart(2, '0')}`;
        }
    }

    /**
     * The entire input for a monthly rent calculation.
     */
    export class MonthRentInput {
        constructor(
            public readonly periods: PeriodInput[],
            public readonly config: RentConfiguration,
        ) { }
    }

    /**
     * Residency during a time period of the month; specifies occupants of rooms for
     * the time period. No move-ins, move-outs or room changes occur within the
     * period.
     */
    export class PeriodInput {
        constructor(
            /**
             * The first day of the period.
             */
            public readonly firstDay: Date,

            /**
             * The last day of the period. (Inclusive end of range.)
             */
            public readonly lastDay: Date,

            /**
             * A list of rooms, and who is in those rooms.
             */
            public readonly roomResidency: RoomResidency[],
        ) { }
    }

    /**
     * Residency of a room. (A list of residents splitting a room.)
     */
    export class RoomResidency {
        constructor(
            public readonly roomName: string,
            public readonly residents: RoomResident[],
        ) { }
    }

    /**
     * Residency of a single resident in the context of a room.
     */
    export class RoomResident {
        constructor(
            /**
             * Name of the resident.
             */
            public readonly residentName: string,

            /**
             * Ratio of the total cost of the room that they are responsible for.
             * For example, 0.5 for a resident splitting a room 50/50 with someone
             * else.
             */
            public readonly costRatio: number|null,
        ) { }
    }

    /**
     * Configuration of the rent calculation that applies for the whole month.
     */
    export class RentConfiguration {
        constructor(
            /** Total rent owed for the residence */
            public readonly totalRent: number,

            /** Configuration of rooms in the residence */
            public readonly rooms: RoomConfiguration[],

            /**
             * Surcharge on monthly base rent price for each additional roommate in
             * a room
             */
            public readonly extraPersonBaseSurcharge: number) { }
    }

    /**
     * A room in a residence and its monthly configuration.
     */
    export class RoomConfiguration {
        constructor(
            public readonly name: string,
            public readonly basePrice: number
        ) { }
    }

    /**
     * The entire output of rent calculation.
     */
    export class RentOutput {
        constructor(
            public readonly outputPeriods: PeriodOutput[],
            public readonly monthlyTotals: MonthTotals,
        ) { }
    }

    /**
     * The calculation of rent in the context of a particular period of the month.
     */
    export class PeriodOutput {
        constructor(
            public readonly firstDate: Date,
            public readonly lastDate: Date,
            
            // -- Internal calculations --

            public readonly calculatedDaysInPeriod: number,
            public readonly calculatedDaysInMonth: number,
            public readonly calculatedPeriodMonthRatio: number,
            public readonly calculatedPeriodCost: number,
            public readonly calculatedSubtotal: number,
            public readonly calculatedOverage: number,
            public readonly calculatedOveragePerPerson: number,

            // -- Data members --

            public readonly residentSubtotals: ResidentPeriodSubtotal[],
            public readonly residentAdjustedTotals: ResidentPeriodAdjustedTotal[],
        ) { }
    }

    /**
     * Subtotal of rent calculations for a resident in the context of a
     * particular period.
     */
    export class ResidentPeriodSubtotal {
        constructor(
            public readonly residentName: string,
            public readonly cost: number,

            // -- Calculations of above cost --

            public readonly roomBasePrice: number,
            public readonly roomBasePriceWithExtraPersonFees: number,
            public readonly residentRoomProportion: number|null,
            public readonly periodMonthProportion: number,
        ) { }
    }

    /**
     * Rent owed by a resident in the context of a particular period.
     */
     export class ResidentPeriodAdjustedTotal {
        constructor(
            public readonly residentName: string,
            public readonly cost: number,

            // -- Calculations of above cost --

            public readonly subtotal: number,
            public readonly adjustment: number,
        ) { }
    }

    /**
     * Rent owed by a resident in the context of a particular month.
     */
     export class ResidentMonthTotal {
        constructor(
            public readonly residentName: string,
            public readonly cost: number
        ) { }
    }

    /**
     * Month-end total rent calculations. These are the final calculations typically
     * shared with residents or entered into financial systems.
     */
    export class MonthTotals {
        constructor(
            /**
             * Rent owed by the residents for a full month perio
             */
            public readonly residentPeriodOutput: ResidentMonthTotal[],
        ) { };
    }
}