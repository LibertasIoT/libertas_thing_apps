--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
--- End users can add user or group into the recipients array.
function ____exports.TestMessage(recipients)
    local now = os.date("%Y-%m-%d %H:%M:%S")
    Libertas_MessageText(
        2,
        nil,
        recipients,
        "TEST_MESSAGE",
        now
    )
    local temp = {type = "unit", unit = "Cel", value = 23}
    Libertas_MessageText(
        2,
        nil,
        recipients,
        "TEMP_DISPLAY",
        temp
    )
end
return ____exports
