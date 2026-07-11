local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.Config)

local playerStore = DataStoreService:GetDataStore("YachtPlayerData_v1")

local PlayerProgression = {}

local DEFAULT_DATA = {
	level = 1,
	xp = 0,
	unlockedBoats = { "Dinghy" },
	unlockedCourses = { "Enoshima" },
	titles = {},
	customColors = {},
	totalRaces = 0,
	wins = 0,
	bestTimes = {},
	currentBoat = "Dinghy",
	currentMode = "Kids",
}

local XP_PER_LEVEL = 100
local XP_REWARDS = {
	raceFinish = 20,
	raceWin = 50,
	buoyPass = 5,
	personalBest = 30,
}

local activePlayers = {}

function PlayerProgression.loadData(player)
	local success, data = pcall(function()
		return playerStore:GetAsync("player_" .. player.UserId)
	end)

	if success and data then
		for key, default in pairs(DEFAULT_DATA) do
			if data[key] == nil then
				data[key] = default
			end
		end
		activePlayers[player.UserId] = data
	else
		activePlayers[player.UserId] = table.clone(DEFAULT_DATA)
		activePlayers[player.UserId].unlockedBoats = { "Dinghy" }
		activePlayers[player.UserId].unlockedCourses = { "Enoshima" }
	end

	return activePlayers[player.UserId]
end

function PlayerProgression.saveData(player)
	local data = activePlayers[player.UserId]
	if not data then
		return
	end

	pcall(function()
		playerStore:SetAsync("player_" .. player.UserId, data)
	end)
end

function PlayerProgression.addXP(player, amount, reason)
	local data = activePlayers[player.UserId]
	if not data then
		return
	end

	data.xp = data.xp + amount
	while data.xp >= data.level * XP_PER_LEVEL do
		data.xp = data.xp - data.level * XP_PER_LEVEL
		data.level = data.level + 1
		PlayerProgression.checkUnlocks(player)
	end
end

function PlayerProgression.checkUnlocks(player)
	local data = activePlayers[player.UserId]
	if not data then
		return
	end

	for boatName, boatConfig in pairs(Config.Boats) do
		if data.level >= boatConfig.unlockLevel then
			if not table.find(data.unlockedBoats, boatName) then
				table.insert(data.unlockedBoats, boatName)
			end
		end
	end

	local courseUnlocks = {
		{ level = 1, course = "Enoshima" },
		{ level = 3, course = "Hayama" },
		{ level = 5, course = "Sydney" },
		{ level = 8, course = "SanFrancisco" },
		{ level = 10, course = "Olympic" },
		{ level = 15, course = "Mediterranean" },
		{ level = 12, course = "Hawaii" },
	}

	for _, unlock in ipairs(courseUnlocks) do
		if data.level >= unlock.level then
			if not table.find(data.unlockedCourses, unlock.course) then
				table.insert(data.unlockedCourses, unlock.course)
			end
		end
	end
end

function PlayerProgression.onRaceFinish(player, rank, time, courseName)
	local data = activePlayers[player.UserId]
	if not data then
		return
	end

	data.totalRaces = data.totalRaces + 1
	PlayerProgression.addXP(player, XP_REWARDS.raceFinish, "レース完走")

	if rank == 1 then
		data.wins = data.wins + 1
		PlayerProgression.addXP(player, XP_REWARDS.raceWin, "レース優勝")
	end

	if not data.bestTimes[courseName] or time < data.bestTimes[courseName] then
		data.bestTimes[courseName] = time
		PlayerProgression.addXP(player, XP_REWARDS.personalBest, "自己ベスト更新")
	end

	local titles = {
		{ races = 1, title = "初心者セーラー" },
		{ races = 10, title = "見習い水夫" },
		{ races = 50, title = "熟練セーラー" },
		{ races = 100, title = "ベテラン船長" },
		{ wins = 10, title = "レースチャンピオン" },
		{ wins = 50, title = "海の王者" },
	}

	for _, t in ipairs(titles) do
		if t.races and data.totalRaces >= t.races then
			if not table.find(data.titles, t.title) then
				table.insert(data.titles, t.title)
			end
		end
		if t.wins and data.wins >= t.wins then
			if not table.find(data.titles, t.title) then
				table.insert(data.titles, t.title)
			end
		end
	end

	PlayerProgression.saveData(player)
end

function PlayerProgression.getData(player)
	return activePlayers[player.UserId]
end

Players.PlayerAdded:Connect(function(player)
	PlayerProgression.loadData(player)
end)

Players.PlayerRemoving:Connect(function(player)
	PlayerProgression.saveData(player)
	activePlayers[player.UserId] = nil
end)

game:BindToClose(function()
	for _, player in ipairs(Players:GetPlayers()) do
		PlayerProgression.saveData(player)
	end
end)

print("[YachtRaceSimulator] PlayerProgression initialized")
