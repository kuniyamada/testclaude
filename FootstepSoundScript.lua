-- FootstepSoundScript（敵の足音・環境音システム）
-- このスクリプトを敵のModel内に入れる（EnemyAIScriptと一緒に）
-- 敵が近づくと足音が大きくなり、遠ざかると小さくなる
-- 追跡中は足音が速くなる

local enemy = script.Parent
local rootPart = enemy:WaitForChild("HumanoidRootPart")
local humanoid = enemy:WaitForChild("Humanoid")
local Players = game:GetService("Players")

-- 設定
local maxHearDistance = 50    -- この距離より遠いと聞こえない
local footstepInterval = 0.6 -- 通常の足音間隔（秒）
local chaseInterval = 0.3    -- 追跡中の足音間隔（秒）
local chaseSpeedThreshold = 12 -- この速度以上なら追跡中と判定

-- 足音サウンドを作成（各プレイヤーに対して鳴らすため敵側に置く）
local footstepSound = Instance.new("Sound")
footstepSound.Name = "Footstep"
footstepSound.SoundId = "rbxassetid://9120386436" -- デフォルトの足音（変更可能）
footstepSound.Volume = 0
footstepSound.RollOffMaxDistance = maxHearDistance
footstepSound.RollOffMinDistance = 5
footstepSound.Parent = rootPart

-- 追跡時の呼吸音・うなり声
local breathSound = Instance.new("Sound")
breathSound.Name = "BreathSound"
breathSound.SoundId = "rbxassetid://9120386436" -- 呼吸音（適切なIDに変更）
breathSound.Volume = 0
breathSound.Looped = true
breathSound.RollOffMaxDistance = 30
breathSound.RollOffMinDistance = 3
breathSound.PlaybackSpeed = 0.7
breathSound.Parent = rootPart

-- 環境音（常時ループ）
local ambientSound = Instance.new("Sound")
ambientSound.Name = "AmbientHum"
ambientSound.SoundId = "rbxassetid://9120386436" -- 不気味な環境音（適切なIDに変更）
ambientSound.Volume = 0.2
ambientSound.Looped = true
ambientSound.RollOffMaxDistance = maxHearDistance
ambientSound.RollOffMinDistance = 10
ambientSound.PlaybackSpeed = 0.5
ambientSound.Parent = rootPart
ambientSound:Play()

-- 心臓の鼓動音をプレイヤーに表示するための関数
local function updateHeartbeatUI(player, intensity)
	local playerGui = player:FindFirstChild("PlayerGui")
	if not playerGui then return end

	local old = playerGui:FindFirstChild("HeartbeatGui")
	if old then old:Destroy() end

	if intensity <= 0 then return end

	local gui = Instance.new("ScreenGui")
	gui.Name = "HeartbeatGui"
	gui.Parent = playerGui

	-- 画面の端を赤くする（ビネットエフェクト）
	local vignette = Instance.new("Frame")
	vignette.Size = UDim2.new(1, 0, 1, 0)
	vignette.BackgroundColor3 = Color3.fromRGB(80, 0, 0)
	vignette.BackgroundTransparency = 1 - (intensity * 0.3)
	vignette.BorderSizePixel = 0
	vignette.Parent = gui

	local gradient = Instance.new("UIGradient")
	gradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0),
		NumberSequenceKeypoint.new(0.3, 1),
		NumberSequenceKeypoint.new(0.7, 1),
		NumberSequenceKeypoint.new(1, 0),
	})
	gradient.Parent = vignette
end

-- 敵が動いているか判定
local lastPosition = rootPart.Position
local function isMoving()
	local currentPos = rootPart.Position
	local moved = (currentPos - lastPosition).Magnitude > 0.5
	lastPosition = currentPos
	return moved
end

-- 追跡中か判定
local function isChasing()
	return humanoid.WalkSpeed >= chaseSpeedThreshold
end

-- 足音ループ
task.spawn(function()
	while true do
		if isMoving() then
			local chasing = isChasing()
			local interval = chasing and chaseInterval or footstepInterval

			footstepSound.PlaybackSpeed = chasing and 1.3 or 1.0
			footstepSound:Play()

			if chasing and not breathSound.Playing then
				breathSound.Volume = 0.4
				breathSound:Play()
			elseif not chasing and breathSound.Playing then
				breathSound:Stop()
			end

			task.wait(interval)
		else
			if breathSound.Playing then
				breathSound:Stop()
			end
			task.wait(0.2)
		end
	end
end)

-- 各プレイヤーとの距離に応じたUI更新
task.spawn(function()
	while true do
		task.wait(0.5)

		for _, player in ipairs(Players:GetPlayers()) do
			if player.Character then
				local hrp = player.Character:FindFirstChild("HumanoidRootPart")
				if hrp then
					local distance = (rootPart.Position - hrp.Position).Magnitude
					local intensity = math.clamp(1 - (distance / maxHearDistance), 0, 1)
					updateHeartbeatUI(player, intensity)
				end
			end
		end
	end
end)
