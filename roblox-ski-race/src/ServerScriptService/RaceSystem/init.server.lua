-- ServerScriptService
-- └─ RaceSystem
--
-- スキー操作には一切触れない複数人レース
--
-- ・JoinZoneに2人以上入ると同時スタート
-- ・カウントダウン後にスタート位置へテレポート
-- ・キャラクターを移動しない（テレポート以外）
-- ・Anchoredを変更しない
-- ・WalkSpeedを変更しない
-- ・NetworkOwnerを変更しない
-- ・共通サーバー時刻から計測
-- ・リアルタイム順位
-- ・Finish通過順で最終順位
-- ・結果表示後に自動で次のラウンドへ

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local CONFIG = {
	MinimumPlayers = 2,
	MaximumPlayers = 20,

	CheckInterval = 0.03,
	RankingInterval = 0.25,

	MaxRaceTime = 300,
	ResultsDuration = 8,

	CountdownSeconds = 3,

	LobbyWaitAfterMinimum = 5,

	StartSpacing = 4,

	AutoNextRound = true,

	Debug = true,
}

--------------------------------------------------
-- コース
--------------------------------------------------

local raceCourse =
	Workspace:WaitForChild("RaceCourse")

local joinZone =
	raceCourse:WaitForChild("JoinZone")

local finishPart =
	raceCourse:WaitForChild("Finish")

local checkpointsFolder =
	raceCourse:WaitForChild("Checkpoints")

local startPart =
	raceCourse:FindFirstChild("Start")

--------------------------------------------------
-- RemoteEvent
--------------------------------------------------

local raceRemotes =
	ReplicatedStorage:FindFirstChild("RaceRemotes")

if not raceRemotes then
	raceRemotes = Instance.new("Folder")
	raceRemotes.Name = "RaceRemotes"
	raceRemotes.Parent = ReplicatedStorage
end

local raceEvent =
	raceRemotes:FindFirstChild("RaceEvent")

if not raceEvent then
	raceEvent = Instance.new("RemoteEvent")
	raceEvent.Name = "RaceEvent"
	raceEvent.Parent = raceRemotes
end

--------------------------------------------------
-- 判定Part設定
--------------------------------------------------

local function configureTrigger(part)
	if not part:IsA("BasePart") then
		return
	end

	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = false
end

configureTrigger(joinZone)
configureTrigger(finishPart)

--------------------------------------------------
-- チェックポイント
--------------------------------------------------

local function getCheckpoints()
	local result = {}

	for _, object in ipairs(
		checkpointsFolder:GetChildren()
		) do
		if object:IsA("BasePart")
			and tonumber(object.Name) then

			configureTrigger(object)
			table.insert(result, object)
		end
	end

	table.sort(result, function(a, b)
		return tonumber(a.Name)
			< tonumber(b.Name)
	end)

	return result
end

local checkpoints = getCheckpoints()

checkpointsFolder.ChildAdded:Connect(function()
	task.wait()
	checkpoints = getCheckpoints()
end)

checkpointsFolder.ChildRemoved:Connect(function()
	checkpoints = getCheckpoints()
end)

--------------------------------------------------
-- プレイヤー状態
--------------------------------------------------

local playerStates = {}

local function createPlayerState()
	return {
		status = "Waiting",

		queued = false,
		raceId = 0,

		startTime = 0,
		finishTime = nil,
		finishPlace = nil,

		nextCheckpoint = 1,

		insideJoinZone = false,
		insideCheckpoint = false,
		insideFinish = false,

		lastPosition = nil,

		diedConnection = nil,
		characterConnection = nil,
	}
end

--------------------------------------------------
-- レース状態
--------------------------------------------------

local race = {
	id = 0,
	phase = "Lobby",

	queuedPlayers = {},
	racers = {},

	startTime = 0,
	finishCount = 0,

	lobbyTimerStarted = false,
	lobbyTimerTime = 0,
}

--------------------------------------------------
-- キャラクター
--------------------------------------------------

local function getRootPart(player)
	local character = player.Character

	if not character then
		return nil
	end

	return character:FindFirstChild(
		"HumanoidRootPart"
	)
end

