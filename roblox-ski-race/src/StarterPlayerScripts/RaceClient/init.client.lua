-- StarterPlayerScripts
-- └─ RaceClient
--
-- サーバーからの RaceEvent を受信し
-- ScreenGui 上の HUD を更新するクライアント

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local raceRemotes =
	ReplicatedStorage:WaitForChild("RaceRemotes")

local raceEvent =
	raceRemotes:WaitForChild("RaceEvent")

--------------------------------------------------
-- 状態
--------------------------------------------------

local state = {
	phase = "Lobby",
	status = "Waiting",

	raceId = 0,
	startTime = 0,

	checkpointCurrent = 0,
	checkpointTotal = 0,

	finishPlace = nil,
	finishTime = nil,
	totalRacers = 0,

	rankings = {},

	lobbyCount = 0,
	lobbyMin = 2,
	lobbyMax = 8,

	lastSpeed = 0,
}

--------------------------------------------------
-- ScreenGui
--------------------------------------------------

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "RaceHUD"
screenGui.ResetOnSpawn = false
screenGui.IgnoreGuiInset = true
screenGui.ZIndexBehavior =
	Enum.ZIndexBehavior.Sibling
screenGui.Parent = playerGui

--------------------------------------------------
-- 色定義
--------------------------------------------------

local COLORS = {
	bg = Color3.fromRGB(0, 0, 0),
	bgTransparency = 0.4,

	text = Color3.fromRGB(255, 255, 255),
	accent = Color3.fromRGB(0, 170, 255),
	gold = Color3.fromRGB(255, 215, 0),
	silver = Color3.fromRGB(192, 192, 192),
	bronze = Color3.fromRGB(205, 127, 50),
	red = Color3.fromRGB(255, 70, 70),
	green = Color3.fromRGB(70, 255, 70),
	dimText = Color3.fromRGB(180, 180, 180),
}

--------------------------------------------------
-- UIユーティリティ
--------------------------------------------------

local function createFrame(props)
	local frame = Instance.new("Frame")
	frame.BackgroundColor3 =
		props.bg or COLORS.bg
	frame.BackgroundTransparency =
		props.bgTransparency
		or COLORS.bgTransparency
	frame.BorderSizePixel = 0
	frame.Size = props.size
		or UDim2.new(0, 200, 0, 40)
	frame.Position = props.position
		or UDim2.new(0, 0, 0, 0)
	frame.AnchorPoint = props.anchor
		or Vector2.new(0, 0)
	frame.Parent = props.parent
		or screenGui

	if props.corner then
		local corner =
			Instance.new("UICorner")
		corner.CornerRadius =
			UDim.new(0, props.corner)
		corner.Parent = frame
	end

	return frame
end

local function createLabel(props)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = props.size
		or UDim2.new(1, 0, 1, 0)
	label.Position = props.position
		or UDim2.new(0, 0, 0, 0)
	label.AnchorPoint = props.anchor
		or Vector2.new(0, 0)
	label.Font = props.font
		or Enum.Font.GothamBold
	label.TextSize = props.textSize or 18
	label.TextColor3 = props.color
		or COLORS.text
	label.TextXAlignment =
		props.alignX
		or Enum.TextXAlignment.Center
	label.TextYAlignment =
		props.alignY
		or Enum.TextYAlignment.Center
	label.Text = props.text or ""
	label.Parent = props.parent
		or screenGui

	return label
end

--------------------------------------------------
-- タイマー表示（上部中央）
--------------------------------------------------

local timerFrame = createFrame({
	size = UDim2.new(0, 260, 0, 70),
	position = UDim2.new(0.5, 0, 0, 20),
	anchor = Vector2.new(0.5, 0),
	corner = 8,
})

local timerLabel = createLabel({
	parent = timerFrame,
	size = UDim2.new(1, 0, 0, 42),
	position = UDim2.new(0, 0, 0, 4),
	textSize = 36,
	font = Enum.Font.Code,
	text = "00:00.000",
})

local timerSubLabel = createLabel({
	parent = timerFrame,
	size = UDim2.new(1, 0, 0, 20),
	position = UDim2.new(0, 0, 1, -24),
	textSize = 14,
	font = Enum.Font.Gotham,
	color = COLORS.dimText,
	text = "",
})

--------------------------------------------------
-- スピード表示（左下）
--------------------------------------------------

local speedFrame = createFrame({
	size = UDim2.new(0, 180, 0, 60),
	position = UDim2.new(0, 20, 1, -20),
	anchor = Vector2.new(0, 1),
	corner = 8,
})

