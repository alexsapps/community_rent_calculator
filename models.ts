/**
 * The entire input for a monthly rent calculation.
 */
export class RentInput {
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
        public readonly costRatio: number,
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
        public readonly rooms: RoomInput[],

        /**
         * Surcharge on monthly base rent price for each additional roommate in
         * a room
         */
        public readonly extraPersonBaseSurcharge: number) { }
}

/**
 * A room in a residence and its monthly configuration.
 */
export class RoomInput {
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
        public readonly residentPeriodOutput: ResidentPeriodRent[],
    ) { }
}

/**
 * Rent owed by a resident in the context of a period.
 */
export class ResidentPeriodRent {
    constructor(
        public readonly residentName: string,
        public readonly cost: number,
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
        public readonly residentPeriodOutput: ResidentPeriodRent[],
    ) { };
}
