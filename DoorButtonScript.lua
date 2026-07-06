-- DoorScript（鍵システム付き・Eキーで開閉）
-- 構成:
--   Workspace内に「Door」と「Key」という名前のPartを配置
--   このスクリプトは「Door」の中に入れる（Serverスクリプト）
--   ProximityPromptで近づいてEキーを押すと開閉する

local door = script.Parent
local Players = game:GetService("Players")

-- 設定
local openOffset = Vector3.new(0, 7, 0) -- 扉が上に7スタッド移動して開く
local moveSpeed = 0.05 -- 開閉の速さ
local interactDistance = 10 -- Eキーが反応する距離（スタッド）

local isOpen = false
local isMoving = false
local closedCFrame = door.CFrame

-- 鍵を持っているプレイヤーを記録
local playersWithKey = {}

-- ProximityPromptを扉に追加（Eキーで操作）
local prompt = Instance.new("ProximityPrompt")
prompt.ObjectText = "扉"
prompt.ActionText = "開ける"
prompt.KeyboardKeyCode = Enum.KeyCode.E
prompt.MaxActivationDistance = interactDistance
prompt.HoldDuration = 0
prompt.Parent = door

-- 「鍵がない」メッセージを表示する
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

-- 鍵を拾うスクリプト
local function setupKey()
	local key = workspace:FindFirstChild("Key")
	if not key then return end

	key.Touched:Connect(function(hit)
		local player = Players:GetPlayerFromCharacter(hit.Parent)
		if not player then return end
		if playersWithKey[player.UserId] then return end

		playersWithKey[player.UserId] = true
		key:Destroy()
		showMessage(player, "🔑 鍵を手に入れた！", Color3.fromRGB(100, 255, 100))
	end)
end

setupKey()

-- 扉を動かす
local function moveDoor(targetCFrame)
	isMoving = true
	local steps = 20
	local startCFrame = door.CFrame
	for i = 1, steps do
		door.CFrame = startCFrame:Lerp(targetCFrame, i / steps)
		task.wait(moveSpeed)
	end
	isMoving = false
end

-- Eキーが押されたとき
prompt.Triggered:Connect(function(player)
	if isMoving then return end

	-- 鍵を持っていなければメッセージ表示
	if not playersWithKey[player.UserId] then
		showMessage(player, "🔒 鍵がない！", Color3.fromRGB(255, 80, 80))
		return
	end

	if isOpen then
		moveDoor(closedCFrame)
		prompt.ActionText = "開ける"
		isOpen = false
	else
		moveDoor(closedCFrame * CFrame.new(openOffset))
		prompt.ActionText = "閉める"
		isOpen = true
	end
end)
