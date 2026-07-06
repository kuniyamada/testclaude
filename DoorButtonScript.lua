-- DoorButtonScript（鍵システム付き）
-- 構成:
--   Workspace内に「Door」「DoorButton」「Key」という名前のPartを配置
--   このスクリプトは「DoorButton」の中に入れる
--   「Key」は拾える鍵オブジェクト（触れると取得）

local button = script.Parent
local door = workspace:FindFirstChild("Door")

-- 設定
local openOffset = Vector3.new(0, 7, 0) -- 扉が上に7スタッド移動して開く
local moveSpeed = 0.05 -- 開閉の速さ（小さいほど遅い）
local cooldown = 1 -- ボタン連打防止（秒）

local isOpen = false
local isMoving = false
local closedCFrame = nil

-- 鍵を持っているプレイヤーを記録
local playersWithKey = {}

-- 「鍵がない」メッセージを表示する
local function showNoKeyMessage(player)
	local playerGui = player:FindFirstChild("PlayerGui")
	if not playerGui then return end

	-- 既にメッセージが表示中なら何もしない
	if playerGui:FindFirstChild("NoKeyGui") then return end

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "NoKeyGui"
	screenGui.Parent = playerGui

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(0.4, 0, 0.1, 0)
	label.Position = UDim2.new(0.3, 0, 0.4, 0)
	label.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
	label.BackgroundTransparency = 0.3
	label.BorderSizePixel = 0
	label.Text = "🔒 鍵がない！"
	label.TextColor3 = Color3.fromRGB(255, 80, 80)
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.Parent = screenGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = label

	-- 2秒後にメッセージを消す
	task.delay(2, function()
		if screenGui and screenGui.Parent then
			screenGui:Destroy()
		end
	end)
end

-- 「鍵を手に入れた」メッセージを表示する
local function showGotKeyMessage(player)
	local playerGui = player:FindFirstChild("PlayerGui")
	if not playerGui then return end

	local screenGui = Instance.new("ScreenGui")
	screenGui.Name = "GotKeyGui"
	screenGui.Parent = playerGui

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(0.4, 0, 0.1, 0)
	label.Position = UDim2.new(0.3, 0, 0.4, 0)
	label.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
	label.BackgroundTransparency = 0.3
	label.BorderSizePixel = 0
	label.Text = "🔑 鍵を手に入れた！"
	label.TextColor3 = Color3.fromRGB(100, 255, 100)
	label.TextScaled = true
	label.Font = Enum.Font.GothamBold
	label.Parent = screenGui

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = label

	-- 2秒後にメッセージを消す
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
		local player = game:GetService("Players"):GetPlayerFromCharacter(hit.Parent)
		if not player then return end
		if playersWithKey[player.UserId] then return end

		playersWithKey[player.UserId] = true
		key:Destroy()
		showGotKeyMessage(player)
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

-- ボタンに触れたとき
local function onButtonTouched(hit)
	if isMoving then return end

	local player = game:GetService("Players"):GetPlayerFromCharacter(hit.Parent)
	if not player then return end

	-- 鍵を持っていなければメッセージ表示
	if not playersWithKey[player.UserId] then
		showNoKeyMessage(player)
		return
	end

	if not door then
		door = workspace:FindFirstChild("Door")
		if not door then return end
	end

	if not closedCFrame then
		closedCFrame = door.CFrame
	end

	if isOpen then
		moveDoor(closedCFrame)
		isOpen = false
	else
		moveDoor(closedCFrame * CFrame.new(openOffset))
		isOpen = true
	end

	task.wait(cooldown)
end

button.Touched:Connect(onButtonTouched)
