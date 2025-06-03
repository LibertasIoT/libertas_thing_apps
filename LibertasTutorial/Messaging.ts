// App send messages to end-user's smartphone.
// Copyright 2025 Smartonlabs Inc.

/**
 * End users can add user or group into the recipients array.
 */
export function TestMessage(recipients: LibertasUser[]) {
    const now = os.date("%Y-%m-%d %H:%M:%S") as string;
    Libertas_MessageText(
        LibertasMessageLevel.INFO,
        undefined,
        recipients,
        "TEST_MESSAGE",
        now);

    const temp: LibertasMessageVariableUnit = {
        type: "unit",
        unit: 'Cel',  // Temperature in Celsius
        value: 23
    }
    Libertas_MessageText(
        LibertasMessageLevel.INFO,
        undefined,
        recipients,
        "TEMP_DISPLAY",
        temp);
}
