function printEneryMeasurement(attributes: LibertasAttributes, name: string, attrId: number) : string {
    const measurementStruct = attributes[attrId]
    if (measurementStruct !== undefined) {
        const energy = (measurementStruct as LibertasStruct)[
            Matter.Fields.ElectricalEnergyMeasurement.EnergyMeasurementStruct.Energy
        ]
        if (energy !== undefined) {
            return name + +(energy as number) + "mWh; "
        }
    }
    return ""
}

function TrackPowerReports(device: LibertasDevice) {
    Libertas_SetOnDevice(device, (device, action, data, tag, ref) => {
        if (action === LibertasDeviceAction.ReportData) {
            let text = "Report received: "
            for (const clusterReport of data as LibertasClusterReport[]) {
                const [cluster, attributes] = clusterReport
                if (cluster === Matter.Clusters.ElectricalPowerMeasurement) {
                    const activePower = attributes[Matter.Attributes.ElectricalPowerMeasurement.ActivePower]
                    if (activePower !== undefined) {
                        text += "ActivePower=" + +(activePower as number) + "mW; "
                    }
                } else if (cluster === Matter.Clusters.ElectricalEnergyMeasurement) {
                    text += printEneryMeasurement(attributes,
                        "CumulativeEnergyImported=",
                        Matter.Attributes.ElectricalEnergyMeasurement.CumulativeEnergyImported)
                    text += printEneryMeasurement(attributes,
                        "PeriodicEnergyImported=",
                        Matter.Attributes.ElectricalEnergyMeasurement.PeriodicEnergyImported)
                    text += printEneryMeasurement(attributes,
                        "CumulativeEnergyExported=",
                        Matter.Attributes.ElectricalEnergyMeasurement.CumulativeEnergyExported)
                    text += printEneryMeasurement(attributes,
                        "PeriodicEnergyExported=",
                        Matter.Attributes.ElectricalEnergyMeasurement.PeriodicEnergyExported)
                }
                Libertas_Log(LibertasLogLevel.DEBUG, text)
            }
        }
    });
    const clusters : LibertasClusterSubscribeReq[] = []
    const clusterAccess = Libertas_DeviceGetClusterAccess(device)
    if (clusterAccess[Matter.Clusters.ElectricalPowerMeasurement] !== undefined) {
        clusters.push(
            [
                Matter.Clusters.ElectricalPowerMeasurement, 
                1, 
                300,
                [
                    Matter.Attributes.ElectricalPowerMeasurement.ActivePower
                ]
            ]
        )
    }
    if (clusterAccess[Matter.Clusters.ElectricalEnergyMeasurement] !== undefined) {
        clusters.push(
            [
                Matter.Clusters.ElectricalEnergyMeasurement, 
                1, 
                300,
                [
                    Matter.Attributes.ElectricalEnergyMeasurement.CumulativeEnergyImported,
                    Matter.Attributes.ElectricalEnergyMeasurement.PeriodicEnergyImported,
                    Matter.Attributes.ElectricalEnergyMeasurement.CumulativeEnergyExported,
                    Matter.Attributes.ElectricalEnergyMeasurement.PeriodicEnergyExported
                ]
            ]
        )
    }
    if (clusters.length > 0) {
        Libertas_AppSubscribeReq(
            [
                [device, clusters]  // Only one device
            ]);
        Libertas_WaitReactive();        
    }
}
export {TrackPowerReports}