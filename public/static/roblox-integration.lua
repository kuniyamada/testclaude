-- Thanks Garden - Roblox Integration Script
-- このスクリプトをRoblox StudioのServerScriptServiceに配置してください

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- 設定
local CONFIG = {
	BASE_URL = "https://your-thanks-garden-url.pages.dev", -- Thanks GardenのURLに変更
	API_KEY = "",  -- ROBLOX_API_KEYを設定している場合はここに入力
	REFRESH_INTERVAL = 60, -- データ更新間隔（秒）
}

local ThanksGarden = {}

function ThanksGarden.makeRequest(method, path, body)
	local url = CONFIG.BASE_URL .. "/api/roblox" .. path
	local headers = {
		["Content-Type"] = "application/json",
	}
	if CONFIG.API_KEY ~= "" then
		headers["X-API-Key"] = CONFIG.API_KEY
	end

	local success, response = pcall(function()
		if method == "GET" then
			return HttpService:GetAsync(url, false, headers)
		else
			local jsonBody = body and HttpService:JSONEncode(body) or ""
			return HttpService:PostAsync(url, jsonBody, Enum.HttpContentType.ApplicationJson, false, headers)
		end
	end)

	if success then
		return true, HttpService:JSONDecode(response)
	else
		warn("[ThanksGarden] Request failed:", response)
		return false, nil
	end
end

-- ユーザーデータ取得
function ThanksGarden.getUserData(robloxUserId)
	return ThanksGarden.makeRequest("GET", "/user/" .. tostring(robloxUserId))
end

-- ランキング取得
function ThanksGarden.getLeaderboard(limit)
	limit = limit or 10
	return ThanksGarden.makeRequest("GET", "/leaderboard?limit=" .. tostring(limit))
end

-- 庭の状態取得
function ThanksGarden.getGarden()
	return ThanksGarden.makeRequest("GET", "/garden")
end

-- タイムライン取得
function ThanksGarden.getTimeline(limit)
	limit = limit or 10
	return ThanksGarden.makeRequest("GET", "/timeline?limit=" .. tostring(limit))
end

-- 感謝を送る
function ThanksGarden.sendThanks(senderRobloxId, receiverRobloxId, message)
	return ThanksGarden.makeRequest("POST", "/send-thanks", {
		sender_roblox_id = tostring(senderRobloxId),
		receiver_roblox_id = tostring(receiverRobloxId),
		message = message,
	})
end

-- プレイヤー参加時にデータを読み込む例
Players.PlayerAdded:Connect(function(player)
	local success, data = ThanksGarden.getUserData(player.UserId)
	if success and data.linked then
		local userData = data.user
		print(("[ThanksGarden] %s linked! Points: %d, Tree Lv.%d %s"):format(
			userData.name,
			userData.total_points,
			userData.tree.level,
			userData.tree.emoji
		))

		-- leaderstat として表示する例
		local leaderstats = Instance.new("Folder")
		leaderstats.Name = "leaderstats"
		leaderstats.Parent = player

		local points = Instance.new("IntValue")
		points.Name = "Points"
		points.Value = userData.total_points
		points.Parent = leaderstats

		local treeLevel = Instance.new("IntValue")
		treeLevel.Name = "TreeLv"
		treeLevel.Value = userData.tree.level
		treeLevel.Parent = leaderstats
	else
		print(("[ThanksGarden] %s is not linked"):format(player.Name))
	end
end)

return ThanksGarden
