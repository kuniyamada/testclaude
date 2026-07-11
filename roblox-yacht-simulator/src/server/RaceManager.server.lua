local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Config = require(ReplicatedStorage.Config)
local CourseManager = require(ReplicatedStorage.CourseManager)
local WindSystem = require(ReplicatedStorage.WindSystem)

local RaceManager = {}
RaceManager.__index = RaceManager

local activeRaces = {}
local playerData = {}

local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
remotes.Parent = ReplicatedStorage

local function createRemote(name, className)
	local remote = Instance.new(className)
	remote.Name = name
	remote.Parent = remotes
	return remote
end

local JoinRaceEvent = createRemote("JoinRace", "RemoteEvent")
local LeaveRaceEvent = createRemote("LeaveRace", "RemoteEvent")
local StartRaceEvent = createRemote("StartRace", "RemoteEvent")
local RaceUpdateEvent = createRemote("RaceUpdate", "RemoteEvent")
local FinishRaceEvent = createRemote("FinishRace", "RemoteEvent")
local BoatInputEvent = createRemote("BoatInput", "RemoteEvent")
local SelectModeEvent = createRemote("SelectMode", "RemoteEvent")
local SelectBoatEvent = createRemote("SelectBoat", "RemoteEvent")
local WindUpdateEvent = createRemote("WindUpdate", "RemoteEvent")
local LeaderboardEvent = createRemote("LeaderboardUpdate", "RemoteEvent")
local GetPlayerDataFunction = createRemote("GetPlayerData", "RemoteFunction")

function RaceManager.new(courseName, gameMode)
	local gameModeConfig = Config.GameModes[gameMode]
	assert(gameModeConfig, "Unknown game mode: " .. gameMode)

	local self = setmetatable({}, RaceManager)
	self.id = game:GetService("HttpService"):GenerateGUID(false)
	self.courseName = courseName
	self.gameMode = gameMode
	self.gameModeConfig = gameModeConfig
	self.course = CourseManager.new(courseName)
	self.wind = WindSystem.new()
	self.players = {}
	self.rankings = {}
	self.state = "waiting"
	self.countdown = Config.Lobby.raceCountdown
	self.elapsedTime = 0
	self.weather = "Clear"

	activeRaces[self.id] = self
	return self
end

function RaceManager:addPlayer(player, boatType, mode)
	if #self.players >= self.gameModeConfig.maxPlayers then
		return false, "レースが満員です"
	end

	if self.state ~= "waiting" then
		return false, "レースは既に開始しています"
	end

	table.insert(self.players, {
		player = player,
		boatType = boatType or "Dinghy",
		mode = mode or "Kids",
		currentBuoy = 1,
		laps = 0,
		finished = false,
		finishTime = 0,
		position = Vector3.zero,
		prevPosition = Vector3.zero,
	})

	return true
end

function RaceManager:removePlayer(player)
	for i, p in ipairs(self.players) do
		if p.player == player then
			table.remove(self.players, i)
			break
		end
	end
end

function RaceManager:startCountdown()
	if #self.players < self.gameModeConfig.minPlayers then
		return false, "プレイヤーが足りません"
	end

	self.state = "countdown"
	self.countdown = Config.Lobby.raceCountdown

	task.spawn(function()
		while self.countdown > 0 and self.state == "countdown" do
			for _, p in ipairs(self.players) do
				StartRaceEvent:FireClient(p.player, {
					state = "countdown",
					countdown = self.countdown,
					courseName = self.courseName,
				})
			end
			task.wait(1)
			self.countdown = self.countdown - 1
		end

		if self.state == "countdown" then
			self:startRace()
		end
	end)

	return true
end

