function printEneryImported(attributes: LibertasAttributes, name: string, attrId: number) : string {
    const energyImport = attributes[attrId]
    if (energyImport !== undefined) {
        const energy = (energyImport as LibertasStruct)[
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
            const reportData = data as LibertasClusterReport[];
            let text = "Report received: "
            for (const clusterReport of reportData) {
                const cluster = clusterReport[0]
                const attributes = clusterReport[1]
                if (cluster === Matter.Clusters.ElectricalPowerMeasurement) {
                    const activePower = attributes[Matter.Attributes.ElectricalPowerMeasurement.ActivePower]
                    if (activePower !== undefined) {
                        text += "ActivePower=" + +(activePower as number) + "mW; "
                    }
                } else if (cluster === Matter.Clusters.ElectricalEnergyMeasurement) {
                    text += printEneryImported(attributes,
                        "CumulativeEnergyImported=",
                        Matter.Attributes.ElectricalEnergyMeasurement.CumulativeEnergyImported)
                    text += printEneryImported(attributes,
                        "PeriodicEnergyImported=",
                        Matter.Attributes.ElectricalEnergyMeasurement.PeriodicEnergyImported)
                    text += printEneryImported(attributes,
                        "CumulativeEnergyExported=",
                        Matter.Attributes.ElectricalEnergyMeasurement.CumulativeEnergyExported)
                    text += printEneryImported(attributes,
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