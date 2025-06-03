--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local function DemoLightSubscribe(device)
    Libertas_SetOnDevice(
        device,
        function(device, action, data, tag, ref)
            if action == 5 or action == 64 then
                local reportData = data
                for ____, clusterReport in ipairs(reportData) do
                    Libertas_Log(
                        1,
                        (("Report cluster=" .. tostring(clusterReport[1])) .. " attrs:") .. json.encode(clusterReport[2])
                    )
                end
            end
        end
    )
    local clusterAccess = Libertas_DeviceGetClusterAccess(device)
    local clusters = {{6, 1, 300, {0}}}
    if clusterAccess[8] ~= nil then
        clusters[#clusters + 1] = {8, 1, 300, {0, 1}}
    end
    Libertas_AppSubscribeReq({{device, clusters}})
    Libertas_WaitReactive()
end
____exports.DemoLightSubscribe = DemoLightSubscribe
return ____exports
