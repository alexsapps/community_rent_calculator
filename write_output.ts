namespace OutputWriting {
    type RentOutput = Models.RentOutput;

    export function WriteOutput(output: RentOutput) {
        Logger.log("Writing output");
        Logger.log(output);
    }
} 