local function getHumanoid(player)
	local character = player.Character

	if not character then
		return nil
	end

	return character:FindFirstChildOfClass(
		"Humanoid"
	)
end

local function setStatus(player, status)
	local state = playerStates[player]

	if state then
		state.status = status
	end

	local character = player.Character

	if character then
		character:SetAttribute(
			"RaceStatus",
			status
		)
	end
end

--------------------------------------------------
-- 配列処理
--------------------------------------------------

local function containsPlayer(array, player)
	for _, entry in ipairs(array) do
		if entry == player then
			return true
		end
	end

	return false
end

local function removePlayer(array, player)
	for index = #array, 1, -1 do
		if array[index] == player then
			table.remove(array, index)
		end
	end
end

--------------------------------------------------
-- Part内部判定
--------------------------------------------------

local function isPointInsidePart(
	part,
	worldPosition
)
	local localPosition =
		part.CFrame:PointToObjectSpace(
			worldPosition
		)

	local halfSize =
		part.Size * 0.5

	return math.abs(localPosition.X) <= halfSize.X
		and math.abs(localPosition.Y) <= halfSize.Y
		and math.abs(localPosition.Z) <= halfSize.Z
end

--------------------------------------------------
-- 高速通過判定
--------------------------------------------------

local function segmentIntersectsPart(
	part,
	startPosition,
	endPosition
)
	if isPointInsidePart(part, startPosition)
		or isPointInsidePart(part, endPosition) then

		return true
	end

	local localStart =
		part.CFrame:PointToObjectSpace(
			startPosition
		)

	local localEnd =
		part.CFrame:PointToObjectSpace(
			endPosition
		)

	local direction =
		localEnd - localStart

	local halfSize =
		part.Size * 0.5

	local minimumTime = 0
	local maximumTime = 1

	local function checkAxis(
		startValue,
		directionValue,
		minimumValue,
		maximumValue
	)
		if math.abs(directionValue) < 0.000001 then
			return startValue >= minimumValue
				and startValue <= maximumValue
		end

		local time1 =
			(minimumValue - startValue)
			/ directionValue

		local time2 =
			(maximumValue - startValue)
			/ directionValue

		if time1 > time2 then
			time1, time2 = time2, time1
		end

		minimumTime =
			math.max(minimumTime, time1)

		maximumTime =
			math.min(maximumTime, time2)

		return minimumTime <= maximumTime
	end

	if not checkAxis(
		localStart.X,
		direction.X,
		-halfSize.X,
		halfSize.X
		) then
		return false
	end

	if not checkAxis(
		localStart.Y,
		direction.Y,
		-halfSize.Y,
		halfSize.Y
		) then
		return false
	end

	if not checkAxis(
		localStart.Z,
		direction.Z,
		-halfSize.Z,
		halfSize.Z
		) then
		return false
	end

	return true
end

local function crossedPart(
	part,
	previousPosition,
	currentPosition
)
	if isPointInsidePart(part, currentPosition) then
		return true
	end

	if not previousPosition then
		return false
	end

	return segmentIntersectsPart(
		part,
		previousPosition,
		currentPosition
	)
end

--------------------------------------------------
-- 有効参加者
--------------------------------------------------

local function getValidQueuedPlayers()
	local result = {}

	for _, player in ipairs(
		race.queuedPlayers
		) do
		local state = playerStates[player]
		local rootPart = getRootPart(player)
		local humanoid = getHumanoid(player)

		if player.Parent
			and state
			and state.queued
			and rootPart
			and humanoid
			and humanoid.Health > 0 then

			table.insert(result, player)
		end
	end

	return result
end

--------------------------------------------------
-- スタート位置計算
--------------------------------------------------

local function getStartPositions(count)
	local positions = {}

	if not startPart then
		return positions
	end

	local startCFrame = startPart.CFrame
	local rightVector = startCFrame.RightVector

	local totalWidth =
		(count - 1) * CONFIG.StartSpacing

	local startOffset =
		-totalWidth / 2

	for i = 1, count do
		local offset =
			startOffset
			+ (i - 1) * CONFIG.StartSpacing

		local position =
			startCFrame.Position
			+ rightVector * offset
			+ Vector3.new(0, 3, 0)

		table.insert(
			positions,
			CFrame.new(
				position,
				position
					+ startCFrame.LookVector
			)
		)
	end

	return positions
