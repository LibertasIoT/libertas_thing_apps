--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local function lightOnOff(lightState)
    Libertas_DeviceCommandReq(lightState.lightInterval.light, {6, lightState.state and 1 or 0})
end
local function blinkLight(timer, tag)
    local lightState = tag
    lightState.state = not lightState.state
    lightOnOff(lightState)
    Libertas_TimerUpdate(timer, lightState.lightInterval.interval * 1000)
end
function ____exports.DemoLightBlink(lights)
    for ____, curLight in ipairs(lights) do
        local curState = {lightInterval = curLight, state = true}
        lightOnOff(curState)
        Libertas_TimerNew(curLight.interval * 1000, blinkLight, curState)
    end
    Libertas_WaitReactive()
end
return ____exports
