local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("Remotes")

local Config = require(ReplicatedStorage.Config)

local selectedMode = "Kids"
local selectedBoat = "Dinghy"
local selectedCourse = "Enoshima"
local selectedGameMode = "Race"

local function createColor(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local function createMainMenu()
	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "MainMenu"
	screenGui.ResetOnSpawn = false
	screenGui.Parent = playerGui

	local bg = Instance.new("Frame")
	bg.Name = "Background"
	bg.Size = UDim2.new(1, 0, 1, 0)
	bg.BackgroundColor3 = createColor(10, 30, 60)
	bg.Parent = screenGui

	local gradient = Instance.new("UIGradient")
	gradient.Color = ColorSequence.new(createColor(10, 30, 60), createColor(20, 60, 120))
	gradient.Rotation = 90
	gradient.Parent = bg

	-- Title
	local title = Instance.new("TextLabel")
	title.Name = "Title"
	title.Size = UDim2.new(0.8, 0, 0, 80)
	title.Position = UDim2.new(0.1, 0, 0.02, 0)
	title.BackgroundTransparency = 1
	title.Text = "⛵ ヨットレースシミュレーター"
	title.TextColor3 = createColor(255, 255, 255)
	title.TextScaled = true
	title.Font = Enum.Font.GothamBold
	title.Parent = bg

	local subtitle = Instance.new("TextLabel")
	subtitle.Name = "Subtitle"
	subtitle.Size = UDim2.new(0.8, 0, 0, 30)
	subtitle.Position = UDim2.new(0.1, 0, 0.12, 0)
	subtitle.BackgroundTransparency = 1
	subtitle.Text = "子供は5分で楽しめて、大人は何年でも極められる"
	subtitle.TextColor3 = createColor(180, 220, 255)
	subtitle.TextScaled = true
	subtitle.Font = Enum.Font.Gotham
	subtitle.Parent = bg

	-- Mode selection
	local modeFrame = Instance.new("Frame")
	modeFrame.Name = "ModeSelection"
	modeFrame.Size = UDim2.new(0.9, 0, 0, 120)
	modeFrame.Position = UDim2.new(0.05, 0, 0.2, 0)
	modeFrame.BackgroundTransparency = 1
	modeFrame.Parent = bg

	local modeTitle = Instance.new("TextLabel")
	modeTitle.Size = UDim2.new(1, 0, 0, 25)
	modeTitle.BackgroundTransparency = 1
	modeTitle.Text = "操作モード"
	modeTitle.TextColor3 = createColor(255, 220, 50)
	modeTitle.TextScaled = true
	modeTitle.Font = Enum.Font.GothamBold
	modeTitle.Parent = modeFrame

	local modeButtons = Instance.new("Frame")
	modeButtons.Size = UDim2.new(1, 0, 0, 80)
	modeButtons.Position = UDim2.new(0, 0, 0, 30)
	modeButtons.BackgroundTransparency = 1
	modeButtons.Parent = modeFrame

	local modeLayout = Instance.new("UIListLayout")
	modeLayout.FillDirection = Enum.FillDirection.Horizontal
	modeLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	modeLayout.Padding = UDim.new(0, 15)
	modeLayout.Parent = modeButtons

	local modes = {
		{ key = "Kids", label = "キッズ", desc = "舵のみ・自動セイル", color = createColor(50, 180, 50) },
		{ key = "Normal", label = "ノーマル", desc = "舵＋セイル操作", color = createColor(50, 120, 200) },
		{ key = "Pro", label = "プロ", desc = "フルコントロール", color = createColor(200, 50, 50) },
	}

	local modeButtonRefs = {}
	for _, m in ipairs(modes) do
		local btn = Instance.new("TextButton")
		btn.Name = m.key
		btn.Size = UDim2.new(0, 180, 0, 75)
		btn.BackgroundColor3 = m.color
		btn.BackgroundTransparency = 0.3
		btn.Text = m.label .. "\n" .. m.desc
		btn.TextColor3 = createColor(255, 255, 255)
		btn.TextScaled = true
		btn.Font = Enum.Font.GothamBold
		btn.Parent = modeButtons

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 12)
		corner.Parent = btn

		modeButtonRefs[m.key] = btn

		btn.MouseButton1Click:Connect(function()
			selectedMode = m.key
			for k, b in pairs(modeButtonRefs) do
				b.BackgroundTransparency = k == m.key and 0 or 0.6
			end
		end)
	end

	-- Boat selection
	local boatFrame = Instance.new("Frame")
	boatFrame.Name = "BoatSelection"
	boatFrame.Size = UDim2.new(0.9, 0, 0, 140)
	boatFrame.Position = UDim2.new(0.05, 0, 0.38, 0)
	boatFrame.BackgroundTransparency = 1
	boatFrame.Parent = bg

	local boatTitle = Instance.new("TextLabel")
	boatTitle.Size = UDim2.new(1, 0, 0, 25)
	boatTitle.BackgroundTransparency = 1
	boatTitle.Text = "艇種選択"
	boatTitle.TextColor3 = createColor(255, 220, 50)
	boatTitle.TextScaled = true
	boatTitle.Font = Enum.Font.GothamBold
	boatTitle.Parent = boatFrame

	local boatScroll = Instance.new("ScrollingFrame")
	boatScroll.Size = UDim2.new(1, 0, 0, 100)
	boatScroll.Position = UDim2.new(0, 0, 0, 30)
	boatScroll.BackgroundTransparency = 1
	boatScroll.ScrollBarThickness = 4
	boatScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
	boatScroll.AutomaticCanvasSize = Enum.AutomaticSize.X
	boatScroll.ScrollingDirection = Enum.ScrollingDirection.X
	boatScroll.Parent = boatFrame

	local boatLayout = Instance.new("UIListLayout")
	boatLayout.FillDirection = Enum.FillDirection.Horizontal
	boatLayout.Padding = UDim.new(0, 10)
	boatLayout.Parent = boatScroll

	local boatButtonRefs = {}
	for boatKey, boatConfig in pairs(Config.Boats) do
		local btn = Instance.new("TextButton")
		btn.Name = boatKey
		btn.Size = UDim2.new(0, 140, 0, 90)
		btn.BackgroundColor3 = createColor(40, 60, 100)
		btn.BackgroundTransparency = 0.3
		btn.Text = boatConfig.name .. "\n速度:" .. boatConfig.maxSpeed .. "\nLv." .. boatConfig.unlockLevel
		btn.TextColor3 = createColor(255, 255, 255)
		btn.TextScaled = true
		btn.Font = Enum.Font.Gotham
		btn.Parent = boatScroll

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 8)
		corner.Parent = btn

		boatButtonRefs[boatKey] = btn

		btn.MouseButton1Click:Connect(function()
			selectedBoat = boatKey
			for k, b in pairs(boatButtonRefs) do
				b.BackgroundTransparency = k == boatKey and 0 or 0.5
			end
		end)
	end

	-- Course selection
	local courseFrame = Instance.new("Frame")
	courseFrame.Name = "CourseSelection"
	courseFrame.Size = UDim2.new(0.9, 0, 0, 120)
	courseFrame.Position = UDim2.new(0.05, 0, 0.58, 0)
	courseFrame.BackgroundTransparency = 1
	courseFrame.Parent = bg

	local courseTitle = Instance.new("TextLabel")
	courseTitle.Size = UDim2.new(1, 0, 0, 25)
	courseTitle.BackgroundTransparency = 1
	courseTitle.Text = "コース選択"
	courseTitle.TextColor3 = createColor(255, 220, 50)
	courseTitle.TextScaled = true
	courseTitle.Font = Enum.Font.GothamBold
	courseTitle.Parent = courseFrame

	local courseScroll = Instance.new("ScrollingFrame")
	courseScroll.Size = UDim2.new(1, 0, 0, 80)
	courseScroll.Position = UDim2.new(0, 0, 0, 30)
	courseScroll.BackgroundTransparency = 1
	courseScroll.ScrollBarThickness = 4
	courseScroll.CanvasSize = UDim2.new(0, 0, 0, 0)
	courseScroll.AutomaticCanvasSize = Enum.AutomaticSize.X
	courseScroll.ScrollingDirection = Enum.ScrollingDirection.X
	courseScroll.Parent = courseFrame

	local courseLayout = Instance.new("UIListLayout")
	courseLayout.FillDirection = Enum.FillDirection.Horizontal
	courseLayout.Padding = UDim.new(0, 10)
	courseLayout.Parent = courseScroll

	for courseKey, courseConfig in pairs(Config.Courses) do
		local btn = Instance.new("TextButton")
		btn.Name = courseKey
		btn.Size = UDim2.new(0, 130, 0, 70)
		btn.BackgroundColor3 = createColor(30, 70, 50)
		btn.BackgroundTransparency = 0.3
		btn.Text = courseConfig.name .. "\n難易度:" .. string.rep("★", courseConfig.difficulty)
		btn.TextColor3 = createColor(255, 255, 255)
		btn.TextScaled = true
		btn.Font = Enum.Font.Gotham
		btn.Parent = courseScroll

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 8)
		corner.Parent = btn

		btn.MouseButton1Click:Connect(function()
			selectedCourse = courseKey
		end)
	end

	-- Game mode selection
	local gameModeFrame = Instance.new("Frame")
	gameModeFrame.Name = "GameModeSelection"
	gameModeFrame.Size = UDim2.new(0.9, 0, 0, 80)
	gameModeFrame.Position = UDim2.new(0.05, 0, 0.76, 0)
	gameModeFrame.BackgroundTransparency = 1
	gameModeFrame.Parent = bg

	local gmLayout = Instance.new("UIListLayout")
	gmLayout.FillDirection = Enum.FillDirection.Horizontal
	gmLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	gmLayout.Padding = UDim.new(0, 10)
	gmLayout.Parent = gameModeFrame

	local gameModes = {
		{ key = "Race", label = "レース" },
		{ key = "TimeAttack", label = "タイムアタック" },
		{ key = "FreeMode", label = "フリー" },
		{ key = "ParentChild", label = "親子モード" },
		{ key = "TeamRace", label = "チームレース" },
	}

	for _, gm in ipairs(gameModes) do
		local btn = Instance.new("TextButton")
		btn.Name = gm.key
		btn.Size = UDim2.new(0, 120, 0, 50)
		btn.BackgroundColor3 = createColor(60, 40, 80)
		btn.BackgroundTransparency = 0.3
		btn.Text = gm.label
		btn.TextColor3 = createColor(255, 255, 255)
		btn.TextScaled = true
		btn.Font = Enum.Font.GothamBold
		btn.Parent = gameModeFrame

		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, 8)
		corner.Parent = btn

		btn.MouseButton1Click:Connect(function()
			selectedGameMode = gm.key
		end)
	end

	-- Start button
	local startBtn = Instance.new("TextButton")
	startBtn.Name = "StartButton"
	startBtn.Size = UDim2.new(0.4, 0, 0, 60)
	startBtn.Position = UDim2.new(0.3, 0, 0.9, 0)
	startBtn.BackgroundColor3 = createColor(50, 200, 80)
	startBtn.Text = "出航！"
	startBtn.TextColor3 = createColor(255, 255, 255)
	startBtn.TextScaled = true
	startBtn.Font = Enum.Font.GothamBold
	startBtn.Parent = bg

	local startCorner = Instance.new("UICorner")
	startCorner.CornerRadius = UDim.new(0, 16)
	startCorner.Parent = startBtn

	startBtn.MouseButton1Click:Connect(function()
		remotes.SelectMode:FireServer({ mode = selectedMode })
		remotes.SelectBoat:FireServer({ boatType = selectedBoat })
		remotes.JoinRace:FireServer({
			boatType = selectedBoat,
			mode = selectedMode,
			course = selectedCourse,
			gameMode = selectedGameMode,
		})

		local tween = TweenService:Create(bg, TweenInfo.new(0.5), { BackgroundTransparency = 1 })
		tween:Play()
		tween.Completed:Connect(function()
			screenGui.Enabled = false
		end)
	end)

	return screenGui
end

local menu = createMainMenu()

remotes:WaitForChild("FinishRace").OnClientEvent:Connect(function(data)
	if data.state == "finished" then
		menu.Enabled = true
		local bg = menu.Background
		bg.BackgroundTransparency = 1
		local tween = TweenService:Create(bg, TweenInfo.new(0.5), { BackgroundTransparency = 0 })
		tween:Play()
	end
end)

print("[YachtRaceSimulator] MainMenu initialized")