local speedValueLabel = createLabel({
	parent = speedFrame,
	size = UDim2.new(0.65, 0, 1, 0),
	position = UDim2.new(0, 10, 0, 0),
	textSize = 32,
	font = Enum.Font.Code,
	alignX = Enum.TextXAlignment.Right,
	text = "0",
})

local speedUnitLabel = createLabel({
	parent = speedFrame,
	size = UDim2.new(0.3, 0, 1, 0),
	position = UDim2.new(0.7, 4, 0, 0),
	textSize = 14,
	font = Enum.Font.Gotham,
	color = COLORS.dimText,
	alignX = Enum.TextXAlignment.Left,
	text = "km/h",
})

--------------------------------------------------
-- チェックポイント（右上）
--------------------------------------------------

local checkpointFrame = createFrame({
	size = UDim2.new(0, 180, 0, 50),
	position = UDim2.new(1, -20, 0, 20),
	anchor = Vector2.new(1, 0),
	corner = 8,
})

local checkpointLabel = createLabel({
	parent = checkpointFrame,
	size = UDim2.new(1, 0, 0, 18),
	position = UDim2.new(0, 0, 0, 4),
	textSize = 12,
	font = Enum.Font.Gotham,
	color = COLORS.dimText,
	text = "CHECKPOINT",
})

local checkpointValueLabel = createLabel({
	parent = checkpointFrame,
	size = UDim2.new(1, 0, 0, 28),
	position = UDim2.new(0, 0, 1, -26),
	textSize = 22,
	font = Enum.Font.GothamBold,
	text = "0 / 0",
})

--------------------------------------------------
-- 順位表示（右）
--------------------------------------------------

local rankingsFrame = createFrame({
	size = UDim2.new(0, 220, 0, 240),
	position = UDim2.new(1, -20, 0, 80),
	anchor = Vector2.new(1, 0),
	corner = 8,
})

local rankingsTitle = createLabel({
	parent = rankingsFrame,
	size = UDim2.new(1, 0, 0, 24),
	position = UDim2.new(0, 0, 0, 4),
	textSize = 13,
	font = Enum.Font.GothamBold,
	color = COLORS.accent,
	text = "RANKINGS",
})

local MAX_RANKING_ROWS = 8
local rankingLabels = {}

for i = 1, MAX_RANKING_ROWS do
	local yOffset = 28 + (i - 1) * 25

	local row = createLabel({
		parent = rankingsFrame,
		size = UDim2.new(1, -16, 0, 22),
		position = UDim2.new(0, 8, 0, yOffset),
		textSize = 14,
		font = Enum.Font.Gotham,
		alignX = Enum.TextXAlignment.Left,
		text = "",
	})

	rankingLabels[i] = row
end

--------------------------------------------------
-- ロビー表示（中央）
--------------------------------------------------

local lobbyFrame = createFrame({
	size = UDim2.new(0, 320, 0, 100),
	position = UDim2.new(0.5, 0, 0.35, 0),
	anchor = Vector2.new(0.5, 0.5),
	corner = 12,
})

local lobbyTitleLabel = createLabel({
	parent = lobbyFrame,
	size = UDim2.new(1, 0, 0, 30),
	position = UDim2.new(0, 0, 0, 10),
	textSize = 20,
	font = Enum.Font.GothamBold,
	color = COLORS.accent,
	text = "SKI RACE",
})

local lobbyInfoLabel = createLabel({
	parent = lobbyFrame,
	size = UDim2.new(1, 0, 0, 24),
	position = UDim2.new(0, 0, 0, 42),
	textSize = 16,
	font = Enum.Font.Gotham,
	text = "",
})

local lobbyHintLabel = createLabel({
	parent = lobbyFrame,
	size = UDim2.new(1, 0, 0, 20),
	position = UDim2.new(0, 0, 1, -24),
	textSize = 12,
	font = Enum.Font.Gotham,
	color = COLORS.dimText,
	text = "JoinZone に入ってレースに参加",
})

--------------------------------------------------
-- 結果表示（中央）
--------------------------------------------------

local resultFrame = createFrame({
	size = UDim2.new(0, 360, 0, 140),
	position = UDim2.new(0.5, 0, 0.4, 0),
	anchor = Vector2.new(0.5, 0.5),
	corner = 12,
})

local resultTitleLabel = createLabel({
	parent = resultFrame,
	size = UDim2.new(1, 0, 0, 36),
	position = UDim2.new(0, 0, 0, 8),
	textSize = 28,
	font = Enum.Font.GothamBold,
	text = "",
})

local resultTimeLabel = createLabel({
	parent = resultFrame,
	size = UDim2.new(1, 0, 0, 30),
	position = UDim2.new(0, 0, 0, 50),
	textSize = 22,
	font = Enum.Font.Code,
	text = "",
})

