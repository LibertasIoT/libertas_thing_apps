function SetDimmerOnOff(dimmer: LibertasDevice, state: boolean) {
    if (state) {
        Libertas_DeviceCommandReq(dimmer, 
        [
            Matter.Clusters.LevelControl, 
            Matter.Commands.LevelControl.MoveToLevelWithOnOff, 
            {
                [Matter.Fields.LevelControl.MoveToLevel.Level]: 254,
                [Matter.Fields.LevelControl.MoveToLevel.TransitionTime]: 0,
                [Matter.Fields.LevelControl.MoveToLevel.OptionsMask]: Matter.Constants.LevelControl.OptionsBitmap.ExecuteIfOff,
            }
        ]);
    } else {
        Libertas_DeviceCommandReq(dimmer, 
        [
            Matter.Clusters.LevelControl, 
            Matter.Commands.LevelControl.MoveToLevelWithOnOff, 
            {
                [Matter.Fields.LevelControl.MoveToLevel.Level]: 0,
                [Matter.Fields.LevelControl.MoveToLevel.TransitionTime]: 0,
                [Matter.Fields.LevelControl.MoveToLevel.OptionsMask]: Matter.Constants.LevelControl.OptionsBitmap.ExecuteIfOff,
            }
        ]);
    }
}

function DimmerBlinker(dimmer: LibertasDevice, interval: number) {
    SetDimmerOnOff(dimmer, false)       // Initially turn dimmer off
    Libertas_TimerNew(interval * 1000,  // Set up a timer to flip the state for every interval seconds
        (timer, tag) => {
            const newState = !(tag as boolean)
            SetDimmerOnOff(dimmer, newState)
            Libertas_TimerUpdate(timer, interval * 1000, undefined, newState)
        }, false);
    Libertas_WaitReactive();
}
export {DimmerBlinker}