end

--------------------------------------------------
-- テレポート
--------------------------------------------------

local function teleportToStart(
	player,
	targetCFrame
)
	local character = player.Character

	if not character then
		return
	end

	local rootPart =
		character:FindFirstChild(
			"HumanoidRootPart"
		)

	if not rootPart then
		return
	end

	rootPart.AssemblyLinearVelocity =
		Vector3.zero

	rootPart.AssemblyAngularVelocity =
		Vector3.zero

	rootPart.CFrame = targetCFrame
end

--------------------------------------------------
-- ロビー情報
--------------------------------------------------

local function broadcastLobby()
	race.queuedPlayers =
		getValidQueuedPlayers()

	local remaining = 0

	if race.lobbyTimerStarted then
		remaining = math.max(
			0,
			CONFIG.LobbyWaitAfterMinimum
			- (
				Workspace:GetServerTimeNow()
				- race.lobbyTimerTime
			)
		)
	end

	raceEvent:FireAllClients(
		"LobbyStatus",
		{
			count = #race.queuedPlayers,
			minimumPlayers =
				CONFIG.MinimumPlayers,
			maximumPlayers =
				CONFIG.MaximumPlayers,
			phase = race.phase,
			countdown = math.ceil(remaining),
		}
	)
end

--------------------------------------------------
-- 参加
--------------------------------------------------

local function joinQueue(player)
	local state = playerStates[player]

	if not state
		or state.queued
		or race.phase ~= "Lobby" then

		return
	end

	if #race.queuedPlayers
		>= CONFIG.MaximumPlayers then

		raceEvent:FireClient(
			player,
			"QueueFull",
			{}
		)

		return
	end

	state.queued = true

	if not containsPlayer(
		race.queuedPlayers,
		player
		) then
		table.insert(
			race.queuedPlayers,
			player
		)
	end

	setStatus(player, "Queued")

	raceEvent:FireClient(
		player,
		"JoinedQueue",
		{}
	)

	broadcastLobby()
end

--------------------------------------------------
-- 参加解除
--------------------------------------------------

local function leaveQueue(player)
	local state = playerStates[player]

	if not state or not state.queued then
		return
	end

	state.queued = false

	removePlayer(
		race.queuedPlayers,
		player
	)

	setStatus(player, "Waiting")

	raceEvent:FireClient(
		player,
		"LeftQueue",
		{}
	)

	local validPlayers =
		getValidQueuedPlayers()

	if #validPlayers
		< CONFIG.MinimumPlayers then

		race.lobbyTimerStarted = false
	end

	broadcastLobby()
end

--------------------------------------------------
-- カウントダウン＋レース開始
--------------------------------------------------

local function startCountdownAndRace()
	if race.phase ~= "Lobby" then
		return
	end

	local validPlayers =
		getValidQueuedPlayers()

	if #validPlayers
		< CONFIG.MinimumPlayers then

		return
	end

	race.phase = "Countdown"

	local racerCount =
		math.min(
			#validPlayers,
			CONFIG.MaximumPlayers
		)

	local racerList = {}

	for index = 1, racerCount do
		table.insert(
			racerList,
			validPlayers[index]
		)
	end

	local startPositions =
		getStartPositions(racerCount)

	if startPart and #startPositions > 0 then
		for index, racer in ipairs(racerList) do
			teleportToStart(
				racer,
				startPositions[index]
			)
		end
	end

	raceEvent:FireAllClients(
		"Countdown",
		{
			seconds = CONFIG.CountdownSeconds,
			racerCount = racerCount,
		}
	)

	for remaining =
		CONFIG.CountdownSeconds, 1, -1 do

		raceEvent:FireAllClients(
			"CountdownTick",
			{
				remaining = remaining,
			}
		)

		task.wait(1)
	end

	if race.phase ~= "Countdown" then
		return
	end

	race.id += 1
	race.phase = "Racing"
	race.finishCount = 0
	race.racers = {}
	race.lobbyTimerStarted = false

	race.startTime =
		Workspace:GetServerTimeNow()

	for _, player in ipairs(racerList) do
		local state =
			playerStates[player]

		local rootPart =
			getRootPart(player)

		if state and rootPart then
			state.queued = false
			state.raceId = race.id

			state.startTime =
				race.startTime

			state.finishTime = nil
			state.finishPlace = nil

			state.nextCheckpoint = 1

			state.insideCheckpoint = false
			state.insideFinish = false

			state.lastPosition =
				rootPart.Position

			setStatus(player, "Racing")

			table.insert(
				race.racers,
				player
			)
		end
	end

	race.queuedPlayers = {}

	raceEvent:FireAllClients(
		"RaceStarted",
		{
			raceId = race.id,
			startTime = race.startTime,
			racers = #race.racers,
			checkpointCount = #checkpoints,
		}
	)

	if CONFIG.Debug then
		print(
			"RACE START",
			race.id,
			#race.racers
		)
	end

	broadcastLobby()
