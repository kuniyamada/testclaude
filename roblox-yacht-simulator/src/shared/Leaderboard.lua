local Leaderboard = {}
Leaderboard.__index = Leaderboard

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local globalStore = DataStoreService:GetOrderedDataStore("YachtGlobalLeaderboard_v1")

function Leaderboard.new()
	local self = setmetatable({}, Leaderboard)
	self.cache = {}
	self.lastUpdate = 0
	self.updateInterval = 60
	return self
end

function Leaderboard:submitScore(player, courseName, time)
	local key = courseName .. "_" .. player.UserId
	local scoreValue = math.floor(time * 1000)

	pcall(function()
		local existing = globalStore:GetAsync(key)
		if not existing or scoreValue < existing then
			globalStore:SetAsync(key, scoreValue)
		end
	end)
end

function Leaderboard:getTopScores(courseName, count)
	count = count or 10

	local success, pages = pcall(function()
		return globalStore:GetSortedAsync(true, count)
	end)

	if not success or not pages then
		return self.cache[courseName] or {}
	end

	local results = {}
	local page = pages:GetCurrentPage()

	for rank, entry in ipairs(page) do
		local key = entry.key
		local parts = string.split(key, "_")
		local course = parts[1]

		if course == courseName then
			table.insert(results, {
				rank = rank,
				userId = tonumber(parts[2]),
				time = entry.value / 1000,
			})
		end
	end

	self.cache[courseName] = results
	self.lastUpdate = tick()

	return results
end

function Leaderboard:getPlayerRank(player, courseName)
	local scores = self:getTopScores(courseName, 100)

	for _, entry in ipairs(scores) do
		if entry.userId == player.UserId then
			return entry.rank, entry.time
		end
	end

	return nil, nil
end

function Leaderboard:formatTime(seconds)
	local mins = math.floor(seconds / 60)
	local secs = seconds % 60
	return string.format("%d:%05.2f", mins, secs)
end

return Leaderboard
