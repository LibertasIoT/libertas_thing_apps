// Copyright SmartonLabs Inc. 2019-2025

const enum SoilType {
    Loam,
    Clay,
    ClayLoam,
    SiltyClay,
    SandyLoam,
    LoamySand,
    Sand,
}

const enum PlantType {
    Lawn,
    FruitTrees,
    Flowers,
    Vegetables,
    Citrus,
    TreesBushes,
    Xeriscape,
}

const enum SprinklerHead {
    SurfaceDrip,
    Bubblers,
    PopupSpray,
    RotorsLowRate,
    RotorsHighRate,
}

declare class SprinklerZone {
    sprinklerZone: LibertasDevice;
    fieldCapacity: number;
    soilType: SoilType;
    plantType: PlantType;
    head: SprinklerHead;
}

export function LibertasSmartSprinkler(
    zones: SprinklerZone[]
) {
}

declare class SprinklerZone2 {
    sprinklerZone: LibertasDevice;
    fieldCapacity: number;
    soilType: SoilType;
    plantType: PlantType;
    head: SprinklerHead;
    moistureSensor?: LibertasDevice;
}

export function LibertasSmartSprinkler2(
    zones: SprinklerZone2[]
) {
}