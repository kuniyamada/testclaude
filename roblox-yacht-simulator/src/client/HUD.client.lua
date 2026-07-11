local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("Remotes")

local Config = require(ReplicatedStorage.Config)

local function createColor(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local function createHUD()
	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "YachtHUD"
	screenGui.ResetOnSpawn = false
	screenGui.Parent = playerGui

	local mainFrame = Instance.new("Frame")
	mainFrame.Name = "MainHUD"
	mainFrame.Size = UDim2.new(1, 0, 1, 0)
	mainFrame.BackgroundTransparency = 1
	mainFrame.Parent = screenGui

	-- Speed indicator
	local speedFrame = Instance.new("Frame")
	speedFrame.Name = "SpeedPanel"
	speedFrame.Size = UDim2.new(0, 200, 0, 80)
	speedFrame.Position = UDim2.new(0, 20, 1, -100)
	speedFrame.BackgroundColor3 = createColor(0, 0, 0)
	speedFrame.BackgroundTransparency = 0.5
	speedFrame.Parent = mainFrame

	local speedCorner = Instance.new("UICorner")
	speedCorner.CornerRadius = UDim.new(0, 12)
	speedCorner.Parent = speedFrame

	local speedLabel = Instance.new("TextLabel")
	speedLabel.Name = "SpeedLabel"
	speedLabel.Size = UDim2.new(1, 0, 0.5, 0)
	speedLabel.BackgroundTransparency = 1
	speedLabel.Text = "0.0"
	speedLabel.TextColor3 = createColor(255, 255, 255)
	speedLabel.TextScaled = true
	speedLabel.Font = Enum.Font.GothamBold
	speedLabel.Parent = speedFrame

	local speedUnit = Instance.new("TextLabel")
	speedUnit.Name = "SpeedUnit"
	speedUnit.Size = UDim2.new(1, 0, 0.3, 0)
	speedUnit.Position = UDim2.new(0, 0, 0.5, 0)
	speedUnit.BackgroundTransparency = 1
	speedUnit.Text = "ノット"
	speedUnit.TextColor3 = createColor(200, 200, 200)
	speedUnit.TextScaled = true
	speedUnit.Font = Enum.Font.Gotham
	speedUnit.Parent = speedFrame

	-- Wind indicator
	local windFrame = Instance.new("Frame")
	windFrame.Name = "WindPanel"
	windFrame.Size = UDim2.new(0, 120, 0, 120)
	windFrame.Position = UDim2.new(1, -140, 0, 20)
	windFrame.BackgroundColor3 = createColor(0, 0, 0)
	windFrame.BackgroundTransparency = 0.5
	windFrame.Parent = mainFrame

	local windCorner = Instance.new("UICorner")
	windCorner.CornerRadius = UDim.new(0, 60)
	windCorner.Parent = windFrame

	local windArrow = Instance.new("TextLabel")
	windArrow.Name = "WindArrow"
	windArrow.Size = UDim2.new(0.6, 0, 0.6, 0)
	windArrow.Position = UDim2.new(0.2, 0, 0.1, 0)
	windArrow.BackgroundTransparency = 1
	windArrow.Text = "↑"
	windArrow.TextColor3 = createColor(100, 200, 255)
	windArrow.TextScaled = true
	windArrow.Font = Enum.Font.GothamBold
	windArrow.Parent = windFrame

	local windSpeedLabel = Instance.new("TextLabel")
	windSpeedLabel.Name = "WindSpeed"
	windSpeedLabel.Size = UDim2.new(1, 0, 0.3, 0)
	windSpeedLabel.Position = UDim2.new(0, 0, 0.7, 0)
	windSpeedLabel.BackgroundTransparency = 1
	windSpeedLabel.Text = "10 m/s"
	windSpeedLabel.TextColor3 = createColor(200, 200, 200)
	windSpeedLabel.TextScaled = true
	windSpeedLabel.Font = Enum.Font.Gotham
	windSpeedLabel.Parent = windFrame

	-- Sail angle indicator
	local sailFrame = Instance.new("Frame")
	sailFrame.Name = "SailPanel"
	sailFrame.Size = UDim2.new(0, 160, 0, 60)
	sailFrame.Position = UDim2.new(0, 20, 1, -200)
	sailFrame.BackgroundColor3 = createColor(0, 0, 0)
	sailFrame.BackgroundTransparency = 0.5
	sailFrame.Parent = mainFrame

	local sailCorner = Instance.new("UICorner")
	sailCorner.CornerRadius = UDim.new(0, 12)
	sailCorner.Parent = sailFrame

	local sailLabel = Instance.new("TextLabel")
	sailLabel.Name = "SailAngle"
	sailLabel.Size = UDim2.new(1, 0, 0.6, 0)
	sailLabel.BackgroundTransparency = 1
	sailLabel.Text = "セイル: 0°"
	sailLabel.TextColor3 = createColor(255, 255, 255)
	sailLabel.TextScaled = true
	sailLabel.Font = Enum.Font.Gotham
	sailLabel.Parent = sailFrame

	local heelLabel = Instance.new("TextLabel")
	heelLabel.Name = "HeelAngle"
	heelLabel.Size = UDim2.new(1, 0, 0.4, 0)
	heelLabel.Position = UDim2.new(0, 0, 0.6, 0)
	heelLabel.BackgroundTransparency = 1
	heelLabel.Text = "ヒール: 0°"
	heelLabel.TextColor3 = createColor(200, 200, 200)
	heelLabel.TextScaled = true
	heelLabel.Font = Enum.Font.Gotham
	heelLabel.Parent = sailFrame

	-- Race timer
	local timerFrame = Instance.new("Frame")
	timerFrame.Name = "TimerPanel"
	timerFrame.Size = UDim2.new(0, 200, 0, 50)
	timerFrame.Position = UDim2.new(0.5, -100, 0, 10)
	timerFrame.BackgroundColor3 = createColor(0, 0, 0)
	timerFrame.BackgroundTransparency = 0.5
	timerFrame.Parent = mainFrame

	local timerCorner = Instance.new("UICorner")
	timerCorner.CornerRadius = UDim.new(0, 12)
	timerCorner.Parent = timerFrame

	local timerLabel = Instance.new("TextLabel")
	timerLabel.Name = "Timer"
	timerLabel.Size = UDim2.new(1, 0, 1, 0)
	timerLabel.BackgroundTransparency = 1
	timerLabel.Text = "00:00"
	timerLabel.TextColor3 = createColor(255, 255, 255)
	timerLabel.TextScaled = true
	timerLabel.Font = Enum.Font.GothamBold
	timerLabel.Parent = timerFrame

	-- Rankings panel
	local rankFrame = Instance.new("Frame")
	rankFrame.Name = "RankingsPanel"
	rankFrame.Size = UDim2.new(0, 250, 0, 300)
	rankFrame.Position = UDim2.new(1, -270, 0, 150)
	rankFrame.BackgroundColor3 = createColor(0, 0, 0)
	rankFrame.BackgroundTransparency = 0.6
	rankFrame.Parent = mainFrame

	local rankCorner = Instance.new("UICorner")
	rankCorner.CornerRadius = UDim.new(0, 12)
	rankCorner.Parent = rankFrame

	local rankTitle = Instance.new("TextLabel")
	rankTitle.Name = "Title"
	rankTitle.Size = UDim2.new(1, 0, 0, 30)
	rankTitle.BackgroundTransparency = 1
	rankTitle.Text = "順位"
	rankTitle.TextColor3 = createColor(255, 220, 50)
	rankTitle.TextScaled = true
	rankTitle.Font = Enum.Font.GothamBold
	rankTitle.Parent = rankFrame

	local rankList = Instance.new("Frame")
	rankList.Name = "RankList"
	rankList.Size = UDim2.new(1, -10, 1, -35)
	rankList.Position = UDim2.new(0, 5, 0, 32)
	rankList.BackgroundTransparency = 1
	rankList.Parent = rankFrame

	local listLayout = Instance.new("UIListLayout")
	listLayout.SortOrder = Enum.SortOrder.LayoutOrder
	listLayout.Padding = UDim.new(0, 2)
	listLayout.Parent = rankList

	-- Compass / course guide
	local guideFrame = Instance.new("Frame")
	guideFrame.Name = "CourseGuide"
	guideFrame.Size = UDim2.new(0, 160, 0, 40)
	guideFrame.Position = UDim2.new(0.5, -80, 0, 70)
	guideFrame.BackgroundColor3 = createColor(0, 0, 0)
	guideFrame.BackgroundTransparency = 0.5
	guideFrame.Visible = false
	guideFrame.Parent = mainFrame

	local guideCorner = Instance.new("UICorner")
	guideCorner.CornerRadius = UDim.new(0, 8)
	guideCorner.Parent = guideFrame

	local guideLabel = Instance.new("TextLabel")
	guideLabel.Name = "GuideText"
	guideLabel.Size = UDim2.new(1, 0, 1, 0)
	guideLabel.BackgroundTransparency = 1
	guideLabel.Text = "次のブイ → "
	guideLabel.TextColor3 = createColor(100, 255, 100)
	guideLabel.TextScaled = true
	guideLabel.Font = Enum.Font.Gotham
	guideLabel.Parent = guideFrame

	-- Mobile touch controls
	local touchFrame = Instance.new("Frame")
	touchFrame.Name = "TouchControls"
	touchFrame.Size = UDim2.new(1, 0, 0, 150)
	touchFrame.Position = UDim2.new(0, 0, 1, -150)
	touchFrame.BackgroundTransparency = 1
	touchFrame.Visible = false
	touchFrame.Parent = mainFrame

	local steerLeftBtn = Instance.new("TextButton")
	steerLeftBtn.Name = "SteerLeft"
	steerLeftBtn.Size = UDim2.new(0, 100, 0, 100)
	steerLeftBtn.Position = UDim2.new(0, 20, 0, 25)
	steerLeftBtn.BackgroundColor3 = createColor(50, 50, 80)
	steerLeftBtn.BackgroundTransparency = 0.3
	steerLeftBtn.Text = "◀"
	steerLeftBtn.TextColor3 = createColor(255, 255, 255)
	steerLeftBtn.TextScaled = true
	steerLeftBtn.Font = Enum.Font.GothamBold
	steerLeftBtn.Parent = touchFrame

	local steerLeftCorner = Instance.new("UICorner")
	steerLeftCorner.CornerRadius = UDim.new(0, 50)
	steerLeftCorner.Parent = steerLeftBtn

	local steerRightBtn = Instance.new("TextButton")
	steerRightBtn.Name = "SteerRight"
	steerRightBtn.Size = UDim2.new(0, 100, 0, 100)
	steerRightBtn.Position = UDim2.new(0, 140, 0, 25)
	steerRightBtn.BackgroundColor3 = createColor(50, 50, 80)
	steerRightBtn.BackgroundTransparency = 0.3
	steerRightBtn.Text = "▶"
	steerRightBtn.TextColor3 = createColor(255, 255, 255)
	steerRightBtn.TextScaled = true
	steerRightBtn.Font = Enum.Font.GothamBold
	steerRightBtn.Parent = touchFrame

	local steerRightCorner = Instance.new("UICorner")
	steerRightCorner.CornerRadius = UDim.new(0, 50)
	steerRightCorner.Parent = steerRightBtn

	local tackBtn = Instance.new("TextButton")
	tackBtn.Name = "TackButton"
	tackBtn.Size = UDim2.new(0, 80, 0, 50)
	tackBtn.Position = UDim2.new(1, -200, 0, 10)
	tackBtn.BackgroundColor3 = createColor(80, 50, 50)
	tackBtn.BackgroundTransparency = 0.3
	tackBtn.Text = "タック"
	tackBtn.TextColor3 = createColor(255, 255, 255)
	tackBtn.TextScaled = true
	tackBtn.Font = Enum.Font.GothamBold
	tackBtn.Parent = touchFrame

	local tackCorner = Instance.new("UICorner")
	tackCorner.CornerRadius = UDim.new(0, 8)
	tackCorner.Parent = tackBtn

	local jibeBtn = Instance.new("TextButton")
	jibeBtn.Name = "JibeButton"
	jibeBtn.Size = UDim2.new(0, 80, 0, 50)
	jibeBtn.Position = UDim2.new(1, -100, 0, 10)
	jibeBtn.BackgroundColor3 = createColor(50, 80, 50)
	jibeBtn.BackgroundTransparency = 0.3
	jibeBtn.Text = "ジャイブ"
	jibeBtn.TextColor3 = createColor(255, 255, 255)
	jibeBtn.TextScaled = true
	jibeBtn.Font = Enum.Font.GothamBold
	jibeBtn.Parent = touchFrame

	local jibeCorner = Instance.new("UICorner")
	jibeCorner.CornerRadius = UDim.new(0, 8)
	jibeCorner.Parent = jibeBtn

	return screenGui
end

local hud = createHUD()

local function formatTime(seconds)
	local mins = math.floor(seconds / 60)
	local secs = math.floor(seconds % 60)
	return string.format("%02d:%02d", mins, secs)
end

local function updateHUD(data)
	local mainFrame = hud.MainHUD

	if data.speed then
		mainFrame.SpeedPanel.SpeedLabel.Text = string.format("%.1f", data.speed)
	end

	if data.windDirection and data.windSpeed then
		local angle = math.deg(math.atan2(data.windDirection.X, data.windDirection.Z))
		mainFrame.WindPanel.WindArrow.Rotation = angle
		mainFrame.WindPanel.WindSpeed.Text = string.format("%.0f m/s", data.windSpeed)
	end

	if data.sailAngle then
		mainFrame.SailPanel.SailAngle.Text = string.format("セイル: %.0f°", data.sailAngle)
	end

	if data.heelAngle then
		mainFrame.SailPanel.HeelAngle.Text = string.format("ヒール: %.0f°", data.heelAngle)
	end

	if data.elapsedTime then
		mainFrame.TimerPanel.Timer.Text = formatTime(data.elapsedTime)
	end

	if data.rankings then
		local rankList = mainFrame.RankingsPanel.RankList
		for _, child in ipairs(rankList:GetChildren()) do
			if child:IsA("TextLabel") then
				child:Destroy()
			end
		end

		for i, r in ipairs(data.rankings) do
			if i > 10 then
				break
			end
			local entry = Instance.new("TextLabel")
			entry.Name = "Rank" .. i
			entry.Size = UDim2.new(1, 0, 0, 25)
			entry.LayoutOrder = i
			entry.BackgroundTransparency = 1
			entry.Text = string.format("%d. %s", i, r.name)
			entry.TextColor3 = i == 1 and createColor(255, 220, 50)
				or i == 2 and createColor(200, 200, 200)
				or i == 3 and createColor(205, 127, 50)
				or createColor(255, 255, 255)
			entry.TextScaled = true
			entry.TextXAlignment = Enum.TextXAlignment.Left
			entry.Font = Enum.Font.Gotham
			entry.Parent = rankList
		end
	end
end

local UserInputService = game:GetService("UserInputService")
if UserInputService.TouchEnabled then
	hud.MainHUD.TouchControls.Visible = true
end

remotes:WaitForChild("RaceUpdate").OnClientEvent:Connect(function(data)
	updateHUD(data)
end)

print("[YachtRaceSimulator] HUD initialized")
