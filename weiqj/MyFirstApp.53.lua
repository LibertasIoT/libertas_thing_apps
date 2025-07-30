--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local function SetDimmerOnOff(dimmer, state)
    if state then
        Libertas_DeviceCommandReq(dimmer, {8, 4, {[0] = 254, [1] = 0, [2] = 1}})
    else
        Libertas_DeviceCommandReq(dimmer, {8, 4, {[0] = 0, [1] = 0, [2] = 1}})
    end
end
local function DimmerBlinker(dimmer, interval)
    SetDimmerOnOff(dimmer, false)
    Libertas_TimerNew(
        interval * 1000,
        function(timer, tag)
            local newState = not tag
            SetDimmerOnOff(dimmer, newState)
            Libertas_TimerUpdate(timer, interval * 1000, nil, newState)
        end,
        false
    )
    Libertas_WaitReactive()
end
____exports.DimmerBlinker = DimmerBlinker
return ____exports
