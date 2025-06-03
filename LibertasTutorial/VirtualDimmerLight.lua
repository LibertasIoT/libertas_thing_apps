--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local CONFIG_DB_NAME = "config"
local SUPPORTED_ONOFF_ATTRIBUTES = {
    0,
    16384,
    16385,
    16386,
    16387
}
local WRITABLE_ONOFF_ATTRIBUTES = {16387}
local SUPPORTED_LEVEL_CONTROL_ATTRIBUTES = {
    0,
    1,
    17,
    18,
    19,
    16,
    15,
    16384
}
local WRITABLE_LEVEL_CONTROL_ATTRIBUTES = {
    17,
    18,
    19,
    16,
    15,
    16384
}
local SUPPORTED_ONOFF_ATTRIBUTE_SET = __TS__New(Set, SUPPORTED_ONOFF_ATTRIBUTES)
local SUPPORTED_LEVEL_CONTROL_ATTRIBUTE_SET = __TS__New(Set, SUPPORTED_LEVEL_CONTROL_ATTRIBUTES)
local WRITABLE_ONOFF_ATTRIBUTE_SET = __TS__New(Set, WRITABLE_ONOFF_ATTRIBUTES)
local WRITABLE_LEVEL_CONTROL_ATTRIBUTE_SET = __TS__New(Set, WRITABLE_LEVEL_CONTROL_ATTRIBUTES)
local function writeConfig(dimmer)
    local config = {dimmer[2], dimmer[3]}
    Libertas_DataWriteStandalone(CONFIG_DB_NAME, config)
end
local function generateClusterAttributeRsp(clusterRsp, attrIdList, attrs, attrSet)
    for ____, attrId in ipairs(attrIdList) do
        local v = attrs[attrId]
        if v ~= nil then
            clusterRsp[2][attrId] = v
            clusterRsp[3][attrId] = 0
        else
            clusterRsp[3][attrId] = attrSet:has(attrId) and 0 or 134
        end
    end
end
local function dimmerCalculateCurrentLevel(state)
    local _, startLevel, targetLevel, startTime, transitionTime = unpack(state)
    local transitionTime_ms = transitionTime * 100
    local elapsed_ms = os.msticks() - startTime
    if elapsed_ms > transitionTime_ms then
        elapsed_ms = transitionTime_ms
    end
    local delta = math.floor((targetLevel - startLevel) * elapsed_ms / transitionTime_ms)
    return startLevel + delta
