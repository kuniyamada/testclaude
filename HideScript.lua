-- HideScript（隠れシステム）
-- このスクリプトをロッカーや机などのPartの中に入れる
-- プレイヤーがEキーで隠れる/出る
-- 隠れている間は敵に見つからない（EnemyAIScriptと連携）

local hidingSpot = script.Parent
local Players = game:GetService("Players")

-- 設定
local interactDistance = 8

-- このロッカーに隠れているプレイヤー
local currentOccupant = nil

-- ProximityPrompt
local prompt = Instance.new("ProximityPrompt")
prompt.ObjectText = "ロッカー"
prompt.ActionText = "隠れる"
prompt.KeyboardKeyCode = Enum.KeyCode.E
prompt.MaxActivationDistance = interactDistance
prompt.HoldDuration = 0
prompt.Parent = hidingSpot

-- 隠れる
local function hidePlayer(player)
	local character = player.Character
	if not character then return end

	currentOccupant = player

	-- キャラを透明にして動けなくする
	for _, part in ipairs(character:GetDescendants()) do
		if part:IsA("BasePart") then
			part.Transparency = 1
			part.CanCollide = false
		elseif part:IsA("Decal") or part:IsA("Texture") then
			part.Transparency = 1
		end
	end

	-- キャラをロッカーの位置に移動
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.Anchored = true
		hrp.CFrame = hidingSpot.CFrame
	end

	-- 隠れフラグをセット（敵AIが参照する）
	character:SetAttribute("IsHiding", true)

	-- プロンプトを「出る」に変更
	prompt.ActionText = "出る"

	-- 画面エフェクト（暗くする）
	local playerGui = player:FindFirstChild("PlayerGui")
	if playerGui then
		local gui = Instance.new("ScreenGui")
		gui.Name = "HideOverlay"
		gui.Parent = playerGui

		local frame = Instance.new("Frame")
		frame.Size = UDim2.new(1, 0, 1, 0)
		frame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
		frame.BackgroundTransparency = 0.5
		frame.BorderSizePixel = 0
		frame.Parent = gui

		local label = Instance.new("TextLabel")
		label.Size = UDim2.new(0.3, 0, 0.05, 0)
		label.Position = UDim2.new(0.35, 0, 0.9, 0)
		label.BackgroundTransparency = 1
		label.Text = "Eキーで出る"
		label.TextColor3 = Color3.fromRGB(200, 200, 200)
		label.TextScaled = true
		label.Font = Enum.Font.GothamBold
		label.Parent = gui
	end
end

-- 出る
local function unhidePlayer(player)
	local character = player.Character
	if not character then return end

	currentOccupant = nil

	-- キャラを元に戻す
	for _, part in ipairs(character:GetDescendants()) do
		if part:IsA("BasePart") then
			if part.Name == "HumanoidRootPart" then
				part.Transparency = 1
			else
				part.Transparency = 0
			end
			part.CanCollide = true
		elseif part:IsA("Decal") or part:IsA("Texture") then
			part.Transparency = 0
		end
	end

	-- ロッカーの前に出す
	local hrp = character:FindFirstChild("HumanoidRootPart")
	if hrp then
		hrp.Anchored = false
		hrp.CFrame = hidingSpot.CFrame * CFrame.new(0, 0, -4)
	end

	-- 隠れフラグを解除
	character:SetAttribute("IsHiding", false)

	-- プロンプトを「隠れる」に戻す
	prompt.ActionText = "隠れる"

	-- 画面エフェクトを消す
	local playerGui = player:FindFirstChild("PlayerGui")
	if playerGui then
		local overlay = playerGui:FindFirstChild("HideOverlay")
		if overlay then overlay:Destroy() end
	end
end

-- Eキーが押されたとき
prompt.Triggered:Connect(function(player)
	if currentOccupant == player then
		unhidePlayer(player)
	elseif currentOccupant == nil then
		hidePlayer(player)
	end
end)

-- プレイヤーが退出したら解放
Players.PlayerRemoving:Connect(function(player)
	if currentOccupant == player then
		currentOccupant = nil
		prompt.ActionText = "隠れる"
	end
end)