end

--------------------------------------------------
-- チェックポイント
--------------------------------------------------

local function passCheckpoint(
	player,
	checkpointNumber
)
	local state = playerStates[player]

	if not state
		or state.status ~= "Racing"
		or state.raceId ~= race.id then

		return
	end

	if checkpointNumber
		~= state.nextCheckpoint then

		return
	end

	state.nextCheckpoint += 1

	raceEvent:FireClient(
		player,
		"Checkpoint",
		{
			current = checkpointNumber,
			total = #checkpoints,
		}
	)
end

local function updateCheckpoint(
	player,
	state,
	previousPosition,
	currentPosition
)
	local checkpoint =
		checkpoints[state.nextCheckpoint]

	if not checkpoint then
		state.insideCheckpoint = false
		return
	end

	local currentlyInside =
		isPointInsidePart(
			checkpoint,
			currentPosition
		)

	local crossed =
		crossedPart(
			checkpoint,
			previousPosition,
			currentPosition
		)

	if crossed
		and not state.insideCheckpoint then

		passCheckpoint(
			player,
			state.nextCheckpoint
		)
	end

	state.insideCheckpoint =
		currentlyInside
end

--------------------------------------------------
-- 進行度
--------------------------------------------------

local function calculateProgress(player)
	local state = playerStates[player]
	local rootPart = getRootPart(player)

	if not state or not rootPart then
		return -math.huge
	end

	if state.finishPlace then
		return 100000000
		- state.finishPlace
	end

	if state.status == "DNF"
		or state.status == "Disqualified" then

		return -100000000
	end

	local passed =
		state.nextCheckpoint - 1

	local target =
		checkpoints[state.nextCheckpoint]
		or finishPart

	local distance =
		(rootPart.Position
			- target.Position).Magnitude

	return passed * 100000
	- distance
end

--------------------------------------------------
-- 順位送信
--------------------------------------------------

local function broadcastRankings()
	if race.phase ~= "Racing"
		and race.phase ~= "Results" then

		return
	end

	local entries = {}

	for _, player in ipairs(race.racers) do
		local state = playerStates[player]

		if state
			and state.raceId == race.id then

			table.insert(
				entries,
				{
					player = player,
					progress =
						calculateProgress(player),
					finishPlace =
						state.finishPlace,
					finishTime =
						state.finishTime,
					status =
						state.status,
					checkpoint =
						state.nextCheckpoint - 1,
				}
			)
		end
	end

	table.sort(entries, function(a, b)
		if a.finishPlace and b.finishPlace then
			return a.finishPlace
				< b.finishPlace
		end

		if a.finishPlace then
			return true
		end

		if b.finishPlace then
			return false
		end

		return a.progress > b.progress
	end)

	local payload = {}

	for place, entry in ipairs(entries) do
		table.insert(
			payload,
			{
				userId =
					entry.player.UserId,
				name =
					entry.player.DisplayName,
				place = place,
				finishPlace =
					entry.finishPlace,
				finishTime =
					entry.finishTime,
				status =
					entry.status,
				checkpoint =
					entry.checkpoint,
			}
		)
	end

	raceEvent:FireAllClients(
		"Rankings",
		{
			raceId = race.id,
			entries = payload,
		}
	)
