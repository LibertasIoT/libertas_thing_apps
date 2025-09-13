// The Zigbee/Matter dimmable light standard data model is 
// so wicked that it reflects decades of miserable design
// and implementation of IoT technology.
// 
type DimmerState = [
    command: number,
    startLevel: number,
    targetLevel: number,
    startTime: number,          //  In miliseconds
    transitionTime: number,     //  In 100 milliseconds. Cleared to 0 when transition finishes
    timer?: LibertasTimer]
type Dimmer = [state: DimmerState, onOffAttrs: LibertasAttributes, levelAttrs: LibertasAttributes]
type Config = [onOffAttrs: LibertasAttributes, levelAttrs: LibertasAttributes]

const CONFIG_DB_NAME = "config"

const SUPPORTED_ONOFF_ATTRIBUTES = [
        Matter.Attributes.OnOff.OnOff,
        Matter.Attributes.OnOff.GlobalSceneControl,
        Matter.Attributes.OnOff.OnTime,
        Matter.Attributes.OnOff.OffWaitTime,
        Matter.Attributes.OnOff.StartUpOnOff]

const WRITABLE_ONOFF_ATTRIBUTES = [
        Matter.Attributes.OnOff.StartUpOnOff]

const SUPPORTED_LEVEL_CONTROL_ATTRIBUTES = [
        Matter.Attributes.LevelControl.CurrentLevel,
        Matter.Attributes.LevelControl.RemainingTime,
        Matter.Attributes.LevelControl.OnLevel,
        Matter.Attributes.LevelControl.OnTransitionTime,
        Matter.Attributes.LevelControl.OffTransitionTime,
        Matter.Attributes.LevelControl.OnOffTransitionTime,
        Matter.Attributes.LevelControl.Options,
        Matter.Attributes.LevelControl.StartUpCurrentLevel ]

const WRITABLE_LEVEL_CONTROL_ATTRIBUTES = [
        Matter.Attributes.LevelControl.OnLevel,
        Matter.Attributes.LevelControl.OnTransitionTime,
        Matter.Attributes.LevelControl.OffTransitionTime,
        Matter.Attributes.LevelControl.OnOffTransitionTime,
        Matter.Attributes.LevelControl.Options,
        Matter.Attributes.LevelControl.StartUpCurrentLevel ]

const SUPPORTED_ONOFF_ATTRIBUTE_SET = new Set<number>(SUPPORTED_ONOFF_ATTRIBUTES)
const SUPPORTED_LEVEL_CONTROL_ATTRIBUTE_SET = new Set<number>(SUPPORTED_LEVEL_CONTROL_ATTRIBUTES)
const WRITABLE_ONOFF_ATTRIBUTE_SET = new Set<number>(WRITABLE_ONOFF_ATTRIBUTES)
const WRITABLE_LEVEL_CONTROL_ATTRIBUTE_SET = new Set<number>(WRITABLE_LEVEL_CONTROL_ATTRIBUTES)

function writeConfig(dimmer : Dimmer) {
    const config: Config = [dimmer[1], dimmer[2]]
    Libertas_DataWriteStandalone(CONFIG_DB_NAME, config)
}

function generateClusterAttributeRsp(
        clusterRsp : LibertasClusterReport,
        attrIdList : number[],
        attrs : LibertasAttributes,
        attrSet: Set<number>,
        name : string) {
    for (const attrId of attrIdList) {
        const v = attrs[attrId]
        if (v !== undefined) {
            clusterRsp[1][attrId] = v
            clusterRsp[2][attrId] = Matter.Status.Success
        } else {
            // Handle null value for Lua VM
            clusterRsp[2][attrId] = attrSet.has(attrId) ?
                Matter.Status.Success : Matter.Status.UnsupportedAttribute
        }
    }    
}

