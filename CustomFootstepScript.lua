-- CustomFootstepScript（自分の足音を変更）
-- StarterCharacterScripts に入れる（LocalScript）
-- デフォルトの足音を消して、カスタム足音を再生する

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local player = Players.LocalPlayer
local character = script.Parent
local humanoid = character:WaitForChild("Humanoid")
local rootPart = character:WaitForChild("HumanoidRootPart")

-- 設定
local walkInterval = 0.45    -- 歩き時の足音間隔（秒）
local runInterval = 0.3      -- 走り時の足音間隔（秒）
local runSpeedThreshold = 20 -- この速度以上なら走りと判定
local footstepVolume = 0.5   -- 足音の音量（0〜1）

-- 足音のSoundIdリスト（ランダムに再生される）
-- ※ 好きな音声アセットIDに変更してください
local footstepSounds = {
	"rbxassetid://9126153735",  -- 足音1
	"rbxassetid://9126153735",  -- 足音2（別の音に変更可能）
}

-- 床の素材に応じた足音（オプション）
-- 使いたい場合はSoundIdを設定してください
local materialSounds = {
	[Enum.Material.Wood]       = "rbxassetid://9126153735",  -- 木の床
	[Enum.Material.Metal]      = "rbxassetid://9126153735",  -- 金属の床
	[Enum.Material.Concrete]   = "rbxassetid://9126153735",  -- コンクリート
	[Enum.Material.Grass]      = "rbxassetid://9126153735",  -- 草
	[Enum.Material.Sand]       = "rbxassetid://9126153735",  -- 砂
}

-- デフォルトの足音を無効化
local function muteDefaultSounds()
	local sound = rootPart:FindFirstChild("Running")
	if sound then sound.Volume = 0 end

	for _, child in ipairs(rootPart:GetChildren()) do
		if child:IsA("Sound") and child.Name == "Running" then
			child.Volume = 0
		end
	end
end

muteDefaultSounds()
rootPart.ChildAdded:Connect(function(child)
	if child:IsA("Sound") and child.Name == "Running" then
		child.Volume = 0
	end
end)

-- カスタム足音サウンドを作成
local customSound = Instance.new("Sound")
customSound.Name = "CustomFootstep"
customSound.Volume = footstepVolume
customSound.Parent = rootPart

-- 床の素材を取得するRaycast
local function getFloorMaterial()
	local rayParams = RaycastParams.new()
	rayParams.FilterDescendantsInstances = {character}
	rayParams.FilterType = Enum.RaycastFilterType.Exclude

	local result = workspace:Raycast(
		rootPart.Position,
		Vector3.new(0, -10, 0),
		rayParams
	)

	if result then
		return result.Material
	end
	return nil
end

-- 足音を再生
local function playFootstep()
	local material = getFloorMaterial()

	-- 床の素材に応じたサウンドがあればそれを使う
	if material and materialSounds[material] then
		customSound.SoundId = materialSounds[material]
	else
		-- ランダムに足音を選ぶ
		local index = math.random(1, #footstepSounds)
		customSound.SoundId = footstepSounds[index]
	end

	-- ピッチを少しランダムにして自然に
	customSound.PlaybackSpeed = 0.9 + math.random() * 0.2
	customSound:Play()
end

-- 足音ループ
local isWalking = false
local footstepThread = nil

local function startFootsteps()
	if isWalking then return end
	isWalking = true

	footstepThread = task.spawn(function()
		while isWalking do
			playFootstep()

			local speed = humanoid.MoveDirection.Magnitude * humanoid.WalkSpeed
			local interval = speed >= runSpeedThreshold and runInterval or walkInterval
			task.wait(interval)
		end
	end)
end

local function stopFootsteps()
	isWalking = false
	footstepThread = nil
end

-- 移動状態を監視
humanoid.Running:Connect(function(speed)
	if speed > 0.5 then
		startFootsteps()
	else
		stopFootsteps()
	end
end)

-- 死亡時に停止
humanoid.Died:Connect(function()
	stopFootsteps()
end)
