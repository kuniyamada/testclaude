-- StarterPlayerScripts
-- └─ RaceUI
--
-- 複数人レース用の最小UI
-- カウントダウン・ロビー待機タイマー対応

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local raceEvent =
	ReplicatedStorage:
	WaitForChild("RaceRemotes"):
	WaitForChild("RaceEvent")

--------------------------------------------------
-- 古いUI削除
--------------------------------------------------

local oldGui =
	playerGui:FindFirstChild(
		"RaceUI"
	)

if oldGui then
	oldGui:Destroy()
end

--------------------------------------------------
-- UI作成
--------------------------------------------------

local screenGui =
	Instance.new("ScreenGui")

screenGui.Name = "RaceUI"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local frame =
	Instance.new("Frame")

frame.AnchorPoint =
	Vector2.new(0.5, 0)

frame.Position =
	UDim2.fromScale(0.5, 0.03)

frame.Size =
	UDim2.fromOffset(430, 145)

frame.BackgroundColor3 =
	Color3.fromRGB(15, 20, 30)

frame.BackgroundTransparency = 0.15
frame.BorderSizePixel = 0
frame.Parent = screenGui

local corner =
	Instance.new("UICorner")

corner.CornerRadius =
	UDim.new(0, 14)

corner.Parent = frame

local timerLabel =
	Instance.new("TextLabel")

timerLabel.BackgroundTransparency = 1
timerLabel.Position =
	UDim2.fromOffset(10, 5)

timerLabel.Size =
	UDim2.new(1, -20, 0, 55)

timerLabel.Font =
	Enum.Font.GothamBold

timerLabel.TextColor3 =
	Color3.fromRGB(255, 255, 255)

timerLabel.TextScaled = true
timerLabel.Text = "00:00.000"
timerLabel.Parent = frame

local statusLabel =
	Instance.new("TextLabel")

statusLabel.BackgroundTransparency = 1
statusLabel.Position =
	UDim2.fromOffset(10, 65)

statusLabel.Size =
	UDim2.new(1, -20, 0, 34)

statusLabel.Font =
	Enum.Font.GothamMedium

statusLabel.TextColor3 =
	Color3.fromRGB(220, 235, 255)

statusLabel.TextScaled = true
statusLabel.Text =
	"JoinZoneへ入ってください"

statusLabel.Parent = frame

local positionLabel =
	Instance.new("TextLabel")

positionLabel.BackgroundTransparency = 1
positionLabel.Position =
	UDim2.fromOffset(10, 103)

positionLabel.Size =
	UDim2.new(1, -20, 0, 30)

positionLabel.Font =
	Enum.Font.GothamBold

positionLabel.TextColor3 =
	Color3.fromRGB(255, 220, 80)

positionLabel.TextScaled = true
positionLabel.Text = ""
positionLabel.Parent = frame

local resultLabel =
	Instance.new("TextLabel")

resultLabel.AnchorPoint =
	Vector2.new(0.5, 0.5)

resultLabel.Position =
	UDim2.fromScale(0.5, 0.43)

resultLabel.Size =
	UDim2.fromOffset(700, 220)

resultLabel.BackgroundTransparency = 1
resultLabel.Font = Enum.Font.GothamBlack

resultLabel.TextColor3 =
	Color3.fromRGB(255, 255, 255)

resultLabel.TextStrokeTransparency = 0.2
resultLabel.TextScaled = true
resultLabel.Text = ""
resultLabel.Visible = false
resultLabel.Parent = screenGui

--------------------------------------------------
-- 状態
--------------------------------------------------

local racing = false
local startTime = 0

--------------------------------------------------
-- 時間
--------------------------------------------------

local function formatTime(seconds)
	seconds = math.max(seconds, 0)

	local minutes =
		math.floor(seconds / 60)

	local remainder =
		seconds - minutes * 60

	return string.format(
		"%02d:%06.3f",
		minutes,
		remainder
	)
end

local function ordinal(place)
	if place == 1 then
		return "1位"
	elseif place == 2 then
		return "2位"
	elseif place == 3 then
		return "3位"
	end

	return tostring(place) .. "位"
end

--------------------------------------------------
-- イベント
--------------------------------------------------