function dimmerCalculateCurrentLevel(state: DimmerState) {
    const [_, startLevel, targetLevel, startTime, transitionTime] = state
    const transitionTime_ms = transitionTime * 100;
    let elapsed_ms = os.msticks() - startTime
    if (elapsed_ms > transitionTime_ms) {
        elapsed_ms = transitionTime_ms;
    }
    const delta = Libertas_FloorDivision((targetLevel - startLevel) * elapsed_ms, transitionTime_ms)
    return startLevel + delta;
}

function dimmerLevelTransition(device: LibertasVirtualDevice, dimmer: Dimmer, onOffAttributeChanged?: number[]) {
    const levelAttributeChanged: number[] = []
    const [state, onOffAttrs, levelAttrs] = dimmer;
    const [command, startLevel, targetLevel, startTime, transitionTime, timer] = state

    const transitionTime_ms = transitionTime * 100;
    let elapsed_ms = os.msticks() - startTime
    if (elapsed_ms > transitionTime_ms) {
        elapsed_ms = transitionTime_ms;
    }
    let remaining_ms = transitionTime_ms - elapsed_ms
    const remainingTime = Libertas_FloorDivision(remaining_ms, 100)
    if (remainingTime !== levelAttrs[Matter.Attributes.LevelControl.RemainingTime]) {
        levelAttrs[Matter.Attributes.LevelControl.RemainingTime] = remainingTime
        levelAttributeChanged.push(Matter.Attributes.LevelControl.RemainingTime)
    }
    let delta = targetLevel - startLevel
    if (transitionTime_ms > 0) {
        delta = Libertas_FloorDivision(delta * elapsed_ms, transitionTime_ms)
    }
    const currentLevel = startLevel + delta;

    const prevLevel = levelAttrs[Matter.Attributes.LevelControl.CurrentLevel] as number
    if (prevLevel != currentLevel) {
        levelAttrs[Matter.Attributes.LevelControl.CurrentLevel] = currentLevel
        levelAttributeChanged.push(Matter.Attributes.LevelControl.CurrentLevel)
    }
    if (remaining_ms > 0) {
        if (remaining_ms > 100) {
            remaining_ms = 100;
        }
        if (timer === undefined) {  // First time create timer for reuse
            state[5] = Libertas_TimerNew(remaining_ms, (timer)=>{
                dimmerLevelTransition(device, dimmer);
            })
        } else {                    // Reuse the timer
            Libertas_TimerUpdate(timer, remaining_ms)
        }
    } else {
        state[4] = 0                // Clear transition time
        if (timer !== undefined) {  // OK if timer is already cancelled
            Libertas_TimerCancel(timer)
        }
    }
    if (command == Matter.Commands.LevelControl.MoveToLevelWithOnOff ||
        command == Matter.Commands.LevelControl.MoveWithOnOff ||
        command == Matter.Commands.LevelControl.StepWithOnOff ||
        command == Matter.Commands.LevelControl.StopWithOnOff) {
        const onOff = (currentLevel > 1)
        if (onOffAttrs[Matter.Attributes.OnOff.OnOff] != onOff) {
            onOffAttributeChanged = [Matter.Attributes.OnOff.OnOff]
            onOffAttrs[Matter.Attributes.OnOff.OnOff] = onOff
        }
    }
    // Generate attribute changes report
    let changes: LibertasClusterReadReq[] = []
    if (onOffAttributeChanged !== undefined) {
        changes.push([Matter.Clusters.OnOff, onOffAttributeChanged])
    }
    if (levelAttributeChanged.length > 0) {
        changes.push([Matter.Clusters.LevelControl, levelAttributeChanged])
    }
    if (changes.length > 0) {
        Libertas_VirtualDeviceAttributesChanged(device, changes)
    }
}