local resultDetailLabel = createLabel({
	parent = resultFrame,
	size = UDim2.new(1, 0, 0, 24),
	position = UDim2.new(0, 0, 1, -32),
	textSize = 14,
	font = Enum.Font.Gotham,
	color = COLORS.dimText,
	text = "",
})

resultFrame.Visible = false

--------------------------------------------------
-- 時間フォーマット
--------------------------------------------------

local function formatTime(seconds)
	if not seconds or seconds < 0 then
		return "00:00.000"
	end

	local minutes = math.floor(seconds / 60)
	local secs = seconds - minutes * 60
	local whole = math.floor(secs)
	local ms = math.floor(
		(secs - whole) * 1000
	)

	return string.format(
		"%02d:%02d.%03d",
		minutes,
		whole,
		ms
	)
end

--------------------------------------------------
-- 順位色
--------------------------------------------------

local function placeColor(place)
	if place == 1 then
		return COLORS.gold
	elseif place == 2 then
		return COLORS.silver
	elseif place == 3 then
		return COLORS.bronze
	end

	return COLORS.text
end

--------------------------------------------------
-- 順位テキスト
--------------------------------------------------

local function placeText(place)
	if place == 1 then return "1st"
	elseif place == 2 then return "2nd"
	elseif place == 3 then return "3rd"
	end

	return tostring(place) .. "th"
end

--------------------------------------------------
-- 表示モード
--------------------------------------------------

local function showLobby()
	lobbyFrame.Visible = true
	timerFrame.Visible = false
	speedFrame.Visible = false
	checkpointFrame.Visible = false
	rankingsFrame.Visible = false
	resultFrame.Visible = false
end

local function showRacing()
	lobbyFrame.Visible = false
	timerFrame.Visible = true
	speedFrame.Visible = true
	checkpointFrame.Visible = true
	rankingsFrame.Visible = true
	resultFrame.Visible = false
end

local function showResult()
	resultFrame.Visible = true
	timerFrame.Visible = true
	rankingsFrame.Visible = true
	lobbyFrame.Visible = false
	speedFrame.Visible = false
	checkpointFrame.Visible = false
end

--------------------------------------------------
-- ランキング更新
--------------------------------------------------

local function updateRankingsDisplay()
	for i = 1, MAX_RANKING_ROWS do
		local entry = state.rankings[i]
		local label = rankingLabels[i]

		if not entry then
			label.Text = ""
			label.TextColor3 = COLORS.text
			continue
		end

		local prefix = placeText(entry.place)

		local suffix = ""

		if entry.finishTime then
			suffix = formatTime(entry.finishTime)
		elseif entry.status == "DNF" then
			suffix = "DNF"
		elseif entry.status == "Disqualified" then
			suffix = "DQ"
		else
			suffix = string.format(
				"CP %d",
				entry.checkpoint or 0
			)
		end

		local isMe =
			entry.userId == player.UserId

		label.Text = string.format(
			"%s  %s  %s",
			prefix,
			entry.name or "???",
			suffix
		)

		if entry.finishPlace then
			label.TextColor3 =
				placeColor(entry.finishPlace)
		elseif isMe then
			label.TextColor3 = COLORS.accent
		else
			label.TextColor3 = COLORS.text
		end

		if isMe then
			label.Font = Enum.Font.GothamBold
		else
			label.Font = Enum.Font.Gotham
		end
	end
end

--------------------------------------------------
-- イベントハンドラ
--------------------------------------------------

local handlers = {}

function handlers.LobbyStatus(data)
	state.phase = data.phase or "Lobby"
	state.lobbyCount = data.count or 0
	state.lobbyMin =
		data.minimumPlayers or 2
	state.lobbyMax =
		data.maximumPlayers or 8

	if state.status == "Waiting"
		or state.status == "Queued" then

		lobbyInfoLabel.Text = string.format(
			"参加者: %d / %d (最低%d人)",
			state.lobbyCount,
			state.lobbyMax,
			state.lobbyMin
		)
	end
end

function handlers.JoinedQueue()
	state.status = "Queued"
	lobbyHintLabel.Text =
		"参加登録済み - 開始を待っています..."
	lobbyHintLabel.TextColor3 = COLORS.green
end

function handlers.LeftQueue()
	state.status = "Waiting"
	lobbyHintLabel.Text =
		"JoinZone に入ってレースに参加"
	lobbyHintLabel.TextColor3 = COLORS.dimText
end

function handlers.QueueFull()
	lobbyHintLabel.Text =
		"レースは満員です"
	lobbyHintLabel.TextColor3 = COLORS.red
end

