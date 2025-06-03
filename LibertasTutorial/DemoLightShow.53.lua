--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local function DemoLightShow(groups)
    while true do
        for ____, group in ipairs(groups) do
            for ____, cur in ipairs(group.lightStates) do
                Libertas_DeviceCommandReq(cur.light, {6, cur.onoff and 1 or 0})
            end
            Libertas_Wait(group.wait * 1000)
        end
    end
end
____exports.DemoLightShow = DemoLightShow
return ____exports
