// A light show
// 
declare class LightState {
    light: LibertasDevice;
    onoff: boolean;
}

declare class LightGroup {
    lightStates: LightState[];
    wait: number;
}

function DemoLightShow(groups: LightGroup[]): void {
    while (true) {
        for (const group of groups) {
            for (const cur of group.lightStates) {
                Libertas_DeviceCommandReq(
                    cur.light,
                    [
                        Matter.Clusters.OnOff,
                        cur.onoff ? 
                            Matter.Commands.OnOff.On : Matter.Commands.OnOff.Off
                    ]
                );
            }
            Libertas_Wait(group.wait * 1000);
        }
    }
}
export {DemoLightShow}