function handlers.RaceStarted(data)
	state.phase = "Racing"
	state.status = "Racing"
	state.raceId = data.raceId or 0
	state.startTime = data.startTime or 0
	state.checkpointCurrent = 0
	state.checkpointTotal =
		data.checkpointCount or 0
	state.finishPlace = nil
	state.finishTime = nil
	state.totalRacers = data.racers or 0
	state.rankings = {}

	checkpointValueLabel.Text = string.format(
		"0 / %d",
		state.checkpointTotal
	)

	timerSubLabel.Text = string.format(
		"レーサー: %d",
		state.totalRacers
	)

	showRacing()
end

function handlers.Checkpoint(data)
	state.checkpointCurrent =
		data.current or 0
	state.checkpointTotal =
		data.total or state.checkpointTotal

	checkpointValueLabel.Text = string.format(
		"%d / %d",
		state.checkpointCurrent,
		state.checkpointTotal
	)

	checkpointValueLabel.TextColor3 =
		COLORS.green

	task.delay(0.5, function()
		checkpointValueLabel.TextColor3 =
			COLORS.text
	end)
end

function handlers.Rankings(data)
	if data.raceId ~= state.raceId then
		return
	end

	state.rankings = data.entries or {}
	updateRankingsDisplay()
end

function handlers.Finished(data)
	state.status = "Finished"
	state.finishPlace = data.place
	state.finishTime = data.time
	state.totalRacers =
		data.totalRacers
		or state.totalRacers

	resultTitleLabel.Text = string.format(
		"%s PLACE!",
		string.upper(
			placeText(data.place)
		)
	)

	resultTitleLabel.TextColor3 =
		placeColor(data.place)

	resultTimeLabel.Text =
		formatTime(data.time)

	resultDetailLabel.Text = string.format(
		"%d人中 %d位",
		state.totalRacers,
		data.place
	)

	showResult()
end

function handlers.Disqualified(data)
	state.status = "Disqualified"

	resultTitleLabel.Text = "DISQUALIFIED"
	resultTitleLabel.TextColor3 = COLORS.red

	resultTimeLabel.Text = string.format(
		"チェックポイント %d を通過していません",
		data.missingCheckpoint or 0
	)

	resultDetailLabel.Text = ""

	showResult()
end

function handlers.DNF(data)
	state.status = "DNF"

	resultTitleLabel.Text = "DNF"
	resultTitleLabel.TextColor3 = COLORS.red

	local reason = data.reason or ""

	if reason == "TimeOut" then
		resultTimeLabel.Text =
			"制限時間を超過しました"
	elseif reason == "CharacterReset" then
		resultTimeLabel.Text =
			"キャラクターがリセットされました"
	else
		resultTimeLabel.Text = reason
	end

	resultDetailLabel.Text = ""

	showResult()
end

function handlers.RaceComplete()
	state.phase = "Results"
end

function handlers.RaceReset()
	state.phase = "Lobby"
	state.status = "Waiting"
	state.raceId = 0
	state.startTime = 0
	state.finishPlace = nil
	state.finishTime = nil
	state.rankings = {}

	lobbyHintLabel.Text =
		"JoinZone に入ってレースに参加"
	lobbyHintLabel.TextColor3 = COLORS.dimText

	showLobby()
end

raceEvent.OnClientEvent:Connect(
	function(eventName, data)
		local handler = handlers[eventName]

		if handler then
			handler(data)
		end
	end
)

--------------------------------------------------
-- 毎フレーム更新
--------------------------------------------------

local previousPosition = nil

RunService.RenderStepped:Connect(function()
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

	-- スピード計算
	local currentPosition =
		rootPart.Position

	if previousPosition then
		local velocity =
			rootPart.AssemblyLinearVelocity

		local horizontalSpeed =
			Vector3.new(
				velocity.X,
				0,
				velocity.Z
			).Magnitude

		local totalSpeed =
			velocity.Magnitude

		local displaySpeed =
			math.max(
				horizontalSpeed,
				totalSpeed * 0.9
			)

		local kmh = displaySpeed * 0.28

		state.lastSpeed =
			state.lastSpeed * 0.8
			+ kmh * 0.2

		speedValueLabel.Text =
			tostring(
				math.floor(state.lastSpeed)
			)
	end

	previousPosition = currentPosition

	-- タイマー更新
	if state.status == "Racing"
		and state.startTime > 0 then

		local elapsed =
			Workspace:GetServerTimeNow()
		- state.startTime

		timerLabel.Text =
			formatTime(elapsed)

	elseif state.finishTime then
		timerLabel.Text =
			formatTime(state.finishTime)
	end
end)

--------------------------------------------------
-- 初期表示
--------------------------------------------------

showLobby()