function dimmerCallback(device: LibertasVirtualDevice, ref: number, action: LibertasDeviceAction, data: LibertasVirtualDeviceReq, tag?: any) {
    const dimmer = tag as Dimmer;
    const [state, onOffAttrs, levelAttrs] = dimmer;
    if (action === LibertasDeviceAction.ReadRequest ||
        action === LibertasDeviceAction.SubscribeRequest) {
        const req = data as LibertasClusterReadReq[]
        const reports : LibertasClusterReport[] = [];
        for (const clusterReq of req) {
            const [clusterId, clusterAttrs] = clusterReq
            const clusterRsp : LibertasClusterReport = 
                [clusterId, <LibertasAttributes>{}, <LibertasIdStatus>{}];
            if (clusterId === Matter.Clusters.OnOff) {
                generateClusterAttributeRsp(clusterRsp, clusterAttrs, onOffAttrs, SUPPORTED_ONOFF_ATTRIBUTE_SET, "OnOff")
            } else if (clusterId === Matter.Clusters.LevelControl) {
                generateClusterAttributeRsp(clusterRsp, clusterAttrs, levelAttrs, SUPPORTED_LEVEL_CONTROL_ATTRIBUTE_SET, "Level")
            } else {
                for (const attrId of clusterReq[1]) {
                    clusterRsp[2][attrId] = Matter.Status.UnsupportedCluster
                }
            }
            reports.push(clusterRsp)
        }
        Libertas_VirtualDeviceAttributesRsp(device, ref, reports)
    } else if (action === LibertasDeviceAction.WriteRequest) {
        const req = data as LibertasClusterAttributes[]
        const attributeChanges: LibertasClusterReadReq[] = []
        const writeRsp: LibertasClusterWriteRsp[] = []
        for (const clusterReq of req) {
            const modified: number[] = [];
            const attributeStatus: LibertasIdStatus = {};
            const [cluster, attributes, nullAttributes] = clusterReq;
            let currentAttributes: LibertasAttributes | undefined;
            let attrIdSet: Set<number> | undefined
            if (cluster === Matter.Clusters.OnOff) {
                currentAttributes = onOffAttrs;
                attrIdSet = WRITABLE_ONOFF_ATTRIBUTE_SET
            } else if (cluster === Matter.Clusters.LevelControl) {
                currentAttributes = levelAttrs;
                attrIdSet = WRITABLE_LEVEL_CONTROL_ATTRIBUTE_SET
            }
            if (nullAttributes !== undefined) {
                for (const attrId of nullAttributes) {
                    if (attrIdSet!.has(attrId)) {
                        if (currentAttributes![attrId] !== undefined) {
                            currentAttributes![attrId] = undefined;
                            modified.push(attrId);
                        }
                        attributeStatus[attrId] = Matter.Status.Success;
                    } else {
                        attributeStatus[attrId] = Matter.Status.UnsupportedAccess;
                    }
                }
            }
            for (const [attrId, value] of Libertas_MakeIterable(attributes)) {
                if (attrIdSet!.has(attrId)) {
                    if (currentAttributes![attrId] !== value) {
                        currentAttributes![attrId] = value;
                        modified.push(attrId);
                    }
                    attributeStatus[attrId] = Matter.Status.Success;
                } else {
                    attributeStatus[attrId] = Matter.Status.UnsupportedAccess;
                }
            }
            if (modified.length > 0) {
                attributeChanges.push([cluster, modified])
                writeConfig(dimmer)
            }
            writeRsp.push([cluster, attributeStatus])
        }
        Libertas_VirtualDeviceWriteRsp(device, ref, writeRsp)
        if (attributeChanges.length > 0) {
            Libertas_VirtualDeviceAttributesChanged(device, attributeChanges)
        }
    } else if (action === LibertasDeviceAction.InvokeCommandRequest) {
        const req = data as LibertasCommand
        const [clusterId, commandId, commandData] = req
        if (clusterId === Matter.Clusters.OnOff) {
            let target: boolean | undefined = undefined
            if (commandId === Matter.Commands.OnOff.On) {
                target = true
            } else if (commandId === Matter.Commands.OnOff.Off) {
                target = false
            } else if (commandId === Matter.Commands.OnOff.Toggle) {
                target = !(onOffAttrs[Matter.Attributes.OnOff.OnOff] as boolean)
            }
            if (target !== undefined) {
                let onOffAttributeChanged: number[] | undefined
                if (onOffAttrs[Matter.Attributes.OnOff.OnOff] !== target) {
                    onOffAttrs[Matter.Attributes.OnOff.OnOff] = target;
                    onOffAttributeChanged = [Matter.Attributes.OnOff.OnOff]
                }
                state[0] = -1   // On/Off commands
                state[1] = target ? 1 : levelAttrs[Matter.Attributes.LevelControl.CurrentLevel] as number
                state[2] = target ? levelAttrs[Matter.Attributes.LevelControl.OnLevel] as number : 1
                state[3] = os.msticks()
                state[4] = levelAttrs[Matter.Attributes.LevelControl.OnOffTransitionTime] as number
                dimmerLevelTransition(device, dimmer, onOffAttributeChanged)
                Libertas_VirtualDeviceCommandRsp(device, ref, Matter.Status.Success)
            } else {
                Libertas_VirtualDeviceCommandRsp(device, ref, Matter.Status.UnsupportedCommand)
            }
        } else if (clusterId === Matter.Clusters.LevelControl) {
            let status = Matter.Status.Success;
            let target: number | undefined = undefined
            let transitionTime: number | undefined = undefined
            let currentLevel: number
            if (0 === state[4] as number) { // Based on RemainingTime
                currentLevel = levelAttrs[Matter.Attributes.LevelControl.CurrentLevel] as number
            } else {
                currentLevel = dimmerCalculateCurrentLevel(state)
            }
            if (commandId === Matter.Commands.LevelControl.Move ||
                    commandId === Matter.Commands.LevelControl.MoveWithOnOff) {
                if (commandData !== undefined) {
                    const moveMode = commandData[Matter.Fields.LevelControl.Move.MoveMode] as number | undefined
                    let rate = commandData[Matter.Fields.LevelControl.Move.Rate] as number | undefined
                    const optionsMask = commandData[Matter.Fields.LevelControl.Move.OptionsMask] as number | undefined
                    const optionsOverride = commandData[Matter.Fields.LevelControl.Move.OptionsOverride] as number | undefined
                    if (moveMode === undefined) {
                        status = Matter.Status.InvalidCommand
                    } else {
                        if (moveMode === Matter.Constants.LevelControl.MoveModeEnum.Up) {
                            target = 254
                        } else if (moveMode === Matter.Constants.LevelControl.MoveModeEnum.Down) {
                            target = 1
                        } else {
                            status = Matter.Status.InvalidCommand
                        }
                    }
                    if (target !== undefined) {
                        if (rate === undefined) {
                            rate = 0
                        }
                        const delta = Math.abs(currentLevel - target)
                        if (delta !== 0 && rate !== 0) {
                            transitionTime = Libertas_FloorDivision(delta * 10, rate)
                        } else {
                            transitionTime = 0
                        }
                    }
                }
            } else if (commandId === Matter.Commands.LevelControl.MoveToLevel ||
                    commandId === Matter.Commands.LevelControl.MoveToLevelWithOnOff) {
                if (commandData !== undefined) {
                    target = commandData[Matter.Fields.LevelControl.MoveToLevel.Level] as number | undefined
                    transitionTime = commandData[Matter.Fields.LevelControl.MoveToLevel.TransitionTime] as number | undefined
                }                
            } else if (commandId === Matter.Commands.LevelControl.Step ||
                commandId === Matter.Commands.LevelControl.StepWithOnOff) {
                if (commandData !== undefined) {
                    const stepSize = commandData[Matter.Fields.LevelControl.Step.StepSize] as number | undefined
                    if (stepSize !== undefined) {
                        const stepMode = commandData[Matter.Fields.LevelControl.Step.StepMode] as number | undefined
                        if (stepMode === Matter.Constants.LevelControl.StepModeEnum.Up) {
                            target = currentLevel + stepSize
                        } else if (stepMode === Matter.Constants.LevelControl.StepModeEnum.Down) {
                            target = currentLevel - stepSize
                        }
                    }
                    if (target !== undefined) {
                        if (target < 1) {
                            target = 1
                        } else if (target > 254) {
                            target = 254
                        }
                        transitionTime = commandData[Matter.Fields.LevelControl.Step.TransitionTime] as number | undefined
                    }
                } 
            } else if (commandId === Matter.Commands.LevelControl.Stop ||
                commandId === Matter.Commands.LevelControl.StopWithOnOff) {
                if (commandId === Matter.Commands.LevelControl.Stop) {
                    if (state[0] != Matter.Commands.LevelControl.Move) {
                        status = Matter.Status.InvalidInState
                    }
                } else {
                    if (state[0] != Matter.Commands.LevelControl.MoveWithOnOff) {
                        status = Matter.Status.InvalidInState
                    }
                }
                if (status == Matter.Status.Success) {
                    target = currentLevel
                    transitionTime = 0
                }
            } else {
                status = Matter.Status.UnsupportedCommand
            }
            if (target === undefined || transitionTime === undefined) {
                status = Matter.Status.InvalidCommand
            }
            Libertas_VirtualDeviceCommandRsp(device, ref, status)
            if (status == Matter.Status.Success) {
                state[0] = commandId
                state[1] = currentLevel
                state[2] = target!
                state[3] = os.msticks()
                state[4] = transitionTime!
                dimmerLevelTransition(device, dimmer, undefined)
            }
        } else {
            Libertas_VirtualDeviceCommandRsp(device, ref, Matter.Status.UnsupportedCluster)
        }
    }
}

