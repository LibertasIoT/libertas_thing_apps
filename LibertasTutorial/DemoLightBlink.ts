// Blink each light with independent interval.
declare class LightInterval {
    light: LibertasDevice;
    interval: number;
}

interface LightState {
    lightInterval: LightInterval;
    state: boolean;
}

function lightOnOff(lightState: LightState) {
    Libertas_DeviceCommandReq(
        lightState.lightInterval.light,
        [
            Matter.Clusters.OnOff,
            lightState.state ? 
                Matter.Commands.OnOff.On : Matter.Commands.OnOff.Off
        ]
    );        
}

function blinkLight(timer: LibertasTimer, tag: any) {
    let lightState = tag as LightState;
    lightState.state = !lightState.state;
    lightOnOff(lightState);
    Libertas_TimerUpdate(timer, lightState.lightInterval.interval * 1000);
}

export function DemoLightBlink(
        lights: LightInterval[]) : void {
    for (const curLight of lights) {
        let curState = {lightInterval: curLight, state: true};
        lightOnOff(curState);
        Libertas_TimerNew(curLight.interval * 1000, blinkLight, curState);
    }
    Libertas_WaitReactive();
}