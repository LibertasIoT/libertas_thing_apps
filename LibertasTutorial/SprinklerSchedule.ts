// Data structure (and UI) used in sprinkler scheduler.
enum DayOfWeek {Sun, Mon, Tue, Wed, Thu, Fri, Sat }

declare class ZoneAction {
    zone: LibertasDevice;
    duration: number;
}

declare class ScheduleAction {
    startTime: LibertasTimeOnly;
    zoneActions: ZoneAction[];
}

declare class Schedule {
    daysOfWeek: DayOfWeek[];
    actions: ScheduleAction[];
}

export function SprinklerSchedule(
    scheduleTable: Schedule[]) {
    // Main process starts here
}