export function virtualDimmer(device: LibertasVirtualDevice) {
    const dimmer : Dimmer = [[-1, 0, 0, 0, 0], {}, {}]
    Libertas_SetOnVirtualDevice(device, dimmerCallback, dimmer)
    // Initialize attributes
    // The attributes must match the developer designed "virtual device type". See URL below:
    // https://smartonlabs.com/doc/developers_doc/virtual_device_api/define_virtual_device/
    const config = Libertas_DataReadStandalone(CONFIG_DB_NAME) as Config | undefined;
    if (config !== undefined) {
        dimmer[1] = config[0];
        dimmer[2] = config[1];
    }
    // On/Off attributes
    const onOffAttrs = dimmer[1];
    const levelAttrs = dimmer[2];
    // Level control attributes
    onOffAttrs[Matter.Attributes.OnOff.OnOff] = false           // Initially off
    onOffAttrs[Matter.Attributes.OnOff.GlobalSceneControl] = false
    onOffAttrs[Matter.Attributes.OnOff.OnTime] = 0
    onOffAttrs[Matter.Attributes.OnOff.OffWaitTime] = 0
    levelAttrs[Matter.Attributes.LevelControl.CurrentLevel] = 1 // Minimum level
    levelAttrs[Matter.Attributes.LevelControl.RemainingTime] = 0

    if (config === undefined) {
        onOffAttrs[Matter.Attributes.OnOff.StartUpOnOff] = Matter.Constants.OnOff.StartUpOnOffEnum.Off
        levelAttrs[Matter.Attributes.LevelControl.OnLevel] = 254
        levelAttrs[Matter.Attributes.LevelControl.OnTransitionTime] = 20
        levelAttrs[Matter.Attributes.LevelControl.OffTransitionTime] = 20
        levelAttrs[Matter.Attributes.LevelControl.OnOffTransitionTime] = 20
        levelAttrs[Matter.Attributes.LevelControl.Options] = Matter.Constants.LevelControl.OptionsBitmap.ExecuteIfOff
        levelAttrs[Matter.Attributes.LevelControl.StartUpCurrentLevel] = 1 // Minimum level
    }
    // On startup, report attribute changes. Must match the attribute list in design.
    Libertas_VirtualDeviceAttributesChanged(device, 
    [
        [
            Matter.Clusters.OnOff, 
            SUPPORTED_ONOFF_ATTRIBUTES
        ],
        [
            Matter.Clusters.LevelControl,
            SUPPORTED_LEVEL_CONTROL_ATTRIBUTES
        ],
    ]);

    // Start event loop
    Libertas_WaitReactive();
}