raceEvent.OnClientEvent:Connect(
	function(action, data)
		data = data or {}

		if action == "LobbyStatus" then
			if racing then
				return
			end

			local countdownText = ""

			if (data.countdown or 0) > 0 then
				countdownText =
					"  ("
					.. tostring(data.countdown)
					.. "秒後に開始)"
			end

			statusLabel.Text =
				"参加者 "
				.. tostring(data.count or 0)
				.. " / "
				.. tostring(
					data.minimumPlayers or 2
				)
				.. "人以上で開始"
				.. countdownText

		elseif action == "JoinedQueue" then
			statusLabel.Text =
				"参加登録済み・他の選手を待っています"

		elseif action == "LeftQueue" then
			statusLabel.Text =
				"参加をキャンセルしました"

		elseif action == "QueueFull" then
			statusLabel.Text =
				"レースは満員です"

		elseif action == "Countdown" then
			racing = false

			timerLabel.Text =
				"00:00.000"

			statusLabel.Text =
				"スタート準備中..."

			positionLabel.Text =
				tostring(
					data.racerCount or 0
				) .. "人参加"

			resultLabel.Visible = false

		elseif action == "CountdownTick" then
			local remaining =
				data.remaining or 0

			resultLabel.Text =
				tostring(remaining)

			resultLabel.TextColor3 =
				Color3.fromRGB(
					255,
					255,
					80
				)

			resultLabel.Visible = true

			statusLabel.Text =
				tostring(remaining)
				.. "秒後にスタート"

		elseif action == "RaceStarted" then
			racing = true
			startTime =
				data.startTime or 0

			timerLabel.Text =
				"00:00.000"

			statusLabel.Text =
				"レース中"

			positionLabel.Text = ""

			resultLabel.Text =
				"GO!"

			resultLabel.TextColor3 =
				Color3.fromRGB(
					80,
					255,
					140
				)

			resultLabel.Visible = true

			task.delay(0.8, function()
				if racing then
					resultLabel.Visible =
						false
				end
			end)

		elseif action == "Checkpoint" then
			statusLabel.Text =
				"チェックポイント "
				.. tostring(data.current)
				.. " / "
				.. tostring(data.total)

		elseif action == "Rankings" then
			local entries =
				data.entries or {}

			for _, entry in ipairs(entries) do
				if entry.userId
					== player.UserId then

					positionLabel.Text =
						"現在 "
						.. ordinal(entry.place)
						.. " / "
						.. tostring(#entries)
				end
			end

		elseif action == "Finished" then
			racing = false

			timerLabel.Text =
				formatTime(data.time)

			statusLabel.Text =
				ordinal(data.place)
				.. "でゴール"

			resultLabel.Text =
				ordinal(data.place)
				.. "\n"
				.. formatTime(data.time)

			resultLabel.TextColor3 =
				Color3.fromRGB(
					80,
					255,
					140
				)

			resultLabel.Visible = true

		elseif action == "Disqualified" then
			racing = false

			statusLabel.Text =
				"チェックポイント未通過"

			resultLabel.Text =
				"失格"

			resultLabel.TextColor3 =
				Color3.fromRGB(
					255,
					80,
					80
				)

			resultLabel.Visible = true

		elseif action == "DNF" then
			racing = false

			statusLabel.Text = "DNF"

			resultLabel.Text =
				"DNF"

			resultLabel.TextColor3 =
				Color3.fromRGB(
					255,
					170,
					60
				)

			resultLabel.Visible = true

		elseif action == "RaceComplete" then
			if not racing then
				statusLabel.Text =
					"レース終了"
			end

		elseif action == "RaceReset" then
			racing = false
			startTime = 0

			timerLabel.Text =
				"00:00.000"

			statusLabel.Text =
				"JoinZoneへ入ってください"

			positionLabel.Text = ""
			resultLabel.Visible = false
		end
	end
)

--------------------------------------------------
-- タイマー
--------------------------------------------------

RunService.RenderStepped:Connect(function()
	if not racing or startTime <= 0 then
		return
	end

	timerLabel.Text =
		formatTime(
			Workspace:GetServerTimeNow()
			- startTime
		)
end)