function RaceManager:startRace()
	self.state = "racing"
	self.elapsedTime = 0

	local startPos = self.course.startLine.position
	for i, p in ipairs(self.players) do
		local offset = Vector3.new((i - 1) * 15 - (#self.players - 1) * 7.5, 0, 0)
		p.position = startPos + offset
		p.prevPosition = p.position
	end

	for _, p in ipairs(self.players) do
		StartRaceEvent:FireClient(p.player, {
			state = "started",
			position = p.position,
		})
	end
end

function RaceManager:update(dt)
	if self.state ~= "racing" then
		return
	end

	self.elapsedTime = self.elapsedTime + dt
	self.wind:update(dt)

	if self.gameModeConfig.duration > 0 and self.elapsedTime >= self.gameModeConfig.duration then
		self:endRace()
		return
	end

	local rankings = {}
	for _, p in ipairs(self.players) do
		if not p.finished then
			local passed, nextBuoy = self.course:checkBuoyPassing(
				p.player.UserId,
				p.position,
				p.currentBuoy
			)
			if passed then
				p.currentBuoy = nextBuoy
			end

			if p.currentBuoy > self.course:getTotalBuoys() then
				if self.course:checkFinishLineCrossing(p.position, p.prevPosition) then
					p.finished = true
					p.finishTime = self.elapsedTime
					table.insert(self.rankings, {
						player = p.player,
						time = self.elapsedTime,
						rank = #self.rankings + 1,
					})
					FinishRaceEvent:FireClient(p.player, {
						rank = #self.rankings,
						time = self.elapsedTime,
					})
				end
			end

			p.prevPosition = p.position
		end

		table.insert(rankings, {
			name = p.player.DisplayName,
			buoy = p.currentBuoy,
			finished = p.finished,
			time = p.finished and p.finishTime or self.elapsedTime,
		})
	end

	table.sort(rankings, function(a, b)
		if a.finished ~= b.finished then
			return a.finished
		end
		if a.finished then
			return a.time < b.time
		end
		return a.buoy > b.buoy
	end)

	for _, p in ipairs(self.players) do
		local windDir, windSpeed = self.wind:getWindAtPosition(p.position)
		RaceUpdateEvent:FireClient(p.player, {
			rankings = rankings,
			elapsedTime = self.elapsedTime,
			windDirection = windDir,
			windSpeed = windSpeed,
			weather = self.weather,
		})
	end

	local allFinished = true
	for _, p in ipairs(self.players) do
		if not p.finished then
			allFinished = false
			break
		end
	end

	if allFinished then
		self:endRace()
	end
end

function RaceManager:endRace()
	self.state = "finished"

	for _, p in ipairs(self.players) do
		FinishRaceEvent:FireClient(p.player, {
			rankings = self.rankings,
			state = "finished",
		})
	end

	task.delay(30, function()
		activeRaces[self.id] = nil
	end)
end

function RaceManager:setWeather(weatherName)
	if Config.Weather[weatherName] then
		self.weather = weatherName
		self.wind:setWeather(weatherName)
	end
end

local defaultRace = RaceManager.new("Enoshima", "Race")

JoinRaceEvent.OnServerEvent:Connect(function(player, data)
	local race = activeRaces[data.raceId] or defaultRace
	local success, message = race:addPlayer(player, data.boatType, data.mode)
	JoinRaceEvent:FireClient(player, { success = success, message = message, raceId = race.id })
end)

LeaveRaceEvent.OnServerEvent:Connect(function(player, data)
	local race = activeRaces[data.raceId]
	if race then
		race:removePlayer(player)
	end
end)

BoatInputEvent.OnServerEvent:Connect(function(player, data)
	for _, race in pairs(activeRaces) do
		for _, p in ipairs(race.players) do
			if p.player == player then
				p.position = data.position or p.position
				break
			end
		end
	end
end)

SelectModeEvent.OnServerEvent:Connect(function(player, data)
	if not playerData[player.UserId] then
		playerData[player.UserId] = {}
	end
	playerData[player.UserId].mode = data.mode
end)

SelectBoatEvent.OnServerEvent:Connect(function(player, data)
	if not playerData[player.UserId] then
		playerData[player.UserId] = {}
	end
	playerData[player.UserId].boatType = data.boatType
end)

GetPlayerDataFunction.OnServerInvoke = function(player)
	return playerData[player.UserId] or { mode = "Kids", boatType = "Dinghy", level = 1, xp = 0 }
end

game:GetService("RunService").Heartbeat:Connect(function(dt)
	for _, race in pairs(activeRaces) do
		race:update(dt)
	end
end)

Players.PlayerRemoving:Connect(function(player)
	for _, race in pairs(activeRaces) do
		race:removePlayer(player)
	end
	playerData[player.UserId] = nil
end)

print("[YachtRaceSimulator] RaceManager initialized")
