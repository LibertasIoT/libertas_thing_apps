// Demonstrates attribute subscribe from a relay or dimmer.
function DemoLightSubscribe(device: LibertasDevice) {
    Libertas_SetOnDevice(device, (device, action, data, tag, ref) => {
        if (action === LibertasDeviceAction.ReportData || 
                action === LibertasDeviceAction.ReadResponse) {
            const reportData = data as LibertasClusterReport[];
            for (const clusterReport of reportData) {
                Libertas_Log(LibertasLogLevel.DEBUG, 
                    "Report cluster=" + clusterReport[0] + " attrs:" + 
                    JSON.stringify(clusterReport[1]))
            }
        }
    });
    const clusterAccess = Libertas_DeviceGetClusterAccess(device)
    // Must have OnOff cluster
    const clusters : LibertasClusterSubscribeReq[] = [
        [
            Matter.Clusters.OnOff, 
            1, 
            300,
            [Matter.Attributes.OnOff.OnOff]
        ]
    ]
    if (clusterAccess[Matter.Clusters.LevelControl] !== undefined) {
        // If device supports LevelControl cluster then subscribe two 
        // more attributes with [1 second, 300 seconds] intervals
        clusters.push(
            [
                Matter.Clusters.LevelControl, 
                1, 
                300,
                [
                    Matter.Attributes.LevelControl.CurrentLevel,
                    Matter.Attributes.LevelControl.RemainingTime
                ]
            ]
        )
    }
    Libertas_AppSubscribeReq(
        [
            [device, clusters]  // Only one device
        ]);
    Libertas_WaitReactive();
}
export {DemoLightSubscribe}