end

--------------------------------------------------
-- ゴール
--------------------------------------------------

local function finishPlayer(player)
	local state = playerStates[player]

	if not state
		or state.status ~= "Racing"
		or state.raceId ~= race.id then

		return
	end

	race.finishCount += 1

	state.finishPlace =
		race.finishCount

	state.finishTime =
		Workspace:GetServerTimeNow()
	- race.startTime

	setStatus(player, "Finished")

	raceEvent:FireClient(
		player,
		"Finished",
		{
			place = state.finishPlace,
			time = state.finishTime,
			totalRacers = #race.racers,
		}
	)

	broadcastRankings()
end

--------------------------------------------------
-- 失格
--------------------------------------------------

local function disqualifyPlayer(player)
	local state = playerStates[player]

	if not state
		or state.status ~= "Racing" then

		return
	end

	setStatus(player, "Disqualified")

	raceEvent:FireClient(
		player,
		"Disqualified",
		{
			missingCheckpoint =
				state.nextCheckpoint,
		}
	)

	broadcastRankings()
end

--------------------------------------------------
-- DNF
--------------------------------------------------

local function markDNF(player, reason)
	local state = playerStates[player]

	if not state
		or state.status ~= "Racing" then

		return
	end

	setStatus(player, "DNF")

	raceEvent:FireClient(
		player,
		"DNF",
		{
			reason = reason,
		}
	)

	broadcastRankings()
end

--------------------------------------------------
-- ラウンドリセット
--------------------------------------------------

local function resetToLobby()
	if race.phase ~= "Results" then
		return
	end

	for _, player in ipairs(
		race.racers
		) do
		local state =
			playerStates[player]

		if state then
			state.status = "Waiting"
			state.queued = false
			state.raceId = 0
			state.startTime = 0
			state.finishTime = nil
			state.finishPlace = nil
			state.nextCheckpoint = 1

			setStatus(
				player,
				"Waiting"
			)

			raceEvent:FireClient(
				player,
				"RaceReset",
				{}
			)
		end
	end

	race.phase = "Lobby"
	race.racers = {}
	race.startTime = 0
	race.finishCount = 0
	race.lobbyTimerStarted = false

	broadcastLobby()
end

--------------------------------------------------
-- レース終了
--------------------------------------------------

local function checkRaceComplete()
	if race.phase ~= "Racing" then
		return
	end

	local activeCount = 0

	for _, player in ipairs(race.racers) do
		local state = playerStates[player]

		if state
			and state.status == "Racing" then

			activeCount += 1
		end
	end

	if activeCount > 0 then
		return
	end

	race.phase = "Results"

	broadcastRankings()

	raceEvent:FireAllClients(
		"RaceComplete",
		{
			raceId = race.id,
		}
	)

	task.delay(
		CONFIG.ResultsDuration,
		resetToLobby
	)
end

--------------------------------------------------
-- プレイヤー更新
--------------------------------------------------

local function updatePlayer(player)
	local state = playerStates[player]

	if not state then
		return
	end

	local rootPart = getRootPart(player)

	if not rootPart then
		return
	end

	local currentPosition =
		rootPart.Position

	local previousPosition =
		state.lastPosition

	--------------------------------------------------
	-- ロビー
	--------------------------------------------------

	if race.phase == "Lobby"
		and state.status ~= "Racing" then

		local currentlyInside =
			isPointInsidePart(
				joinZone,
				currentPosition
			)

		if currentlyInside
			and not state.insideJoinZone then

			joinQueue(player)

		elseif not currentlyInside
			and state.insideJoinZone
			and state.queued then

			leaveQueue(player)
		end

		state.insideJoinZone =
			currentlyInside
	end

	--------------------------------------------------
	-- レース中
	--------------------------------------------------

	if state.status == "Racing"
		and state.raceId == race.id then

		local elapsed =
			Workspace:GetServerTimeNow()
		- race.startTime

		if elapsed >= CONFIG.MaxRaceTime then
			markDNF(
				player,
				"TimeOut"
			)

			state.lastPosition =
				currentPosition

			return
		end

		updateCheckpoint(
			player,
			state,
			previousPosition,
			currentPosition
		)

		local currentlyInsideFinish =
			isPointInsidePart(
				finishPart,
				currentPosition
			)

		local crossedFinish =
			crossedPart(
				finishPart,
				previousPosition,
				currentPosition
			)

		if crossedFinish
			and not state.insideFinish then

			if state.nextCheckpoint
				> #checkpoints then

				finishPlayer(player)
			else
				disqualifyPlayer(player)
			end
		end

		state.insideFinish =
			currentlyInsideFinish
	end

	state.lastPosition =
		currentPosition
