--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local function printEneryMeasurement(attributes, name, attrId)
    local measurementStruct = attributes[attrId]
    if measurementStruct ~= nil then
        local energy = measurementStruct[0]
        if energy ~= nil then
            return (name .. tostring(energy)) .. "mWh; "
        end
    end
    return ""
end
local function TrackPowerReports(device)
    Libertas_SetOnDevice(
        device,
        function(device, action, data, tag, ref)
            if action == 5 then
                local text = "Report received: "
                for ____, clusterReport in ipairs(data) do
                    local cluster, attributes = unpack(clusterReport)
                    if cluster == 144 then
                        local activePower = attributes[8]
                        if activePower ~= nil then
                            text = text .. ("ActivePower=" .. tostring(activePower)) .. "mW; "
                        end
                    elseif cluster == 145 then
                        text = text .. printEneryMeasurement(attributes, "CumulativeEnergyImported=", 1)
                        text = text .. printEneryMeasurement(attributes, "PeriodicEnergyImported=", 3)
                        text = text .. printEneryMeasurement(attributes, "CumulativeEnergyExported=", 2)
                        text = text .. printEneryMeasurement(attributes, "PeriodicEnergyExported=", 4)
                    end
                    Libertas_Log(1, text)
                end
            end
        end
    )
    local clusters = {}
    local clusterAccess = Libertas_DeviceGetClusterAccess(device)
    if clusterAccess[144] ~= nil then
        clusters[#clusters + 1] = {144, 1, 300, {8}}
    end
    if clusterAccess[145] ~= nil then
        clusters[#clusters + 1] = {145, 1, 300, {1, 3, 2, 4}}
    end
    if #clusters > 0 then
        Libertas_AppSubscribeReq({{device, clusters}})
        Libertas_WaitReactive()
    end
end
____exports.TrackPowerReports = TrackPowerReports
return ____exports
