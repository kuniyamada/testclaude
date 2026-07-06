-- DoorScript（2つの扉・鍵システム付き・Eキーで開閉）
-- 構成:
--   Workspace内に「Door」「Door2」「Key」「Key2」を配置
--   このスクリプトは「Door」の中に入れる
--   Key2は最初は非表示。Door1が開いたらKey2が出現する

local door = script.Parent
local Players = game:GetService("Players")

-- 設定
local openOffset = Vector3.new(7, 0, 0) -- 扉が横に7スタッド移動して開く
local moveSpeed = 0.05
local interactDistance = 10

-- 状態管理
local door1Open = false
local door2Open = false
local isMoving1 = false
local isMoving2 = false
local closedCFrame1 = door.CFrame

-- 鍵を持っているプレイヤーを記録
local playersWithKey1 = {}
local playersWithKey2 = {}

-- Door2の参照とCFrame（後で取得）
local door2 = workspace:FindFirstChild("Door2")
local closedCFrame2 = door2 and door2.CFrame or nil

-- Key2の参照を取得
local key2 = workspace:FindFirstChild("Key2")
if not key2 then
	task.defer(function()
		key2 = workspace:WaitForChild("Key2", 30)
	end)
end

-- === ProximityPrompt: Door1 ===
local prompt1 = Instance.new("ProximityPrompt")
prompt1.ObjectText = "扉1"
prompt1.ActionText = "開ける"
prompt1.KeyboardKeyCode = Enum.KeyCode.E
prompt1.MaxActivationDistance = interactDistance
prompt1.HoldDuration = 0
prompt1.Parent = door

-- === ProximityPrompt: Door2 ===
local prompt2 = nil
if door2 then
	prompt2 = Instance.new("ProximityPrompt")
	prompt2.ObjectText = "扉2"
	prompt2.ActionText = "開ける"
	prompt2.KeyboardKeyCode = Enum.KeyCode.E
	prompt2.MaxActivationDistance = interactDistance
	prompt2.HoldDuration = 0
	prompt2.Parent = door2
end

-- メッセージを表示する
local function showMessage(player, text, color)
	local playerGui = player:FindFirstChild("PlayerGui")
	if not playerGui then return end

	if playerGui:FindFirstChild("DoorMessageGui") then return end

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "DoorMessageGui"
	screenGui.Parent = playerGui

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(0.4, 0, 0.1, 0)
	label.Position = UDim2.new(0.3, 0, 0.4, 0)
	label.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
	label.BackgroundTransparency = 0.3
	label.BorderSizePixel = 0
	label.Text = text
	label.TextColor3 = color
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.Parent = screenGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = label

	task.delay(2, function()
		if screenGui and screenGui.Parent then
			screenGui:Destroy()
		end
	end)
end

-- ヒントを左上に表示・更新する
local function updateHint(player, text)
	local playerGui = player:FindFirstChild("PlayerGui")
	if not playerGui then return end

	-- 既存のヒントを消す
	local old = playerGui:FindFirstChild("KeyHintGui")
	if old then old:Destroy() end

	if not text then return end

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "KeyHintGui"
	screenGui.Parent = playerGui

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(0.2, 0, 0.05, 0)
	label.Position = UDim2.new(0.01, 0, 0.01, 0)
	label.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
	label.BackgroundTransparency = 0.3
	label.BorderSizePixel = 0
	label.Text = text
	label.TextColor3 = Color3.fromRGB(255, 255, 100)
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.Parent = screenGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 8)
	corner.Parent = label
end

-- 現在のヒントテキストを返す
local function getCurrentHint()
	if not door1Open then
		return "🔑 鍵を探す"
	elseif not door2Open then
		return "🔑 鍵2を探す"
	else
		return nil
	end
end

-- 全プレイヤーのヒントを更新する
local function updateAllHints()
	local hint = getCurrentHint()
	for _, player in ipairs(Players:GetPlayers()) do
		updateHint(player, hint)
	end
end

-- Key1を拾うスクリプト
local function setupKey1()
	local key = workspace:FindFirstChild("Key")
	if not key then return end

	key.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if not player then return end
		if playersWithKey1[player.UserId] then return end

		playersWithKey1[player.UserId] = true
		key:Destroy()
		showMessage(player, "🔑 鍵1を手に入れた！", Color3.fromRGB(100, 255, 100))
	end)
end

setupKey1()

-- Key2を拾えるようにする
local function setupKey2()
	if not key2 then
		key2 = workspace:FindFirstChild("Key2")
	end
	if not key2 then
		key2 = workspace:WaitForChild("Key2", 30)
	end
	if not key2 then
		warn("Key2がWorkspaceに見つかりません")
		return
	end

	key2.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if not player then return end
		if playersWithKey2[player.UserId] then return end

		playersWithKey2[player.UserId] = true
		key2:Destroy()
		showMessage(player, "🔑 鍵2を手に入れた！", Color3.fromRGB(100, 255, 100))
	end)
end

-- プレイヤーが参加したらヒントを表示
Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function()
		local hint = getCurrentHint()
		if hint then
			updateHint(player, hint)
		end
	end)
end)

-- 既に参加しているプレイヤーにも表示
for _, player in ipairs(Players:GetPlayers()) do
	task.defer(function()
		local hint = getCurrentHint()
		if hint then
			updateHint(player, hint)
		end
	end)
	player.CharacterAdded:Connect(function()
		local hint = getCurrentHint()
		if hint then
			updateHint(player, hint)
		end
	end)
end

-- 扉を動かす
local function moveDoor(targetDoor, targetCFrame)
	local steps = 20
	local startCFrame = targetDoor.CFrame
	for i = 1, steps do
		targetDoor.CFrame = startCFrame:Lerp(targetCFrame, i / steps)
		task.wait(moveSpeed)
	end
end

-- Door1: Eキーが押されたとき
prompt1.Triggered:Connect(function(player)
	if isMoving1 then return end
	if door1Open then return end

	if not playersWithKey1[player.UserId] then
		showMessage(player, "🔒 鍵がない！", Color3.fromRGB(255, 80, 80))
		return
	end

	isMoving1 = true
	moveDoor(door, closedCFrame1 * CFrame.new(openOffset))
	prompt1.Enabled = false
	door1Open = true
	isMoving1 = false

	-- ヒントを更新
	updateAllHints()
end)

-- Door2: Eキーが押されたとき
if prompt2 and door2 then
	prompt2.Triggered:Connect(function(player)
		if isMoving2 then return end
		if door2Open then return end

		if not playersWithKey2[player.UserId] then
			showMessage(player, "🔒 鍵2がない！", Color3.fromRGB(255, 80, 80))
			return
		end

		isMoving2 = true
		moveDoor(door2, closedCFrame2 * CFrame.new(openOffset))
		prompt2.Enabled = false
		door2Open = true
		isMoving2 = false

		-- ヒントを消す
		updateAllHints()
	end)
end