end

--------------------------------------------------
-- キャラクター設定
--------------------------------------------------

local function setupCharacter(
	player,
	character
)
	local state = playerStates[player]

	if not state then
		return
	end

	if state.diedConnection then
		state.diedConnection:Disconnect()
		state.diedConnection = nil
	end

	local humanoid =
		character:WaitForChild(
			"Humanoid",
			10
		)

	local rootPart =
		character:WaitForChild(
			"HumanoidRootPart",
			10
		)

	if not humanoid or not rootPart then
		return
	end

	state.lastPosition =
		rootPart.Position

	state.diedConnection =
		humanoid.Died:Connect(function()
			if state.queued then
				leaveQueue(player)
			end

			markDNF(
				player,
				"CharacterReset"
			)
		end)

	if state.status ~= "Racing" then
		setStatus(player, "Waiting")
	end
end

--------------------------------------------------
-- プレイヤー登録
--------------------------------------------------

local function setupPlayer(player)
	local state = createPlayerState()

	playerStates[player] = state

	state.characterConnection =
		player.CharacterAdded:Connect(
			function(character)
				setupCharacter(
					player,
					character
				)
			end
		)

	if player.Character then
		task.spawn(
			setupCharacter,
			player,
			player.Character
		)
	end
end

for _, player in ipairs(
	Players:GetPlayers()
	) do
	setupPlayer(player)
end

Players.PlayerAdded:Connect(
	setupPlayer
)

Players.PlayerRemoving:Connect(function(player)
	local state = playerStates[player]

	removePlayer(
		race.queuedPlayers,
		player
	)

	if state
		and state.status == "Racing" then

		setStatus(player, "DNF")
	end

	if state then
		if state.characterConnection then
			state.characterConnection:
				Disconnect()
		end

		if state.diedConnection then
			state.diedConnection:
				Disconnect()
		end
	end

	playerStates[player] = nil

	local validPlayers =
		getValidQueuedPlayers()

	if #validPlayers
		< CONFIG.MinimumPlayers then

		race.lobbyTimerStarted = false
	end

	broadcastLobby()
	checkRaceComplete()
end)

--------------------------------------------------
-- メインループ
--------------------------------------------------

local updateAccumulator = 0
local rankingAccumulator = 0

RunService.Heartbeat:Connect(function(deltaTime)
	updateAccumulator += deltaTime
	rankingAccumulator += deltaTime

	if updateAccumulator
		>= CONFIG.CheckInterval then

		updateAccumulator = 0

		for _, player in ipairs(
			Players:GetPlayers()
			) do
			updatePlayer(player)
		end

		if race.phase == "Lobby" then
			local validPlayers =
				getValidQueuedPlayers()

			if #validPlayers
				>= CONFIG.MinimumPlayers then

				if not race.lobbyTimerStarted then
					race.lobbyTimerStarted = true
					race.lobbyTimerTime =
						Workspace:GetServerTimeNow()
				end

				local elapsed =
					Workspace:GetServerTimeNow()
					- race.lobbyTimerTime

				if elapsed
					>= CONFIG.LobbyWaitAfterMinimum then

					task.spawn(
						startCountdownAndRace
					)
				end
			else
				race.lobbyTimerStarted = false
			end

		elseif race.phase == "Racing" then
			checkRaceComplete()
		end
	end

	if rankingAccumulator
		>= CONFIG.RankingInterval then

		rankingAccumulator = 0
		broadcastRankings()
	end
end)

broadcastLobby()