end
local function dimmerLevelTransition(device, dimmer, onOffAttributeChanged)
    local levelAttributeChanged = {}
    local state, onOffAttrs, levelAttrs = unpack(dimmer)
    local command, startLevel, targetLevel, startTime, transitionTime, timer = unpack(state)
    local transitionTime_ms = transitionTime * 100
    local elapsed_ms = os.msticks() - startTime
    if elapsed_ms > transitionTime_ms then
        elapsed_ms = transitionTime_ms
    end
    local remaining_ms = transitionTime_ms - elapsed_ms
    local remainingTime = math.floor(remaining_ms / 100)
    if remainingTime ~= levelAttrs[1] then
        levelAttrs[1] = remainingTime
        levelAttributeChanged[#levelAttributeChanged + 1] = 1
    end
    local delta = targetLevel - startLevel
    if transitionTime_ms > 0 then
        delta = math.floor(delta * elapsed_ms / transitionTime_ms)
    end
    local currentLevel = startLevel + delta
    local prevLevel = levelAttrs[0]
    if prevLevel ~= currentLevel then
        levelAttrs[0] = currentLevel
        levelAttributeChanged[#levelAttributeChanged + 1] = 0
    end
    if remaining_ms > 0 then
        if remaining_ms > 100 then
            remaining_ms = 100
        end
        if timer == nil then
            state[6] = Libertas_TimerNew(
                remaining_ms,
                function(timer)
                    dimmerLevelTransition(device, dimmer)
                end
            )
        else
            Libertas_TimerUpdate(timer, remaining_ms)
        end
    else
        state[5] = 0
        if timer ~= nil then
            Libertas_TimerCancel(timer)
        end
    end
    if command == 4 or command == 5 or command == 6 or command == 7 then
        local onOff = currentLevel > 1
        if onOffAttrs[0] ~= onOff then
            onOffAttributeChanged = {0}
            onOffAttrs[0] = onOff
        end
    end
    local changes = {}
    if onOffAttributeChanged ~= nil then
        changes[#changes + 1] = {6, onOffAttributeChanged}
    end
    if #levelAttributeChanged > 0 then
        changes[#changes + 1] = {8, levelAttributeChanged}
    end
    if #changes > 0 then
        Libertas_VirtualDeviceAttributesChanged(device, changes)
    end
end
local function dimmerCallback(device, ref, action, data, tag)
    local dimmer = tag
    local state, onOffAttrs, levelAttrs = unpack(dimmer)
    if action == 2 or action == 3 then
        local req = data
        local reports = {}
        for ____, clusterReq in ipairs(req) do
            local clusterId = clusterReq[1]
            local clusterRsp = {clusterId, {}, {}}
            if clusterId == 6 then
                generateClusterAttributeRsp(clusterRsp, clusterReq[2], onOffAttrs, SUPPORTED_ONOFF_ATTRIBUTE_SET)
            elseif clusterId == 8 then
                generateClusterAttributeRsp(clusterRsp, clusterReq[2], levelAttrs, SUPPORTED_LEVEL_CONTROL_ATTRIBUTE_SET)
            else
                for ____, attrId in ipairs(clusterReq[2]) do
                    clusterRsp[3][attrId] = 195
                end
            end
            reports[#reports + 1] = clusterRsp
        end
        Libertas_VirtualDeviceAttributesRsp(device, ref, reports)
    elseif action == 6 then
        local req = data
        local attributeChanges = {}
        local writeRsp = {}
        for ____, clusterReq in ipairs(req) do
            local modified = {}
            local attributeStatus = {}
            local cluster, attributes, nullAttributes = unpack(clusterReq)
            local currentAttributes
            local attrIdSet
            if cluster == 6 then
                currentAttributes = onOffAttrs
                attrIdSet = WRITABLE_ONOFF_ATTRIBUTE_SET
            elseif cluster == 8 then
                currentAttributes = levelAttrs
                attrIdSet = WRITABLE_LEVEL_CONTROL_ATTRIBUTE_SET
            end
            if nullAttributes ~= nil then
                for ____, attrId in ipairs(nullAttributes) do
                    if attrIdSet:has(attrId) then
                        if currentAttributes[attrId] ~= nil then
                            currentAttributes[attrId] = nil
                            modified[#modified + 1] = attrId
                        end
                        attributeStatus[attrId] = 0
                    else
                        attributeStatus[attrId] = 126
                    end
                end
            end
            for attrId, value in pairs(attributes) do
                if attrIdSet:has(attrId) then
                    if currentAttributes[attrId] ~= value then
                        currentAttributes[attrId] = value
                        modified[#modified + 1] = attrId
                    end
                    attributeStatus[attrId] = 0
                else
                    attributeStatus[attrId] = 126
                end
            end
            if #modified > 0 then
                attributeChanges[#attributeChanges + 1] = {cluster, modified}
                writeConfig(dimmer)
            end
            writeRsp[#writeRsp + 1] = {cluster, attributeStatus}
        end
        Libertas_VirtualDeviceWriteRsp(device, ref, writeRsp)
        if #attributeChanges > 0 then
            Libertas_VirtualDeviceAttributesChanged(device, attributeChanges)
        end
    elseif action == 8 then
        local req = data
        local clusterId, commandId, commandData = unpack(req)
        if clusterId == 6 then
            local target = nil
            if commandId == 1 then
                target = true
            elseif commandId == 0 then
                target = false
            elseif commandId == 2 then
                target = not onOffAttrs[0]
            end
            if target ~= nil then
                local onOffAttributeChanged
                if onOffAttrs[0] ~= target then
                    onOffAttrs[0] = target
                    onOffAttributeChanged = {0}
                end
                state[1] = -1
                state[2] = target and 1 or levelAttrs[0]
                state[3] = target and levelAttrs[17] or 1
                state[4] = os.msticks()
                state[5] = levelAttrs[16]
                dimmerLevelTransition(device, dimmer, onOffAttributeChanged)
                Libertas_VirtualDeviceCommandRsp(device, ref, 0)
            else
                Libertas_VirtualDeviceCommandRsp(device, ref, 129)
            end
        elseif clusterId == 8 then
            local status = 0
            local target = nil
            local transitionTime = nil
            local currentLevel
            if 0 == state[5] then
                currentLevel = levelAttrs[0]
            else
                currentLevel = dimmerCalculateCurrentLevel(state)
            end
            if commandId == 1 or commandId == 5 then
                if commandData ~= nil then
                    local moveMode = commandData[0]
                    local rate = commandData[1]
                    local optionsMask = commandData[2]
                    local optionsOverride = commandData[3]
                    if moveMode == nil then
                        status = 133
                    else
                        if moveMode == 0 then
                            target = 254
                        elseif moveMode == 1 then
                            target = 1
                        else
                            status = 133
                        end
                    end
                    if target ~= nil then
                        if rate == nil then
                            rate = 0
                        end
                        local delta = math.abs(currentLevel - target)
                        if delta ~= 0 and rate ~= 0 then
                            transitionTime = math.floor(delta * 10 / rate)
                        else
                            transitionTime = 0
                        end
                    end
                end
            elseif commandId == 0 or commandId == 4 then
                if commandData ~= nil then
                    target = commandData[0]
                    transitionTime = commandData[1]
                end
            elseif commandId == 2 or commandId == 6 then
                if commandData ~= nil then
                    local stepSize = commandData[1]
                    if stepSize ~= nil then
                        local stepMode = commandData[0]
                        if stepMode == 0 then
                            target = currentLevel + stepSize
                        elseif stepMode == 1 then
                            target = currentLevel - stepSize
                        end
                    end
                    if target ~= nil then
                        if target < 1 then
                            target = 1
                        elseif target > 254 then
                            target = 254
                        end
                        transitionTime = commandData[2]
                    end
                end
            elseif commandId == 3 or commandId == 7 then
                if commandId == 3 then
                    if state[1] ~= 1 then
                        status = 203
                    end
                else
                    if state[1] ~= 5 then
                        status = 203
                    end
                end
                if status == 0 then
                    target = currentLevel
                    transitionTime = 0
                end
            else
                status = 129
            end
            if target == nil or transitionTime == nil then
                status = 133
            end
            Libertas_VirtualDeviceCommandRsp(device, ref, status)
            if status == 0 then
                state[1] = commandId
                state[2] = currentLevel
                state[3] = target
                state[4] = os.msticks()
                state[5] = transitionTime
                dimmerLevelTransition(device, dimmer, nil)
            end
        else
            Libertas_VirtualDeviceCommandRsp(device, ref, 195)
        end
    end
end
function ____exports.virtualDimmer(device)
    local dimmer = {{
        -1,
        0,
        0,
        0,
        0
    }, {}, {}}
    Libertas_SetOnVirtualDevice(device, dimmerCallback, dimmer)
    local config = Libertas_DataReadStandalone(CONFIG_DB_NAME)
    if config ~= nil then
        dimmer[2] = config[1]
        dimmer[3] = config[2]
    end
    local onOffAttrs = dimmer[2]
    local levelAttrs = dimmer[3]
    onOffAttrs[0] = false
    onOffAttrs[16384] = false
    onOffAttrs[16385] = 0
    onOffAttrs[16386] = 0
    levelAttrs[0] = 1
    levelAttrs[1] = 0
    if config == nil then
        onOffAttrs[16387] = 0
        levelAttrs[17] = 254
        levelAttrs[18] = 20
        levelAttrs[19] = 20
        levelAttrs[16] = 20
        levelAttrs[15] = 1
        levelAttrs[16384] = 1
    end
    Libertas_VirtualDeviceAttributesChanged(device, {{6, SUPPORTED_ONOFF_ATTRIBUTES}, {8, SUPPORTED_LEVEL_CONTROL_ATTRIBUTES}})
    Libertas_WaitReactive()
end
return ____exports
